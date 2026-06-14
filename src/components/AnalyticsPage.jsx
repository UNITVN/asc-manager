import { useEffect, useState } from "react";
import { fetchAppSales, setVendorNumber } from "../api/index.js";
import AppIcon from "./AppIcon.jsx";
import AnalyticsSidebar from "./AnalyticsSidebar.jsx";
import SalesAnalytics from "./SalesAnalytics.jsx";
import {
  estimateTotalProceedsUsd,
  formatCurrency,
  formatDateRange,
  METRIC_OPTIONS,
  sortProceedsByCurrency,
} from "../lib/salesMetrics.js";

const RANGE_OPTIONS = [7, 30, 90];
const SECTION_METRIC = { sales: "proceeds", downloads: "downloads" };

export default function AnalyticsPage({ app, isAdmin, isMobile }) {
  const [section, setSection] = useState("sales");
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [vendorInput, setVendorInput] = useState("");
  const [savingVendor, setSavingVendor] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotConfigured(false);

    fetchAppSales(app.id, app.accountId, { days })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.code === "VENDOR_NUMBER_NOT_CONFIGURED" || err.status === 409) {
          setNotConfigured(true);
          setData(null);
          return;
        }
        setError(err.message || "Failed to load sales data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [app.id, app.accountId, days]);

  async function handleSaveVendor() {
    if (!vendorInput.trim()) return;
    setSavingVendor(true);
    setError(null);
    try {
      await setVendorNumber(app.accountId, vendorInput.trim());
      setNotConfigured(false);
      setLoading(true);
      const result = await fetchAppSales(app.id, app.accountId, { days });
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to save vendor number");
    } finally {
      setSavingVendor(false);
      setLoading(false);
    }
  }

  const metric = SECTION_METRIC[section];
  const proceedsByCurrency = sortProceedsByCurrency(data?.totals?.proceedsByCurrency ?? []);
  const estimatedProceedsUsd = estimateTotalProceedsUsd(proceedsByCurrency);
  const singleCurrencyProceeds = proceedsByCurrency.length === 1 ? proceedsByCurrency[0] : null;
  const chartMetric = metric === "proceeds"
    ? (singleCurrencyProceeds ? "proceeds" : "proceedsEstimatedUsd")
    : metric;
  const chartCurrency = metric === "proceeds"
    ? (singleCurrencyProceeds?.currency ?? "USD")
    : "USD";
  const metricLabel = METRIC_OPTIONS.find((m) => m.id === metric)?.label || "Sales";
  const dateRangeLabel = formatDateRange(data?.range?.from, data?.range?.to);
  const sectionLabel = section === "sales" ? "Sales" : "Downloads";

  return (
    <div style={{ animation: "asc-slidein 0.3s ease backwards" }} className="min-h-screen flex flex-col">
      <div className={`sticky top-0 z-10 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border ${isMobile ? "px-3 py-3" : "px-7 py-3"}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-accent text-sm font-medium bg-transparent border-none cursor-pointer font-sans px-0"
          >
            <span className="text-lg leading-none">{"\u2039"}</span>
            {app.name}
          </button>
          <span className="text-dark-phantom text-sm">/</span>
          <span className="text-sm text-dark-dim font-medium">Analytics</span>
        </div>
      </div>

      <div className={`flex-1 flex ${isMobile ? "flex-col px-3 pt-4 pb-10" : "px-7 pt-5 pb-16"}`}>
        <AnalyticsSidebar active={section} onSelect={setSection} isMobile={isMobile} />

        <div className={`flex-1 min-w-0 ${isMobile ? "" : "pl-8"}`}>
          {!isMobile && (
            <div className="flex items-center gap-3 mb-5">
              <AppIcon app={app} size={36} />
              <div className="min-w-0">
                <h1 className="text-[15px] font-semibold text-dark-text m-0 leading-tight">{app.name}</h1>
                <p className="text-[11px] text-dark-dim m-0 mt-0.5">Sales &amp; Trends</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-[28px] font-bold text-dark-text m-0 tracking-tight">{sectionLabel}</h2>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold bg-accent text-white border-none cursor-default font-sans"
              >
                <span className="text-[11px] opacity-80">‹</span>
                {dateRangeLabel}
              </button>
              <div className="flex items-center gap-1 bg-dark-surface border border-dark-border rounded-lg p-1">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDays(option)}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border-none cursor-pointer font-sans ${
                      days === option
                        ? "bg-dark-hover text-dark-text"
                        : "bg-transparent text-dark-dim hover:text-dark-text"
                    }`}
                  >
                    {option}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-dark-dim mb-5 mt-1">
            Sales &amp; Trends · next-day data (~8 AM PT)
            {data?.freshness?.latestDate
              ? ` · through ${data.freshness.latestDate}${data.freshness.stale ? " (latest available)" : ""}`
              : ""}
          </p>

          {loading && (
            <p className="text-[13px] text-dark-dim m-0 py-12 text-center">Loading analytics…</p>
          )}

          {!loading && notConfigured && (
            <div className="bg-dark-surface rounded-xl border border-dark-border px-5 py-5 space-y-3 max-w-lg">
              <p className="text-[13px] text-dark-dim m-0">
                Analytics require a vendor number for this ASC account.
                {isAdmin
                  ? " Add it below to enable Sales & Trends reporting."
                  : " Ask an admin to configure the vendor number in Admin (/admin)."}
              </p>
              {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="flex-1 px-3 py-2.5 bg-dark-card border border-dark-border-light rounded-lg text-dark-text outline-none font-mono text-[13px]"
                    placeholder="e.g. 81234567"
                    value={vendorInput}
                    onChange={(e) => setVendorInput(e.target.value)}
                  />
                  <button
                    disabled={!vendorInput.trim() || savingVendor}
                    onClick={handleSaveVendor}
                    className="px-4 py-2.5 rounded-lg text-[12px] font-semibold bg-accent text-white border-none cursor-pointer font-sans disabled:opacity-40"
                  >
                    {savingVendor ? "Saving…" : "Save vendor number"}
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && error && (
            <p className="text-[13px] text-danger m-0">{error}</p>
          )}

          {!loading && !notConfigured && !error && data && (
            <div className="space-y-4">
              {metric === "proceeds" && proceedsByCurrency.length > 0 && (
                <div className="bg-dark-surface rounded-xl border border-dark-border px-5 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-dim m-0 mb-2">
                    Total proceeds
                  </p>
                  <p className="text-[32px] font-bold text-dark-text m-0 leading-tight">
                    {singleCurrencyProceeds
                      ? formatCurrency(singleCurrencyProceeds.amount, singleCurrencyProceeds.currency)
                      : formatCurrency(estimatedProceedsUsd, "USD")}
                  </p>
                  {proceedsByCurrency.length > 1 && (
                    <p className="text-[11px] text-dark-phantom m-0 mt-2">
                      Estimated USD total (approx. FX rates)
                    </p>
                  )}
                </div>
              )}

              {metric === "proceeds" && proceedsByCurrency.length === 0 && (
                <p className="text-[13px] text-dark-dim m-0 py-8 text-center">
                  No proceeds for this period.
                </p>
              )}

              {metric === "downloads" && (
                <div className="bg-dark-surface rounded-xl border border-dark-border px-5 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-dim m-0 mb-2">
                    Total downloads
                  </p>
                  <p className="text-[32px] font-bold text-dark-text m-0 leading-tight">
                    {(data.totals.downloads ?? 0).toLocaleString()}
                  </p>
                </div>
              )}

              {(metric === "proceeds" && proceedsByCurrency.length > 0) || metric === "downloads" ? (
                <SalesAnalytics
                  daily={data.daily}
                  totals={data.totals}
                  metric={chartMetric}
                  currency={chartCurrency}
                  metricLabel={metricLabel}
                  chartOnly
                />
              ) : null}

              {data.freshness?.missingDates?.length > 0 && (
                <p className="text-[11px] text-dark-phantom m-0">
                  {data.freshness.missingDates.length} day(s) unavailable in this range.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
