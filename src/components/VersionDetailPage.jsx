import { useState, useEffect, useCallback } from "react";
import { fetchVersionDetail, fetchVersionBuilds, fetchAttachedBuild, attachBuild } from "../api/index.js";
import { RELEASED_STATES, SUBMITTABLE_STATES, RELEASABLE_STATES } from "../constants/index.js";
import Badge from "./Badge.jsx";
import BuildSelector from "./BuildSelector.jsx";
import BuildComplianceModal from "./BuildComplianceModal.jsx";
import VersionReleaseSection from "./VersionReleaseSection.jsx";
import PhasedReleaseSection from "./PhasedReleaseSection.jsx";
import RatingResetSection from "./RatingResetSection.jsx";
import ScreenshotsSection from "./ScreenshotsSection.jsx";
import VersionLocalizationsSection from "./VersionLocalizationsSection.jsx";
import ReleaseVersionButton from "./ReleaseVersionButton.jsx";
import RejectVersionButton from "./RejectVersionButton.jsx";
import SubmitForReviewButton from "./SubmitForReviewButton.jsx";

export default function VersionDetailPage({ app, version, accounts, isMobile }) {
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState(null);

  const [builds, setBuilds] = useState([]);
  const [buildsLoading, setBuildsLoading] = useState(true);
  const [buildsError, setBuildsError] = useState(null);

  const [attachedBuild, setAttachedBuild] = useState(undefined);
  const [attaching, setAttaching] = useState(false);
  const [attachingBuildId, setAttachingBuildId] = useState(null);
  const [attachError, setAttachError] = useState(null);

  const [complianceBuild, setComplianceBuild] = useState(null);

  const refreshDetail = useCallback(async () => {
    try {
      const data = await fetchVersionDetail(app.id, version.id, app.accountId);
      setDetail(data);
    } catch (err) {
      setDetailError(err.message);
    }
  }, [app.id, version.id, app.accountId]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      try {
        setDetailLoading(true);
        setDetailError(null);
        const data = await fetchVersionDetail(app.id, version.id, app.accountId);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) setDetailError(err.message);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    async function loadBuilds() {
      try {
        setBuildsLoading(true);
        setBuildsError(null);
        const data = await fetchVersionBuilds(app.id, app.accountId, version.versionString);
        if (!cancelled) setBuilds(data);
      } catch (err) {
        if (!cancelled) setBuildsError(err.message);
      } finally {
        if (!cancelled) setBuildsLoading(false);
      }
    }

    async function loadAttachedBuild() {
      try {
        const data = await fetchAttachedBuild(app.id, version.id, app.accountId);
        if (!cancelled) setAttachedBuild(data.build);
      } catch {
        if (!cancelled) setAttachedBuild(null);
      }
    }

    loadDetail();
    loadBuilds();
    loadAttachedBuild();

    return () => { cancelled = true; };
  }, [app.id, app.accountId, version.id]);

  async function handleAttachBuild(buildId) {
    setAttaching(true);
    setAttachingBuildId(buildId);
    setAttachError(null);
    try {
      await attachBuild(app.id, version.id, buildId, app.accountId);
      const data = await fetchAttachedBuild(app.id, version.id, app.accountId);
      setAttachedBuild(data.build);
    } catch (err) {
      setAttachError(err.message);
    } finally {
      setAttaching(false);
      setAttachingBuildId(null);
    }
  }

  async function refreshBuilds() {
    try {
      const data = await fetchVersionBuilds(app.id, app.accountId, version.versionString);
      setBuilds(data);
      // Also refresh attached build to get updated compliance state
      const attached = await fetchAttachedBuild(app.id, version.id, app.accountId);
      setAttachedBuild(attached.build);
    } catch { /* ignore */ }
  }

  function handleComplianceSuccess() {
    setComplianceBuild(null);
    refreshBuilds();
  }

  function formatDate(dateString) {
    if (!dateString) return "\u2014";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formatReleaseType(type) {
    switch (type) {
      case "MANUAL": return "Manual";
      case "AFTER_APPROVAL": return "After Approval";
      case "SCHEDULED": return "Scheduled";
      default: return type || "\u2014";
    }
  }

  const v = detail || version;
  const isResubmit = detail && (
    detail.appStoreState === "REJECTED" ||
    detail.appStoreState === "DEVELOPER_REJECTED" ||
    detail.hasUnresolvedSubmission
  );
  const canSubmit = detail && SUBMITTABLE_STATES.has(detail.appStoreState) && attachedBuild;
  const canRelease = detail && RELEASABLE_STATES.has(detail.appStoreState);

  const detailItems = detail ? [
    ["State", <Badge key="badge" status={detail.appStoreState} version={detail.versionString} platform={detail.platform} />],
    ["Platform", <span key="plat" className="text-[11px] font-bold text-accent-light bg-accent-bg px-2 py-0.5 rounded">{detail.platform === "IOS" ? "iOS" : detail.platform === "MAC_OS" ? "macOS" : detail.platform}</span>],
    ["Release Type", <span key="rel" className="text-[13px] text-dark-text">{formatReleaseType(detail.releaseType)}</span>],
    ["Earliest Release Date", <span key="erd" className="text-[13px] text-dark-text">{detail.earliestReleaseDate ? formatDate(detail.earliestReleaseDate) : "\u2014"}</span>],
    ["Downloadable", <span key="dl" className="text-[13px] text-dark-text">{detail.downloadable ? "Yes" : "No"}</span>],
    ["Created", <span key="cd" className="text-[13px] text-dark-text">{formatDate(detail.createdDate)}</span>],
  ] : [];

  return (
    <div style={{ animation: "asc-slidein 0.3s ease backwards" }}>
      {/* Breadcrumb bar */}
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
          <span className="text-sm text-dark-dim font-medium truncate">Version {v.versionString}</span>
        </div>
      </div>

      <div className={isMobile ? "px-3 pt-5 pb-10" : "px-7 pt-6 pb-16 max-w-[960px]"}>
        {/* Page title */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <h1 className="text-2xl font-bold text-dark-text m-0">Version {v.versionString}</h1>
          <Badge status={v.appStoreState} version={v.versionString} platform={v.platform} />
        </div>

        {/* Distribution Details */}
        <div className="mb-8">
          <h2 className="text-[13px] font-bold text-dark-text uppercase tracking-wide mb-3">Distribution Details</h2>
          {detailLoading ? (
            <div className="text-center py-8 text-dark-dim">
              <div className="text-lg inline-block" style={{ animation: "asc-spin 1s linear infinite" }}>{"\u21bb"}</div>
              <div className="text-xs font-semibold mt-1">Loading details...</div>
            </div>
          ) : detailError ? (
            <div className="text-center py-6">
              <div className="text-xs text-danger font-semibold mb-1">Failed to load details</div>
              <div className="text-[11px] text-dark-dim">{detailError}</div>
            </div>
          ) : (
            <div className={`grid gap-2.5 ${isMobile ? "grid-cols-2" : "grid-cols-3"}`}>
              {detailItems.map(([label, val], i) => (
                <div key={i} className="bg-dark-surface rounded-[10px] px-3.5 py-3">
                  <div className="text-[10px] text-dark-dim font-bold uppercase tracking-wide mb-2">{label}</div>
                  {val}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Build Section */}
        <div>
          <h2 className="text-[13px] font-bold text-dark-text uppercase tracking-wide mb-3">Build</h2>
          {attachError && (
            <div className="text-[11px] text-danger font-medium mb-3">{attachError}</div>
          )}
          <BuildSelector
            builds={builds}
            attachedBuild={attachedBuild === undefined ? null : attachedBuild && {
              ...attachedBuild,
              complianceState: attachedBuild.complianceState ?? builds.find((b) => b.id === attachedBuild.id)?.complianceState ?? null,
            }}
            loading={buildsLoading || attachedBuild === undefined}
            attaching={attaching}
            attachingBuildId={attachingBuildId}
            error={buildsError}
            onAttach={handleAttachBuild}
            onManageCompliance={setComplianceBuild}
            isMobile={isMobile}
          />
        </div>

        {/* Release to App Store */}
        {canRelease && (
          <div className="mt-6 flex flex-col gap-2">
            <ReleaseVersionButton
              appId={app.id}
              versionId={version.id}
              accountId={app.accountId}
              versionString={detail.versionString}
              platform={detail.platform}
              onSuccess={refreshDetail}
              isMobile={isMobile}
            />
            <RejectVersionButton
              appId={app.id}
              versionId={version.id}
              accountId={app.accountId}
              versionString={detail.versionString}
              platform={detail.platform}
              onSuccess={refreshDetail}
            />
          </div>
        )}

        {/* Submit / Resubmit for Review */}
        {canSubmit && (
          <div className="mt-6">
            <SubmitForReviewButton
              appId={app.id}
              versionId={version.id}
              accountId={app.accountId}
              versionString={detail.versionString}
              platform={detail.platform}
              isResubmit={isResubmit}
              onSuccess={refreshDetail}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* Screenshots Section */}
        <ScreenshotsSection
          appId={app.id}
          versionId={version.id}
          accountId={app.accountId}
          isMobile={isMobile}
        />

        {/* Localizations Section */}
        <VersionLocalizationsSection
          appId={app.id}
          versionId={version.id}
          accountId={app.accountId}
          isMobile={isMobile}
        />

        {/* Version Settings (only for non-terminal versions) */}
        {detail && !RELEASED_STATES.has(detail.appStoreState) && (
          <div className="mt-8">
            <VersionReleaseSection
              appId={app.id}
              versionId={version.id}
              accountId={app.accountId}
              detail={detail}
              onDetailUpdate={refreshDetail}
              isMobile={isMobile}
            />
            <PhasedReleaseSection
              appId={app.id}
              versionId={version.id}
              accountId={app.accountId}
              detail={detail}
              onDetailUpdate={refreshDetail}
              isMobile={isMobile}
            />
            <RatingResetSection
              appId={app.id}
              versionId={version.id}
              accountId={app.accountId}
              detail={detail}
              onDetailUpdate={refreshDetail}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>

      {complianceBuild && (
        <BuildComplianceModal
          build={complianceBuild}
          appId={app.id}
          accountId={app.accountId}
          onClose={() => setComplianceBuild(null)}
          onSuccess={handleComplianceSuccess}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
