import { Router } from "express";
import { getAccounts } from "../lib/account-store.js";
import { ascFetch } from "../lib/asc-client.js";
import { apiCache } from "../lib/cache.js";

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

function resolveAccount(req, res) {
  const accountId = req.query.accountId || req.body?.accountId;
  const accounts = getAccounts();
  const account = accounts.find((a) => a.id === accountId) || accounts[0];
  if (!account) {
    res.status(400).json({ error: "No accounts configured" });
    return null;
  }
  return account;
}

async function fetchAllPages(account, path, maxPages = 20) {
  const allData = [];
  const allIncluded = [];
  let url = path;
  let page = 0;

  while (url) {
    if (page >= maxPages) break;
    const result = await ascFetch(account, url);
    if (result.data) allData.push(...result.data);
    if (result.included) allIncluded.push(...result.included);
    page++;
    url = result.links?.next || null;
    if (url) {
      // ASC returns full URLs for pagination; strip the base
      url = url.replace("https://api.appstoreconnect.apple.com", "");
    }
  }

  return { data: allData, included: allIncluded };
}

// ── IAP Prices ──────────────────────────────────────────────────────────────

// Get current prices for an IAP (fast — only fetches schedule, not all price points)
router.get("/:appId/iap/:iapId/prices", async (req, res) => {
  const { iapId } = req.params;
  const account = resolveAccount(req, res);
  if (!account) return;

  const cacheKey = `iap:prices:${iapId}:${account.id}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const scheduleRes = await ascFetch(
      account,
      `/v1/inAppPurchases/${iapId}/inAppPurchasePriceSchedule?include=manualPrices,baseTerritory`
    ).catch(() => ({ data: null, included: [] }));

    // Extract base territory
    const baseTerritoryData = (scheduleRes.included || []).find(
      (i) => i.type === "territories"
    );
    const baseTerritory = baseTerritoryData?.id || null;

    // Build map of current prices from manual prices in schedule
    const manualPrices = (scheduleRes.included || []).filter(
      (i) => i.type === "inAppPurchasePrices"
    );

    // Collect price point IDs we need to resolve customerPrice for
    const pricePointIds = new Set();
    const currentPrices = {};

    for (const mp of manualPrices) {
      const territoryId = mp.relationships?.territory?.data?.id;
      const pricePointId = mp.relationships?.inAppPurchasePricePoint?.data?.id;
      if (territoryId && pricePointId) {
        currentPrices[territoryId] = { pricePointId, customerPrice: null };
        pricePointIds.add(pricePointId);
      }
    }

    // Resolve customerPrice from included inAppPurchasePricePoints
    for (const inc of scheduleRes.included || []) {
      if (inc.type === "inAppPurchasePricePoints" && pricePointIds.has(inc.id)) {
        for (const entry of Object.values(currentPrices)) {
          if (entry.pricePointId === inc.id) {
            entry.customerPrice = inc.attributes?.customerPrice || null;
          }
        }
      }
    }

    const result = { baseTerritory, currentPrices };

    apiCache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error(`Failed to fetch IAP prices for ${iapId}:`, err.message);
    res.status(502).json({ error: err.message });
  }
});

// Get available price points for a specific territory (lazy-loaded by frontend)
router.get("/:appId/iap/:iapId/price-points", async (req, res) => {
  const { iapId } = req.params;
  const territory = req.query.territory;
  const account = resolveAccount(req, res);
  if (!account) return;

  if (!territory) {
    return res.status(400).json({ error: "territory query parameter is required" });
  }

  const cacheKey = `iap:price-points:${iapId}:${territory}:${account.id}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const ppRes = await fetchAllPages(
      account,
      `/v1/inAppPurchases/${iapId}/pricePoints?filter[territory]=${territory}&include=territory&limit=200`
    );

    const pricePoints = (ppRes.data || []).map((pp) => ({
      id: pp.id,
      customerPrice: pp.attributes?.customerPrice || "0",
      proceeds: pp.attributes?.proceeds || "0",
    })).sort((a, b) => parseFloat(a.customerPrice) - parseFloat(b.customerPrice));

    const result = { pricePoints };
    apiCache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error(`Failed to fetch IAP price points for ${iapId}/${territory}:`, err.message);
    res.status(502).json({ error: err.message });
  }
});

// Equalized price points in every other territory for a base price point
async function sendEqualizations(req, res, equalizationsPath, cachePrefix) {
  const account = resolveAccount(req, res);
  if (!account) return;

  const { pricePointId } = req.params;
  const cacheKey = `${cachePrefix}:${pricePointId}:${account.id}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const eqRes = await fetchAllPages(
      account,
      `${equalizationsPath}?include=territory&limit=200`
    );

    const equalizations = {};
    for (const pp of eqRes.data || []) {
      const territory = pp.relationships?.territory?.data?.id;
      if (!territory) continue;
      equalizations[territory] = {
        id: pp.id,
        customerPrice: pp.attributes?.customerPrice || "0",
        proceeds: pp.attributes?.proceeds || "0",
      };
    }

    const result = { equalizations };
    apiCache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error(`Failed to fetch equalizations for ${pricePointId}:`, err.message);
    res.status(502).json({ error: err.message });
  }
}

router.get("/:appId/iap/:iapId/price-points/:pricePointId/equalizations", (req, res) =>
  sendEqualizations(
    req, res,
    `/v1/inAppPurchasePricePoints/${encodeURIComponent(req.params.pricePointId)}/equalizations`,
    "iap:equalizations"
  )
);

router.get(
  "/:appId/subscription-groups/:groupId/subscriptions/:subId/price-points/:pricePointId/equalizations",
  (req, res) =>
    sendEqualizations(
      req, res,
      `/v1/subscriptionPricePoints/${encodeURIComponent(req.params.pricePointId)}/equalizations`,
      "sub:equalizations"
    )
);

router.post("/:appId/iap/:iapId/prices", async (req, res) => {
  const { iapId } = req.params;
  const { accountId, baseTerritory, manualPrices } = req.body;

  if (!accountId || !baseTerritory || !manualPrices) {
    return res
      .status(400)
      .json({ error: "accountId, baseTerritory, and manualPrices are required" });
  }

  const accounts = getAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return res.status(400).json({ error: "Account not found" });

  try {
    // Build the included array with client-generated IDs
    const included = manualPrices.map((mp, index) => ({
      type: "inAppPurchasePrices",
      id: `price-${mp.territory}-${index}`,
      attributes: {
        startDate: null,
      },
      relationships: {
        inAppPurchaseV2: {
          data: { type: "inAppPurchases", id: iapId },
        },
        inAppPurchasePricePoint: {
          data: {
            type: "inAppPurchasePricePoints",
            id: mp.pricePointId,
          },
        },
      },
    }));

    const body = {
      data: {
        type: "inAppPurchasePriceSchedules",
        relationships: {
          inAppPurchase: {
            data: { type: "inAppPurchases", id: iapId },
          },
          baseTerritory: {
            data: { type: "territories", id: baseTerritory },
          },
          manualPrices: {
            data: included.map((inc) => ({
              type: inc.type,
              id: inc.id,
            })),
          },
        },
      },
      included,
    };

    await ascFetch(account, "/v1/inAppPurchasePriceSchedules", {
      method: "POST",
      body,
    });

    apiCache.deleteByPrefix(`iap:prices:${iapId}:`);
    res.json({ success: true });
  } catch (err) {
    console.error(`Failed to set IAP prices for ${iapId}:`, err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── Subscription Prices ─────────────────────────────────────────────────────

// Get current prices for a subscription (fast — only fetches current prices, not all price points)
router.get(
  "/:appId/subscription-groups/:groupId/subscriptions/:subId/prices",
  async (req, res) => {
    const { subId } = req.params;
    const account = resolveAccount(req, res);
    if (!account) return;

    const cacheKey = `sub:prices:${subId}:${account.id}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const currentPricesRes = await fetchAllPages(
        account,
        `/v1/subscriptions/${subId}/prices?include=subscriptionPricePoint,territory&limit=200`
      );

      // Map current price point IDs to their prices from included
      const pricePointDetailMap = new Map();
      for (const inc of currentPricesRes.included || []) {
        if (inc.type === "subscriptionPricePoints") {
          pricePointDetailMap.set(inc.id, {
            customerPrice: inc.attributes?.customerPrice || "0",
            proceeds: inc.attributes?.proceeds || "0",
          });
        }
      }

      // Build current prices map: territory -> { pricePointId, customerPrice }
      const currentPrices = {};
      for (const price of currentPricesRes.data || []) {
        const territoryId = price.relationships?.territory?.data?.id;
        const pricePointId =
          price.relationships?.subscriptionPricePoint?.data?.id;
        if (territoryId && pricePointId) {
          const detail = pricePointDetailMap.get(pricePointId);
          currentPrices[territoryId] = {
            pricePointId,
            customerPrice: detail?.customerPrice || null,
          };
        }
      }

      const result = { baseTerritory: null, currentPrices };

      apiCache.set(cacheKey, result);
      res.json(result);
    } catch (err) {
      console.error(
        `Failed to fetch subscription prices for ${subId}:`,
        err.message
      );
      res.status(502).json({ error: err.message });
    }
  }
);

// Get available price points for a specific territory (lazy-loaded by frontend)
router.get(
  "/:appId/subscription-groups/:groupId/subscriptions/:subId/price-points",
  async (req, res) => {
    const { subId } = req.params;
    const territory = req.query.territory;
    const account = resolveAccount(req, res);
    if (!account) return;

    if (!territory) {
      return res.status(400).json({ error: "territory query parameter is required" });
    }

    const cacheKey = `sub:price-points:${subId}:${territory}:${account.id}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const ppRes = await fetchAllPages(
        account,
        `/v1/subscriptions/${subId}/pricePoints?filter[territory]=${territory}&include=territory&limit=200`
      );

      const pricePoints = (ppRes.data || []).map((pp) => ({
        id: pp.id,
        customerPrice: pp.attributes?.customerPrice || "0",
        proceeds: pp.attributes?.proceeds || "0",
      })).sort((a, b) => parseFloat(a.customerPrice) - parseFloat(b.customerPrice));

      const result = { pricePoints };
      apiCache.set(cacheKey, result);
      res.json(result);
    } catch (err) {
      console.error(`Failed to fetch subscription price points for ${subId}/${territory}:`, err.message);
      res.status(502).json({ error: err.message });
    }
  }
);

// Read-only diagnostics: which plan types (MONTHLY / UPFRONT) the subscription offers, and where
router.get(
  "/:appId/subscription-groups/:groupId/subscriptions/:subId/plan-availabilities",
  async (req, res) => {
    const { subId } = req.params;
    const account = resolveAccount(req, res);
    if (!account) return;

    try {
      const [subRes, planRes] = await Promise.all([
        ascFetch(account, `/v1/subscriptions/${subId}`),
        fetchAllPages(
          account,
          `/v1/subscriptions/${subId}/planAvailabilities?include=availableTerritories&limit=200`
        ).catch((err) => ({ error: err.message })),
      ]);

      const planAvailabilities = (planRes.data || []).map((p) => ({
        id: p.id,
        planType: p.attributes?.planType,
        availableInNewTerritories: p.attributes?.availableInNewTerritories,
        territories: (p.relationships?.availableTerritories?.data || []).map((t) => t.id),
      }));

      res.json({
        subscriptionPeriod: subRes.data?.attributes?.subscriptionPeriod,
        state: subRes.data?.attributes?.state,
        planAvailabilities,
        planAvailabilitiesError: planRes.error || null,
      });
    } catch (err) {
      console.error(`Failed to fetch plan availabilities for ${subId}:`, err.message);
      res.status(502).json({ error: err.message });
    }
  }
);

// ── Availability (territories a product is sold in) ─────────────────────────

const AVAILABILITY_KINDS = {
  iap: {
    path: (id) => `/v1/inAppPurchases/${id}/inAppPurchaseAvailability`,
    createPath: "/v1/inAppPurchaseAvailabilities",
    type: "inAppPurchaseAvailabilities",
    ownerType: "inAppPurchases",
    ownerRel: "inAppPurchase",
  },
  subscription: {
    path: (id) => `/v1/subscriptions/${id}/subscriptionAvailability`,
    createPath: "/v1/subscriptionAvailabilities",
    type: "subscriptionAvailabilities",
    ownerType: "subscriptions",
    ownerRel: "subscription",
  },
};

// Territories ASC currently accepts (static lists go stale, e.g. ANT, CAF are rejected)
async function fetchValidTerritories(account) {
  const cacheKey = `territories:${account.id}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;
  const res = await fetchAllPages(account, "/v1/territories?limit=200");
  const ids = (res.data || []).map((t) => t.id);
  apiCache.set(cacheKey, ids);
  return ids;
}

async function readAvailability(account, kind, ownerId) {
  const validTerritories = await fetchValidTerritories(account);
  const current = await readRawAvailability(account, kind, ownerId);
  return { ...current, validTerritories };
}

async function readRawAvailability(account, kind, ownerId) {
  try {
    const res = await ascFetch(account, kind.path(ownerId));
    const territoriesRes = await fetchAllPages(
      account,
      `${kind.createPath}/${res.data.id}/availableTerritories?limit=200`
    );
    const territories = (territoriesRes.data || []).map((t) => t.id);
    return {
      exists: true,
      id: res.data?.id,
      availableInNewTerritories: !!res.data?.attributes?.availableInNewTerritories,
      territories,
    };
  } catch (err) {
    if (err.status === 404) {
      return { exists: false, id: null, availableInNewTerritories: false, territories: [] };
    }
    throw err;
  }
}

async function writeAvailability(account, kind, ownerId, territories, availableInNewTerritories) {
  await ascFetch(account, kind.createPath, {
    method: "POST",
    body: {
      data: {
        type: kind.type,
        attributes: { availableInNewTerritories: !!availableInNewTerritories },
        relationships: {
          [kind.ownerRel]: { data: { type: kind.ownerType, id: ownerId } },
          availableTerritories: {
            data: [...new Set(territories)].map((id) => ({ type: "territories", id })),
          },
        },
      },
    },
  });
}

function mountAvailabilityRoutes(prefix, kind, cachePrefix) {
  router.get(`${prefix}/availability`, async (req, res) => {
    const account = resolveAccount(req, res);
    if (!account) return;
    try {
      res.json(await readAvailability(account, kind, req.params.productId));
    } catch (err) {
      console.error(`Failed to fetch availability for ${req.params.productId}:`, err.message);
      res.status(502).json({ error: err.message });
    }
  });

  router.post(`${prefix}/availability`, async (req, res) => {
    const { accountId, territories, availableInNewTerritories } = req.body;
    if (!accountId || !Array.isArray(territories)) {
      return res.status(400).json({ error: "accountId and territories array are required" });
    }
    const account = getAccounts().find((a) => a.id === accountId);
    if (!account) return res.status(400).json({ error: "Account not found" });

    try {
      console.log(`[availability] POST ${kind.type} ${req.params.productId} territories=${territories.length}`);
      await writeAvailability(account, kind, req.params.productId, territories, availableInNewTerritories);
      apiCache.deleteByPrefix(`${cachePrefix}:`);
      res.json(await readAvailability(account, kind, req.params.productId));
    } catch (err) {
      console.error(`Failed to set availability for ${req.params.productId}:`, err.message);
      res.status(502).json({ error: err.message });
    }
  });
}

mountAvailabilityRoutes("/:appId/iap/:productId", AVAILABILITY_KINDS.iap, "iap:prices");
mountAvailabilityRoutes(
  "/:appId/subscription-groups/:groupId/subscriptions/:productId",
  AVAILABILITY_KINDS.subscription,
  "sub:prices"
);

// A subscription without a subscriptionAvailability has no sellable territories, so ASC rejects
// every price with UNSUPPORTED_TERRITORY. Create it for the territories being priced.
async function ensureSubscriptionAvailability(account, subId, territories) {
  const kind = AVAILABILITY_KINDS.subscription;
  const current = await readRawAvailability(account, kind, subId);
  if (current.exists) return;

  console.log(`[pricing] creating subscriptionAvailability sub=${subId} territories=${territories.join(",")}`);
  await writeAvailability(account, kind, subId, territories, false);
}

router.post(
  "/:appId/subscription-groups/:groupId/subscriptions/:subId/prices",
  async (req, res) => {
    const { subId } = req.params;
    const { accountId, prices } = req.body;

    if (!accountId || !prices || !Array.isArray(prices)) {
      return res
        .status(400)
        .json({ error: "accountId and prices array are required" });
    }

    const accounts = getAccounts();
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return res.status(400).json({ error: "Account not found" });

    try {
      await ensureSubscriptionAvailability(
        account,
        subId,
        prices.map((p) => p.territory)
      );
    } catch (err) {
      console.error(`[pricing] availability setup failed for ${subId}:`, err.message);
      return res.status(502).json({ error: `Failed to enable territories: ${err.message}` });
    }

    console.log(`[pricing] POST subscriptionPrices sub=${subId}`, JSON.stringify(prices));

    const results = await Promise.allSettled(
      prices.map((p) =>
        ascFetch(account, "/v1/subscriptionPrices", {
          method: "POST",
          body: {
            data: {
              type: "subscriptionPrices",
              attributes: {
                startDate: null,
                preserveCurrentPrice: false,
              },
              relationships: {
                subscription: {
                  data: { type: "subscriptions", id: subId },
                },
                subscriptionPricePoint: {
                  data: {
                    type: "subscriptionPricePoints",
                    id: p.pricePointId,
                  },
                },
              },
            },
          },
        })
      )
    );

    const errors = [];
    let saved = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        saved++;
      } else {
        console.error(`[pricing] ${prices[i].territory} failed:`, r.reason?.message);
        errors.push({
          territory: prices[i].territory,
          message: r.reason?.message || "Unknown error",
        });
      }
    });

    apiCache.deleteByPrefix(`sub:prices:${subId}:`);
    res.json({ saved, errors });
  }
);

export default router;
