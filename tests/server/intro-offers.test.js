import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../../server/lib/account-store.js", () => ({
  getAccounts: vi.fn(() => [{ id: "acc-1", name: "Test Account" }]),
}));

vi.mock("../../server/lib/asc-client.js", () => ({
  ascFetch: vi.fn(),
}));

vi.mock("../../server/lib/cache.js", () => {
  const store = new Map();
  return {
    apiCache: {
      get: vi.fn((key) => store.get(key)),
      set: vi.fn((key, val) => store.set(key, val)),
      delete: vi.fn((key) => store.delete(key)),
      deleteByPrefix: vi.fn((prefix) => {
        for (const key of store.keys()) {
          if (key.startsWith(prefix)) store.delete(key);
        }
      }),
      _store: store,
    },
  };
});

import introOffersRouter from "../../server/routes/intro-offers.js";
import { ascFetch } from "../../server/lib/asc-client.js";
import { apiCache } from "../../server/lib/cache.js";

const BASE = "/api/apps/app-1/subscription-groups/grp-1/subscriptions/sub-1/introductory-offers";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/apps", introOffersRouter);
  return app;
}

const ASC_OFFER = {
  id: "o1",
  attributes: {
    offerMode: "PAY_AS_YOU_GO",
    duration: "ONE_MONTH",
    numberOfPeriods: 3,
    targetSubscriptionPlanType: "UPFRONT",
    startDate: "2026-05-19",
    endDate: null,
  },
  relationships: {
    territory: { data: { id: "USA" } },
    subscriptionPricePoint: { data: { id: "pp1" } },
  },
};

describe("introductory offers routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiCache._store.clear();
  });

  describe("GET", () => {
    it("maps ASC data and serves the second call from cache", async () => {
      ascFetch.mockResolvedValue({
        data: [ASC_OFFER],
        included: [
          { type: "subscriptionPricePoints", id: "pp1", attributes: { customerPrice: "0.99" } },
        ],
      });
      const app = createApp();

      const res = await request(app).get(`${BASE}?accountId=acc-1`);
      expect(res.status).toBe(200);
      expect(res.body.offers[0]).toEqual({
        id: "o1",
        territory: "USA",
        offerMode: "PAY_AS_YOU_GO",
        duration: "ONE_MONTH",
        numberOfPeriods: 3,
        planType: "UPFRONT",
        pricePointId: "pp1",
        customerPrice: "0.99",
        startDate: "2026-05-19",
        endDate: null,
      });

      await request(app).get(`${BASE}?accountId=acc-1`);
      expect(ascFetch).toHaveBeenCalledTimes(1);
    });

    it("asks ASC to include territory and price point, or the relationships come back empty", async () => {
      ascFetch.mockResolvedValue({ data: [] });
      await request(createApp()).get(`${BASE}?accountId=acc-1`);

      const url = new URL(ascFetch.mock.calls[0][1], "https://api.appstoreconnect.apple.com");
      expect(url.pathname).toBe("/v1/subscriptions/sub-1/introductoryOffers");
      expect(url.searchParams.get("include").split(",").sort()).toEqual(["subscriptionPricePoint", "territory"]);
    });

    it("returns an empty list when the subscription has no offers", async () => {
      ascFetch.mockResolvedValue({ data: [] });
      const res = await request(createApp()).get(`${BASE}?accountId=acc-1`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ offers: [] });
    });

    it("returns null planType, pricePointId and customerPrice for a free trial", async () => {
      ascFetch.mockResolvedValue({
        data: [
          {
            id: "o2",
            attributes: { offerMode: "FREE_TRIAL", duration: "ONE_WEEK", numberOfPeriods: 1, endDate: null },
            relationships: {
              territory: { data: { id: "ARE" } },
              subscriptionPricePoint: { data: null },
            },
          },
        ],
      });
      const res = await request(createApp()).get(`${BASE}?accountId=acc-1`);
      expect(res.body.offers[0]).toMatchObject({
        territory: "ARE",
        planType: null,
        pricePointId: null,
        customerPrice: null,
      });
    });
  });

  describe("POST", () => {
    const paid = {
      territory: "USA",
      offerMode: "PAY_UP_FRONT",
      duration: "ONE_MONTH",
      numberOfPeriods: 1,
      planType: "UPFRONT",
      pricePointId: "pp9",
    };

    it("deletes the existing offer first, then creates the new one and clears the cache", async () => {
      ascFetch.mockResolvedValue(null);
      apiCache._store.set("sub:intro-offers:sub-1:acc-1", { offers: [] });

      const res = await request(createApp())
        .post(BASE)
        .send({ accountId: "acc-1", changes: [{ ...paid, existingOfferId: "old/1=" }] });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ saved: 1, errors: [] });

      expect(ascFetch.mock.calls[0][1]).toBe("/v1/subscriptionIntroductoryOffers/old%2F1%3D");
      expect(ascFetch.mock.calls[0][2]).toEqual({ method: "DELETE" });

      const [, path, opts] = ascFetch.mock.calls[1];
      expect(path).toBe("/v1/subscriptionIntroductoryOffers");
      expect(opts.method).toBe("POST");
      expect(opts.body.data.type).toBe("subscriptionIntroductoryOffers");
      expect(opts.body.data.attributes).toEqual({
        offerMode: "PAY_UP_FRONT",
        duration: "ONE_MONTH",
        numberOfPeriods: 1,
        targetSubscriptionPlanType: "UPFRONT",
      });
      expect(opts.body.data.relationships.subscription.data).toEqual({ type: "subscriptions", id: "sub-1" });
      expect(opts.body.data.relationships.territory.data).toEqual({ type: "territories", id: "USA" });
      expect(opts.body.data.relationships.subscriptionPricePoint.data).toEqual({
        type: "subscriptionPricePoints",
        id: "pp9",
      });

      expect(apiCache._store.has("sub:intro-offers:sub-1:acc-1")).toBe(false);
    });

    it("omits the price point and plan type when not given", async () => {
      ascFetch.mockResolvedValue(null);
      await request(createApp())
        .post(BASE)
        .send({
          accountId: "acc-1",
          changes: [{ territory: "USA", offerMode: "FREE_TRIAL", duration: "ONE_WEEK", numberOfPeriods: 1 }],
        });

      const opts = ascFetch.mock.calls[0][2];
      expect(opts.body.data.relationships.subscriptionPricePoint).toBeUndefined();
      expect(opts.body.data.attributes.targetSubscriptionPlanType).toBeUndefined();
    });

    it("skips the create when the delete fails", async () => {
      ascFetch.mockRejectedValueOnce(new Error("boom"));
      const res = await request(createApp())
        .post(BASE)
        .send({ accountId: "acc-1", changes: [{ ...paid, existingOfferId: "o1" }] });

      expect(ascFetch).toHaveBeenCalledTimes(1);
      expect(res.body).toEqual({ saved: 0, errors: [{ territory: "USA", message: "boom" }] });
    });

    const previous = {
      offerMode: "FREE_TRIAL",
      duration: "ONE_WEEK",
      numberOfPeriods: 1,
      planType: "UPFRONT",
    };

    it("restores the previous offer when the replacement is rejected", async () => {
      ascFetch
        .mockResolvedValueOnce(null) // DELETE
        .mockRejectedValueOnce(new Error("invalid periods")) // POST new
        .mockResolvedValueOnce(null); // POST previous
      const res = await request(createApp())
        .post(BASE)
        .send({ accountId: "acc-1", changes: [{ ...paid, existingOfferId: "o1", previous }] });

      expect(ascFetch).toHaveBeenCalledTimes(3);
      const restore = ascFetch.mock.calls[2][2].body.data;
      expect(restore.attributes).toEqual({
        offerMode: "FREE_TRIAL",
        duration: "ONE_WEEK",
        numberOfPeriods: 1,
        targetSubscriptionPlanType: "UPFRONT",
      });
      expect(restore.relationships.territory.data.id).toBe("USA");
      expect(res.body.saved).toBe(0);
      expect(res.body.errors).toEqual([
        { territory: "USA", message: "invalid periods (existing offer was restored)" },
      ]);
    });

    it("says the old offer is gone when the restore fails too", async () => {
      ascFetch
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error("invalid periods"))
        .mockRejectedValueOnce(new Error("still down"));
      const res = await request(createApp())
        .post(BASE)
        .send({ accountId: "acc-1", changes: [{ ...paid, existingOfferId: "o1", previous }] });

      expect(res.body.errors).toEqual([
        {
          territory: "USA",
          message: "Existing offer was deleted and could not be restored (still down). New offer rejected: invalid periods",
        },
      ]);
    });

    it("reports a failed create without blocking the other territories", async () => {
      ascFetch.mockImplementation(async (_acc, _path, opts) => {
        if (opts.body.data.relationships.territory.data.id === "USA") throw new Error("nope");
        return null;
      });
      const res = await request(createApp())
        .post(BASE)
        .send({ accountId: "acc-1", changes: [paid, { ...paid, territory: "VNM" }] });

      expect(res.body.saved).toBe(1);
      expect(res.body.errors).toEqual([{ territory: "USA", message: "nope" }]);
    });

    it("rejects a request without a changes array", async () => {
      const res = await request(createApp()).post(BASE).send({ accountId: "acc-1" });
      expect(res.status).toBe(400);
    });

    it("rejects an unknown account", async () => {
      const res = await request(createApp()).post(BASE).send({ accountId: "nope", changes: [] });
      expect(res.status).toBe(400);
    });
  });
});
