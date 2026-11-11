import { useEffect, useMemo, useState } from "react";
import { fetchAppPurchaseMetrics } from "../api/index.js";
import SalesAnalytics from "./SalesAnalytics.jsx";
import {
  buildMetricsCsv,
  daysBetween,
  formatDateRange,
  GROUP_OPTIONS,
  groupDailyUnits,
  todayIso,
} from "../lib/salesMetrics.js";

const RANGE_OPTIONS = [7, 30];
const MAX_CUSTOM_DAYS = 90;

const selectClass =
  "px-3 py-2 rounded-full text-[12px] font-semibold bg-dark-surface text-dark-text border border-dark-border font-sans cursor-pointer";

export default function PurchaseMetrics({ app, onNotConfigured }) {
  const [days, setDays] = useState(30);
  const [custom, setCustom] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("all");
  const [productId, setProductId] = useState("all");
  const [group, setGroup] = useState("days");
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const customReady = custom && from && to && from <= to && daysBetween(from, to) <= MAX_CUSTOM_DAYS;
  const customInvalid = custom && from && to && !customReady;

  useEffect(() => {
    if (custom && !customReady) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const range = custom ? { from, to } : { days };
    fetchAppPurchaseMetrics(app.id, app.accountId, { ...range, type, productId })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setTypes(result.types ?? []);
        // Keep the product list from the broadest view so it does not shrink when filtering.
        setProducts((prev) => {
          const seen = new Map(prev.map((p) => [p.id, p]));
          for (const p of result.products) seen.set(p.id, p);
          return [...seen.values()].sort((a, b) => a.title.localeCompare(b.title));
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.code === "VENDOR_NUMBER_NOT_CONFIGURED" || err.status === 409) {
          onNotConfigured?.();
          return;
        }
        setError(err.message || "Failed to load metrics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.id, app.accountId, days, custom, from, to, type, productId]);

  const series = useMemo(
    () => groupDailyUnits(data?.daily ?? [], group),
    [data, group],
  );
  const total = data?.totals?.units ?? 0;
  const typeLabel = type === "all" ? "All Purchases" : types.find((o) => o.id === type)?.label ?? "Purchases";

  function handleExport() {
    const productLabel = productId === "all"
      ? "All Products"
      : products.find((p) => p.id === productId)?.title ?? productId;
    const csv = buildMetricsCsv(series, { type: typeLabel, product: productLabel, group });
    // BOM so Excel reads UTF-8 product names correctly.
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `metrics-${app.id}-${data.range.from}_${data.range.to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)} aria-label="Purchase type">
          <option value="all">All Purchases</option>
          {types.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <select className={selectClass} value={productId} onChange={(e) => setProductId(e.target.value)} aria-label="Product">
          <option value="all">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.title === p.id ? p.id : `${p.title} (${p.id})`}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 bg-dark-surface border border-dark-border rounded-lg p-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { setCustom(false); setDays(option); }}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border-none cursor-pointer font-sans ${
                !custom && days === option ? "bg-dark-hover text-dark-text" : "bg-transparent text-dark-dim hover:text-dark-text"
              }`}
            >
              {option}d
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              if (!custom && data?.range?.from) {
                setFrom(data.range.from);
                setTo(data.range.to);
              } else if (!from) {
                setTo(todayIso());
              }
              setCustom(true);
            }}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border-none cursor-pointer font-sans ${
              custom ? "bg-dark-hover text-dark-text" : "bg-transparent text-dark-dim hover:text-dark-text"
            }`}
          >
            Custom
          </button>
        </div>

        {custom && (
          <div className="flex items-center gap-1.5">
            <input type="date" className={selectClass} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
            <span className="text-dark-dim text-[12px]">–</span>
            <input type="date" className={selectClass} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          </div>
        )}

        <button
          type="button"
          onClick={handleExport}
          disabled={loading || !series.length}
          className={`${selectClass} ml-auto disabled:opacity-40 disabled:cursor-default`}
        >
          Export CSV
        </button>
        <select className={selectClass} value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Group by">
          {GROUP_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>

      {customInvalid && (
        <p className="text-[12px] text-danger m-0">
          Pick a valid range of at most {MAX_CUSTOM_DAYS} days.
        </p>
      )}

      <p className="text-[11px] text-dark-dim m-0">
        {data?.range?.from ? `${formatDateRange(data.range.from, data.range.to)} · ` : ""}
        Units from Sales &amp; Trends reports (next-day data, ~8 AM PT)
        {data?.freshness?.latestDate
          ? ` · through ${data.freshness.latestDate}${data.freshness.stale ? " (latest available)" : ""}`
          : ""}
      </p>

      {loading && <p className="text-[13px] text-dark-dim m-0 py-12 text-center">Loading metrics…</p>}
      {!loading && error && <p className="text-[13px] text-danger m-0">{error}</p>}

      {!loading && !error && data && (
        <div className="bg-dark-surface rounded-xl border border-dark-border px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-dim m-0 mb-2">
            {typeLabel}
          </p>
          <p className="text-[32px] font-bold text-dark-text m-0 leading-tight">
            {total.toLocaleString()}
          </p>
          <SalesAnalytics
            daily={series}
            totals={{ units: total }}
            metric="units"
            currency="USD"
            metricLabel={typeLabel}
            chartOnly
          />
          {data.freshness?.missingDates?.length > 0 && (
            <p className="text-[11px] text-dark-phantom m-0 mt-2">
              {data.freshness.missingDates.length} day(s) unavailable in this range.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
