import { describe, it, expect } from "vitest";
import {
  OFFER_MODES,
  OFFER_DURATIONS,
  PLAN_TYPES,
  describeOffer,
  isDraftComplete,
  draftMatchesOffer,
  buildChanges,
} from "../../src/lib/introOffers.js";

const freeOffer = {
  id: "o1",
  territory: "USA",
  offerMode: "FREE_TRIAL",
  duration: "ONE_WEEK",
  numberOfPeriods: 1,
  planType: "UPFRONT",
  pricePointId: null,
  customerPrice: null,
};

const paidOffer = {
  id: "o2",
  territory: "VNM",
  offerMode: "PAY_AS_YOU_GO",
  duration: "ONE_MONTH",
  numberOfPeriods: 3,
  planType: null,
  pricePointId: "pp1",
  customerPrice: "0.99",
};

describe("constants", () => {
  it("lists the three modes, eight durations and two plan types Apple accepts", () => {
    expect(OFFER_MODES.map((m) => m.value)).toEqual(["FREE_TRIAL", "PAY_AS_YOU_GO", "PAY_UP_FRONT"]);
    expect(OFFER_DURATIONS.map((d) => d.value)).toEqual([
      "THREE_DAYS", "ONE_WEEK", "TWO_WEEKS", "ONE_MONTH",
      "TWO_MONTHS", "THREE_MONTHS", "SIX_MONTHS", "ONE_YEAR",
    ]);
    expect(PLAN_TYPES).toEqual(["MONTHLY", "UPFRONT"]);
  });
});

describe("describeOffer", () => {
  it("returns an empty string when there is no offer", () => {
    expect(describeOffer(null, "USD")).toBe("");
  });

  it("describes a free trial", () => {
    expect(describeOffer(freeOffer, "USD")).toBe("Free trial · 1 week");
  });

  it("describes pay as you go with price and periods", () => {
    expect(describeOffer(paidOffer, "VND")).toBe("Pay as you go · VND 0.99 × 3 × 1 month");
  });

  it("describes pay up front with price", () => {
    const offer = { ...paidOffer, offerMode: "PAY_UP_FRONT", numberOfPeriods: 1, customerPrice: "4.99" };
    expect(describeOffer(offer, "USD")).toBe("Pay up front · USD 4.99 · 1 month");
  });

  it("leaves the price out when it is unknown", () => {
    const offer = { ...paidOffer, customerPrice: null };
    expect(describeOffer(offer, "USD")).toBe("Pay as you go · 3 × 1 month");
  });
});

describe("isDraftComplete", () => {
  const free = { offerMode: "FREE_TRIAL", duration: "ONE_WEEK", numberOfPeriods: 1 };

  it("accepts a free trial without a price point", () => {
    expect(isDraftComplete(free)).toBe(true);
  });

  it("rejects a paid mode without a price point", () => {
    expect(isDraftComplete({ ...free, offerMode: "PAY_UP_FRONT" })).toBe(false);
    expect(isDraftComplete({ ...free, offerMode: "PAY_UP_FRONT", pricePointId: "pp1" })).toBe(true);
  });

  it("rejects a missing mode or duration", () => {
    expect(isDraftComplete({ ...free, offerMode: "" })).toBe(false);
    expect(isDraftComplete({ ...free, duration: "" })).toBe(false);
  });

  it("rejects zero, negative and fractional period counts", () => {
    expect(isDraftComplete({ ...free, numberOfPeriods: 0 })).toBe(false);
    expect(isDraftComplete({ ...free, numberOfPeriods: -1 })).toBe(false);
    expect(isDraftComplete({ ...free, numberOfPeriods: 1.5 })).toBe(false);
    expect(isDraftComplete({ ...free, numberOfPeriods: "" })).toBe(false);
  });
});

describe("draftMatchesOffer", () => {
  it("matches an identical free trial and treats null and empty plan type alike", () => {
    const draft = { offerMode: "FREE_TRIAL", duration: "ONE_WEEK", numberOfPeriods: 1, planType: "UPFRONT", pricePointId: "stray" };
    expect(draftMatchesOffer(draft, freeOffer)).toBe(true);
    expect(draftMatchesOffer({ ...draft, planType: "" }, { ...freeOffer, planType: null })).toBe(true);
  });

  it("detects a changed duration, period count or plan type", () => {
    const draft = { offerMode: "FREE_TRIAL", duration: "ONE_WEEK", numberOfPeriods: 1, planType: "UPFRONT" };
    expect(draftMatchesOffer({ ...draft, duration: "ONE_MONTH" }, freeOffer)).toBe(false);
    expect(draftMatchesOffer({ ...draft, numberOfPeriods: 2 }, freeOffer)).toBe(false);
    expect(draftMatchesOffer({ ...draft, planType: "MONTHLY" }, freeOffer)).toBe(false);
  });

  it("compares the price point only for paid modes", () => {
    const draft = { offerMode: "PAY_AS_YOU_GO", duration: "ONE_MONTH", numberOfPeriods: 3, planType: "", pricePointId: "pp1" };
    expect(draftMatchesOffer(draft, paidOffer)).toBe(true);
    expect(draftMatchesOffer({ ...draft, pricePointId: "pp2" }, paidOffer)).toBe(false);
  });

  it("never matches when there is no offer", () => {
    expect(draftMatchesOffer({ offerMode: "FREE_TRIAL", duration: "ONE_WEEK", numberOfPeriods: 1 }, undefined)).toBe(false);
  });
});

describe("buildChanges", () => {
  const offers = new Map([
    ["USA", freeOffer],
    ["VNM", paidOffer],
  ]);

  it("drops a draft identical to the existing offer", () => {
    const drafts = new Map([["USA", { offerMode: "FREE_TRIAL", duration: "ONE_WEEK", numberOfPeriods: 1, planType: "UPFRONT" }]]);
    expect(buildChanges(drafts, offers)).toEqual([]);
  });

  it("carries existingOfferId and the price point when a free trial becomes paid", () => {
    const drafts = new Map([
      ["USA", { offerMode: "PAY_UP_FRONT", duration: "ONE_MONTH", numberOfPeriods: 1, planType: "UPFRONT", pricePointId: "pp9" }],
    ]);
    expect(buildChanges(drafts, offers)).toEqual([
      {
        territory: "USA",
        existingOfferId: "o1",
        previous: { offerMode: "FREE_TRIAL", duration: "ONE_WEEK", numberOfPeriods: 1, planType: "UPFRONT" },
        offerMode: "PAY_UP_FRONT",
        duration: "ONE_MONTH",
        numberOfPeriods: 1,
        planType: "UPFRONT",
        pricePointId: "pp9",
      },
    ]);
  });

  it("creates without existingOfferId where no offer exists and drops a stray price point on a free trial", () => {
    const drafts = new Map([
      ["FRA", { offerMode: "FREE_TRIAL", duration: "THREE_DAYS", numberOfPeriods: 1, planType: "", pricePointId: "stray" }],
    ]);
    const [change] = buildChanges(drafts, offers);
    expect(change).toEqual({
      territory: "FRA",
      offerMode: "FREE_TRIAL",
      duration: "THREE_DAYS",
      numberOfPeriods: 1,
    });
  });

  it("skips incomplete drafts, such as a paid mode with no price point", () => {
    const drafts = new Map([
      ["FRA", { offerMode: "PAY_UP_FRONT", duration: "ONE_MONTH", numberOfPeriods: 1, planType: "" }],
    ]);
    expect(buildChanges(drafts, offers)).toEqual([]);
  });
});
