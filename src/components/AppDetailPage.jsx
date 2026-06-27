import { useState, useEffect, useCallback } from "react";
import { fetchAppLookup, fetchVersions } from "../api/index.js";
import { RELEASABLE_STATES } from "../constants/index.js";
import AppIcon from "./AppIcon.jsx";
import Badge from "./Badge.jsx";
import AppReviewSection from "./AppReviewSection.jsx";
import VersionHistory from "./VersionHistory.jsx";
import ReleaseVersionButton from "./ReleaseVersionButton.jsx";
import RejectVersionButton from "./RejectVersionButton.jsx";

function StarRating({ rating }) {
  const stars = [];
  const rounded = Math.round(rating * 2) / 2;
  for (let i = 1; i <= 5; i++) {
    if (i <= rounded) stars.push("\u2605");
    else if (i - 0.5 === rounded) stars.push("\u00bd");
    else stars.push("\u2606");
  }
  return <span className="text-warning tracking-wider">{stars.join("")}</span>;
}

export default function AppDetailPage({ app, accounts, isMobile, onSelectVersion, onViewProducts, onViewXcodeCloud, onViewAnalytics, onViewChangelog, onViewReviewDetail, onAppRefresh }) {
  const [lookupData, setLookupData] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [pendingVersions, setPendingVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const acct = accounts.find((a) => a.name === app.account);

  const loadPendingVersions = useCallback(async () => {
    try {
      setVersionsLoading(true);
      const versions = await fetchVersions(app.id, app.accountId);
      setPendingVersions(versions.filter((v) => RELEASABLE_STATES.has(v.appStoreState)));
    } catch {
      setPendingVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, [app.id, app.accountId]);

  useEffect(() => {
    let cancelled = false;
    fetchAppLookup(app.bundleId)
      .then((data) => { if (!cancelled) setLookupData(data); })
      .catch(() => { if (!cancelled) setLookupData({ found: false }); })
      .finally(() => { if (!cancelled) setLookupLoading(false); });
    return () => { cancelled = true; };
  }, [app.bundleId]);

  useEffect(() => {
    loadPendingVersions();
  }, [loadPendingVersions]);

  async function handleReleaseSuccess() {
    await loadPendingVersions();
    onAppRefresh?.();
  }

  const metadataItems = [
    ["Status", <Badge key="badge" status={app.status} version={app.version} platform={app.platform} />],
    ["Version", <span key="ver" className="font-mono text-[13px] text-dark-text">{app.version}</span>],
    ["Platform", <span key="plat" className="text-[11px] font-bold text-accent-light bg-accent-bg px-2 py-0.5 rounded">{app.platform === "IOS" ? "iOS" : app.platform === "MAC_OS" ? "macOS" : app.platform}</span>],
    ["Account", (
      <span key="acct" className="flex items-center gap-1.5 text-[13px] text-dark-text">
        {acct && <span className="w-[7px] h-[7px] rounded-full" style={{ background: acct.color }} />}
        {app.account}
      </span>
    )],
    ["App ID", <span key="appid" className="font-mono text-[13px] text-dark-text break-all">{app.id}</span>],
    ["Bundle ID", <span key="bid" className="font-mono text-[13px] text-dark-text break-all">{app.bundleId}</span>],
  ];

  return (
    <div style={{ animation: "asc-slidein 0.3s ease backwards" }}>
      {/* Back navigation bar */}
      <div className={`sticky top-0 z-10 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border ${isMobile ? "px-3 py-3" : "px-7 py-3"}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-accent text-sm font-medium bg-transparent border-none cursor-pointer font-sans px-0"
          >
            <span className="text-lg leading-none">{"\u2039"}</span>
            Apps
          </button>
          <span className="text-dark-phantom text-sm">/</span>
          <span className="text-sm text-dark-dim font-medium truncate">{app.name}</span>
        </div>
      </div>

      <div className={isMobile ? "px-3 pt-5 pb-10" : "px-7 pt-6 pb-16 max-w-[960px]"}>
        {/* Hero section */}
        <div className={`flex gap-5 mb-8 ${isMobile ? "flex-col items-start" : "items-start"}`}>
          <AppIcon app={app} size={isMobile ? 80 : 120} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-dark-text m-0 leading-tight">{app.name}</h1>
            <div className="text-[13px] text-dark-dim font-mono mt-1">{app.bundleId}</div>
            <div className={`flex gap-2 mt-4 ${isMobile ? "flex-col" : ""}`}>
              {onViewProducts && (
                <button
                  onClick={onViewProducts}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold bg-dark-surface text-dark-label border border-dark-border-light cursor-pointer font-sans"
                >
                  Manage Products
                </button>
              )}
              {onViewXcodeCloud && (
                <button
                  onClick={onViewXcodeCloud}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold bg-dark-surface text-dark-label border border-dark-border-light cursor-pointer font-sans"
                >
                  Xcode Cloud
                </button>
              )}
              {onViewAnalytics && (
                <button
                  onClick={onViewAnalytics}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold bg-dark-surface text-dark-label border border-dark-border-light cursor-pointer font-sans"
                >
                  Analytics
                </button>
              )}
              {onViewChangelog && (
                <button
                  onClick={onViewChangelog}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold bg-dark-surface text-dark-label border border-dark-border-light cursor-pointer font-sans"
                >
                  Changelog
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pending Release banner */}
        {!versionsLoading && pendingVersions.length > 0 && (
          <div className="mb-8">
            {pendingVersions.map((v) => (
              <div
                key={v.id}
                className="border border-accent/30 bg-accent/5 rounded-[10px] px-4 py-4 mb-3 last:mb-0"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Badge status={v.appStoreState} version={v.versionString} platform={v.platform} />
                </div>
                <p className="text-[12px] text-dark-dim m-0 mb-3">
                  This version has been approved and is waiting for you to release it to the App Store.
                </p>
                <div className="flex flex-col gap-2">
                  <ReleaseVersionButton
                    appId={app.id}
                    versionId={v.id}
                    accountId={app.accountId}
                    versionString={v.versionString}
                    platform={v.platform}
                    onSuccess={handleReleaseSuccess}
                  />
                  <RejectVersionButton
                    appId={app.id}
                    versionId={v.id}
                    accountId={app.accountId}
                    versionString={v.versionString}
                    platform={v.platform}
                    onSuccess={handleReleaseSuccess}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Metadata grid */}
        <div className={`grid gap-2.5 mb-8 ${isMobile ? "grid-cols-2" : "grid-cols-3"}`}>
          {metadataItems.map(([label, val], i) => (
            <div key={i} className="bg-dark-surface rounded-[10px] px-3.5 py-3">
              <div className="text-[10px] text-dark-dim font-bold uppercase tracking-wide mb-2">{label}</div>
              {val}
            </div>
          ))}
        </div>

        {/* App Store Info */}
        {!lookupLoading && lookupData?.found && (
          <div className="mb-8">
            <h2 className="text-[13px] font-bold text-dark-text uppercase tracking-wide mb-3">App Store Info</h2>
            <div className="bg-dark-surface rounded-[10px] px-4 py-4 space-y-4">
              {/* Rating row */}
              {lookupData.averageUserRating != null && (
                <div className="flex items-center gap-3 flex-wrap">
                  <StarRating rating={lookupData.averageUserRating} />
                  <span className="text-[13px] font-semibold text-dark-text">
                    {lookupData.averageUserRating.toFixed(1)}
                  </span>
                  <span className="text-[12px] text-dark-dim">
                    ({lookupData.userRatingCount.toLocaleString()} ratings)
                  </span>
                </div>
              )}

              {/* Info pills */}
              <div className="flex flex-wrap gap-2">
                {lookupData.primaryGenreName && (
                  <span className="text-[11px] font-semibold text-dark-label bg-dark-hover px-2.5 py-1 rounded-md">
                    {lookupData.primaryGenreName}
                  </span>
                )}
                {lookupData.sellerName && (
                  <span className="text-[11px] text-dark-dim bg-dark-hover px-2.5 py-1 rounded-md">
                    {lookupData.sellerName}
                  </span>
                )}
                {lookupData.formattedPrice && (
                  <span className="text-[11px] font-semibold text-success bg-dark-hover px-2.5 py-1 rounded-md">
                    {lookupData.formattedPrice}
                  </span>
                )}
              </div>

              {/* Description */}
              {lookupData.description && (
                <div>
                  <p className={`text-[13px] text-dark-dim leading-relaxed m-0 ${descExpanded ? "" : "line-clamp-3"}`}>
                    {lookupData.description}
                  </p>
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="text-[12px] text-accent font-medium bg-transparent border-none cursor-pointer font-sans px-0 mt-1"
                  >
                    {descExpanded ? "Show less" : "Show more"}
                  </button>
                </div>
              )}

              {/* App Store link */}
              {lookupData.trackViewUrl && (
                <a
                  href={lookupData.trackViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] text-accent font-medium no-underline"
                >
                  View on App Store {"\u2197"}
                </a>
              )}
            </div>
          </div>
        )}

        {/* App Review */}
        <AppReviewSection appId={app.id} accountId={app.accountId} onViewDetail={onViewReviewDetail} />

        {/* Version History */}
        <div>
          <h2 className="text-[13px] font-bold text-dark-text uppercase tracking-wide mb-3">Version History</h2>
          <VersionHistory appId={app.id} accountId={app.accountId} onSelectVersion={onSelectVersion} />
        </div>
      </div>
    </div>
  );
}
