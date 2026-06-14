export const METRIC_OPTIONS = [
  { id: "proceeds", label: "Proceeds" },
  { id: "downloads", label: "Downloads" },
  { id: "updates", label: "Updates" },
  { id: "redownloads", label: "Re-downloads" },
];

/** Approximate units of each currency per 1 USD — for ranking only, not billing. */
export const FX_UNITS_PER_USD = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.55,
  CAD: 1.36,
  CHF: 0.88,
  JPY: 150,
  CNY: 7.2,
  KRW: 1350,
  INR: 83,
  BRL: 5.0,
  MXN: 17,
  VND: 25000,
  THB: 36,
  IDR: 16000,
  PHP: 56,
  TWD: 32,
  HKD: 7.8,
  SGD: 1.35,
  NZD: 1.65,
  SEK: 10.5,
  NOK: 10.8,
  DKK: 6.9,
  PLN: 4.0,
  CZK: 23,
  HUF: 360,
  ILS: 3.7,
  AED: 3.67,
  SAR: 3.75,
  ZAR: 18,
  TRY: 32,
  RUB: 92,
  CLP: 950,
  COP: 4000,
  PEN: 3.7,
  EGP: 48,
  NGN: 1500,
  KES: 130,
  PKR: 280,
  BGN: 1.8,
  RON: 4.6,
  MYR: 4.7,
};

const CHART_CURRENCY_PRIORITY = ["USD", "EUR", "GBP"];

export function usdEquivalent(amount, currency) {
  const rate = FX_UNITS_PER_USD[currency];
  if (!rate || rate <= 0) return amount;
  return amount / rate;
}

export function sortProceedsByCurrency(proceedsByCurrency) {
  if (!proceedsByCurrency?.length) return [];
  return [...proceedsByCurrency].sort((a, b) => {
    const usdDiff = usdEquivalent(b.amount, b.currency) - usdEquivalent(a.amount, a.currency);
    if (usdDiff !== 0) return usdDiff;
    return a.currency.localeCompare(b.currency);
  });
}

/** Sum all proceeds converted to USD using static FX rates — estimate only, not billing. */
export function estimateTotalProceedsUsd(proceedsByCurrency) {
  if (!proceedsByCurrency?.length) return 0;
  const total = proceedsByCurrency.reduce(
    (sum, entry) => sum + usdEquivalent(entry.amount, entry.currency),
    0,
  );
  return Math.round(total * 100) / 100;
}

export function estimateDayProceedsUsd(day) {
  if (!day?.proceedsByCurrency?.length) return 0;
  const total = day.proceedsByCurrency.reduce(
    (sum, entry) => sum + usdEquivalent(entry.amount, entry.currency),
    0,
  );
  return Math.round(total * 100) / 100;
}

/** Default currency for the proceeds chart — USD when present, else highest USD-equivalent total. */
export function primaryCurrency(proceedsByCurrency) {
  if (!proceedsByCurrency?.length) return "USD";

  const currencies = proceedsByCurrency.map((entry) => entry.currency);
  for (const preferred of CHART_CURRENCY_PRIORITY) {
    if (currencies.includes(preferred)) return preferred;
  }

  return sortProceedsByCurrency(proceedsByCurrency)[0].currency;
}

export function proceedsForCurrency(proceedsByCurrency, currency) {
  const entry = proceedsByCurrency?.find((p) => p.currency === currency);
  return entry?.amount ?? 0;
}

export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  }).format(amount);
}

export function formatCompactCurrency(amount, currency = "USD") {
  if (amount >= 1000) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return formatCurrency(amount, currency);
}

export function formatShortDate(isoDate) {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatAxisDate(isoDate) {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDateRange(from, to) {
  if (!from || !to) return "—";
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endFmt = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startFmt}–${endFmt}`;
}

export function metricValue(day, metric, currency) {
  if (metric === "proceedsEstimatedUsd") {
    return estimateDayProceedsUsd(day);
  }
  if (metric === "proceeds") {
    return proceedsForCurrency(day.proceedsByCurrency, currency);
  }
  return day[metric] ?? 0;
}

export function totalMetricValue(totals, daily, metric, currency) {
  if (metric === "proceedsEstimatedUsd") {
    return estimateTotalProceedsUsd(totals.proceedsByCurrency);
  }
  if (metric === "proceeds") {
    return proceedsForCurrency(totals.proceedsByCurrency, currency);
  }
  return daily.reduce((sum, day) => sum + (day[metric] ?? 0), 0);
}

export function formatMetricValue(value, metric, currency) {
  if (metric === "proceeds" || metric === "proceedsEstimatedUsd") {
    return formatCompactCurrency(value, metric === "proceedsEstimatedUsd" ? "USD" : currency);
  }
  return value.toLocaleString();
}

export function formatMetricCell(value, metric, currency) {
  if (metric === "proceeds" || metric === "proceedsEstimatedUsd") {
    return formatCurrency(value, metric === "proceedsEstimatedUsd" ? "USD" : currency);
  }
  return value.toLocaleString();
}

/** Compact labels for chart axes — avoids clipping large currency/count values. */
export function formatAxisMetricValue(value, metric, currency) {
  const rounded = Math.round(value);
  const proceedsCurrency = metric === "proceedsEstimatedUsd" ? "USD" : currency;

  if (metric === "proceeds" || metric === "proceedsEstimatedUsd") {
    if (rounded >= 1000) {
      return formatCompactCurrency(rounded, proceedsCurrency);
    }
    return formatCurrency(rounded, proceedsCurrency).replace(/\.00$/, "");
  }

  if (rounded >= 10_000) {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(rounded);
  }

  return rounded.toLocaleString();
}

export function computeChartNiceMax(max, metric) {
  if (max <= 0) return 1;

  const roughStep = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;

  let niceStep;
  if (normalized <= 1) niceStep = magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  if (metric !== "proceeds" && metric !== "proceedsEstimatedUsd" && niceStep < 1) {
    niceStep = 1;
  }

  return Math.ceil(max / niceStep) * niceStep;
}

/** Estimate SVG left padding from the widest y-axis label. */
export function estimateChartLeftPad(labels, minPad = 44) {
  const maxLen = labels.reduce((longest, label) => Math.max(longest, label.length), 0);
  return Math.max(minPad, Math.ceil(maxLen * 6.5) + 10);
}
