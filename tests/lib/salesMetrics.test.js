import { describe, it, expect } from "vitest";
import {
  applyAscDisplaySalesAdjustment,
  buildMetricsCsv,
  estimateTotalProceedsUsd,
  groupDailyUnits,
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

describe("groupDailyUnits", () => {
  const daily = [
    { date: "2026-10-03", units: 1 }, // Saturday
    { date: "2026-10-04", units: 2 }, // Sunday starts a new week
    { date: "2026-10-31", units: 4 },
    { date: "2026-11-01", units: 8 },
  ];

  it("returns days unchanged", () => {
    expect(groupDailyUnits(daily, "days")).toEqual(daily);
  });

  it("buckets by Sunday-start week", () => {
    expect(groupDailyUnits(daily, "weeks")).toEqual([
      { date: "2026-09-27", units: 1 },
      { date: "2026-10-04", units: 2 },
      { date: "2026-10-25", units: 4 },
      { date: "2026-11-01", units: 8 },
    ]);
  });

  it("buckets by month", () => {
    expect(groupDailyUnits(daily, "months")).toEqual([
      { date: "2026-10-01", units: 7 },
      { date: "2026-11-01", units: 8 },
    ]);
  });
});

describe("buildMetricsCsv", () => {
  it("writes a header and one row per bucket, repeating the filters", () => {
    const csv = buildMetricsCsv(
      [{ date: "2026-10-01", units: 3 }, { date: "2026-10-02", units: 0 }],
      { type: "All Purchases", product: "Pro, Weekly", group: "days" },
    );
    expect(csv.split("\r\n")).toEqual([
      "Date,Units,Purchase Type,Product,Group By",
      '2026-10-01,3,All Purchases,"Pro, Weekly",days',
      '2026-10-02,0,All Purchases,"Pro, Weekly",days',
    ]);
  });

  it("escapes quotes", () => {
    const csv = buildMetricsCsv([{ date: "d", units: 1 }], { type: "t", product: 'say "hi"', group: "days" });
    expect(csv.split("\r\n")[1]).toBe('d,1,t,"say ""hi""",days');
  });
});
