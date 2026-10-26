import { Router } from "express";
import { getAccounts } from "../lib/account-store.js";
import { ascFetch } from "../lib/asc-client.js";
import { apiCache } from "../lib/cache.js";

const router = Router();

const OFFERS_PATH =
  "/:appId/subscription-groups/:groupId/subscriptions/:subId/introductory-offers";

function cacheKey(subId, accountId) {
  return `sub:intro-offers:${subId}:${accountId}`;
}

async function fetchAllPages(account, path, maxPages = 20) {
  const data = [];
  const included = [];
  let url = path;
  for (let page = 0; url && page < maxPages; page++) {
    const result = await ascFetch(account, url);
    if (result.data) data.push(...result.data);
    if (result.included) included.push(...result.included);
    url = result.links?.next?.replace("https://api.appstoreconnect.apple.com", "") || null;
  }
  return { data, included };
}

function toOffer(raw, pricePoints) {
  const pricePointId = raw.relationships?.subscriptionPricePoint?.data?.id || null;
  return {
    id: raw.id,
    territory: raw.relationships?.territory?.data?.id || null,
    offerMode: raw.attributes?.offerMode,
    duration: raw.attributes?.duration,
    numberOfPeriods: raw.attributes?.numberOfPeriods,
    planType: raw.attributes?.targetSubscriptionPlanType || null,
    pricePointId,
    customerPrice: pricePointId ? pricePoints.get(pricePointId) ?? null : null,
    startDate: raw.attributes?.startDate || null,
    endDate: raw.attributes?.endDate || null,
  };
}

router.get(OFFERS_PATH, async (req, res) => {
  const { subId } = req.params;
  const accountId = req.query.accountId;
  const accounts = getAccounts();
  const account = accounts.find((a) => a.id === accountId) || accounts[0];
  if (!account) return res.status(400).json({ error: "No accounts configured" });

  const key = cacheKey(subId, account.id);
  const cached = apiCache.get(key);
  if (cached) return res.json(cached);

  try {
    const { data, included } = await fetchAllPages(
      account,
      `/v1/subscriptions/${subId}/introductoryOffers?include=territory,subscriptionPricePoint&limit=200`
    );

    const pricePoints = new Map();
    for (const inc of included) {
      if (inc.type === "subscriptionPricePoints") {
        pricePoints.set(inc.id, inc.attributes?.customerPrice ?? null);
      }
    }

    const result = { offers: data.map((raw) => toOffer(raw, pricePoints)) };
    apiCache.set(key, result);
    res.json(result);
  } catch (err) {
    console.error(`Failed to fetch introductory offers for ${subId}:`, err.message);
    res.status(502).json({ error: err.message });
  }
});

function createBody(subId, change) {
  const relationships = {
    subscription: { data: { type: "subscriptions", id: subId } },
    territory: { data: { type: "territories", id: change.territory } },
  };
  if (change.pricePointId) {
    relationships.subscriptionPricePoint = {
      data: { type: "subscriptionPricePoints", id: change.pricePointId },
    };
  }

  const attributes = {
    offerMode: change.offerMode,
    duration: change.duration,
    numberOfPeriods: change.numberOfPeriods,
  };
  if (change.planType) attributes.targetSubscriptionPlanType = change.planType;

  return { data: { type: "subscriptionIntroductoryOffers", attributes, relationships } };
}

async function createOffer(account, subId, change) {
  await ascFetch(account, "/v1/subscriptionIntroductoryOffers", {
    method: "POST",
    body: createBody(subId, change),
  });
}

// Apple only lets an existing offer's endDate change, so an edit is delete + create.
// If the create is rejected the old offer is already gone, so put `previous` back.
async function applyChange(account, subId, change) {
  if (change.existingOfferId) {
    await ascFetch(
      account,
      `/v1/subscriptionIntroductoryOffers/${encodeURIComponent(change.existingOfferId)}`,
      { method: "DELETE" }
    );
  }
  try {
    await createOffer(account, subId, change);
  } catch (err) {
    if (!change.existingOfferId || !change.previous) throw err;
    try {
      await createOffer(account, subId, { territory: change.territory, ...change.previous });
    } catch (restoreErr) {
      throw new Error(
        `Existing offer was deleted and could not be restored (${restoreErr.message}). New offer rejected: ${err.message}`
      );
    }
    throw new Error(`${err.message} (existing offer was restored)`);
  }
  return true;
}

router.post(OFFERS_PATH, async (req, res) => {
  const { subId } = req.params;
  const { accountId, changes } = req.body;

  if (!accountId || !Array.isArray(changes)) {
    return res.status(400).json({ error: "accountId and changes array are required" });
  }
  const account = getAccounts().find((a) => a.id === accountId);
  if (!account) return res.status(400).json({ error: "Account not found" });

  const results = await Promise.allSettled(
    changes.map((change) => applyChange(account, subId, change))
  );

  const errors = [];
  let saved = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      if (r.value) saved++;
    } else {
      console.error(`[intro-offers] ${changes[i].territory} failed:`, r.reason?.message);
      errors.push({
        territory: changes[i].territory,
        message: r.reason?.message || "Unknown error",
      });
    }
  });

  apiCache.delete(cacheKey(subId, account.id));
  res.json({ saved, errors });
});

export default router;
