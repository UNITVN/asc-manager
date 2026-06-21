import { describe, it, expect } from "vitest";
import {
  applyAscDisplaySalesAdjustment,
  estimateTotalProceedsUsd,
  primaryCurrency,
  sortProceedsByCurrency,
  unknownProceedsCurrencies,
  usdEquivalent,
} from "../../src/lib/salesMetrics.js";

describe("primaryCurrency", () => {
  it("defaults to USD when proceeds are empty", () => {
    expect(primaryCurrency([])).toBe("USD");
    expect(primaryCurrency(undefined)).toBe("USD");
  });

  it("prefers USD over VND even when VND raw amount is larger", () => {
    const proceeds = [
      { currency: "VND", amount: 5_000_000 },
      { currency: "USD", amount: 120 },
    ];
    expect(primaryCurrency(proceeds)).toBe("USD");
  });

  it("prefers USD over EUR when both are present", () => {
    const proceeds = [
      { currency: "EUR", amount: 900 },
      { currency: "USD", amount: 50 },
    ];
    expect(primaryCurrency(proceeds)).toBe("USD");
  });

  it("picks highest USD-equivalent currency when USD is absent", () => {
    const proceeds = [
      { currency: "VND", amount: 100_000 },
      { currency: "EUR", amount: 500 },
    ];
    expect(primaryCurrency(proceeds)).toBe("EUR");
  });

  it("returns the only currency for single-currency proceeds", () => {
    expect(primaryCurrency([{ currency: "VND", amount: 2_500_000 }])).toBe("VND");
  });
});

describe("sortProceedsByCurrency", () => {
  it("orders by USD-equivalent value descending", () => {
    const proceeds = [
      { currency: "VND", amount: 1_000_000 },
      { currency: "USD", amount: 500 },
      { currency: "EUR", amount: 40 },
    ];
    expect(sortProceedsByCurrency(proceeds).map((entry) => entry.currency)).toEqual([
      "USD",
      "EUR",
      "VND",
    ]);
  });
});

describe("usdEquivalent", () => {
  it("converts VND using static FX map", () => {
    expect(usdEquivalent(25000, "VND")).toBeCloseTo(1, 5);
  });

  it("returns 0 for unknown currencies instead of treating face value as USD", () => {
    expect(usdEquivalent(14625.88, "KZT")).toBeCloseTo(30.47, 1);
    expect(usdEquivalent(999, "XXX")).toBe(0);
  });
});

describe("unknownProceedsCurrencies", () => {
  it("lists currencies missing from the FX map", () => {
    expect(
      unknownProceedsCurrencies([
        { currency: "USD", amount: 10 },
        { currency: "XXX", amount: 5 },
      ]),
    ).toEqual(["XXX"]);
  });
});

describe("estimateTotalProceedsUsd", () => {
  it("sums proceeds across currencies in USD equivalent", () => {
    const proceeds = [
      { currency: "USD", amount: 100 },
      { currency: "VND", amount: 25000 },
    ];
    expect(estimateTotalProceedsUsd(proceeds)).toBe(101);
  });

  it("returns 0 for empty proceeds", () => {
    expect(estimateTotalProceedsUsd([])).toBe(0);
  });
});

describe("applyAscDisplaySalesAdjustment", () => {
  it("reduces USD totals by 5.5% for display", () => {
    expect(applyAscDisplaySalesAdjustment(1000)).toBe(945);
  });
});
