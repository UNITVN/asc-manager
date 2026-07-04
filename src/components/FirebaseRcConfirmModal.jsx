import { createPortal } from "react-dom";

function formatPlatform(platform) {
  if (platform === "IOS") return "iOS";
  if (platform === "MAC_OS") return "macOS";
  return platform;
}

function formatTarget(target) {
  return target === "default" ? "Default" : target;
}

function formatValueType(valueType) {
  const v = String(valueType || "STRING").toUpperCase();
  if (v === "STRING") return "String";
  if (v === "NUMBER") return "Number";
  if (v === "BOOLEAN") return "Boolean";
  if (v === "JSON") return "JSON";
  return v;
}

function resolvePlaceholder(value, versionString) {
  if (value == null) return "";
  const raw = String(value);
  if (!raw.includes("{{versionString}}")) return raw;
  return raw.replaceAll("{{versionString}}", versionString || "");
}

const COPY = {
  release: {
    title: "Release Version",
    titleRc: "Remote Config Preview",
    bodyNoItems: (platformLabel, versionString) =>
      `Release ${platformLabel} version ${versionString} to the App Store?`,
    bodyNoItemsDetail:
      "This will publish the approved version. It may take up to 24 hours to appear on the App Store.",
    rcWarning: "Remote Config will be updated before releasing this version.",
    confirm: "Confirm Release",
    processing: "Releasing...",
    rulesHeading: "Configured Rules",
    rulesSubheading: "These parameter values will be applied on confirm.",
    valueHeading: "Release Value",
    previewHeading: "Live Preview",
    previewUnavailable:
      "Live preview unavailable — rules will still apply on confirm.",
    noRulesDetail:
      "Remote Config is configured but no parameter rules are defined for this app.",
  },
  submit: {
    title: "Submit for Review",
    titleRc: "Remote Config Preview",
    bodyNoItems: (platformLabel, versionString) =>
      `Submit ${platformLabel} version ${versionString} for App Review?`,
    bodyNoItemsDetail:
      'This will move the version to "Waiting for Review". This action cannot be undone.',
    rcWarning: "Remote Config will be updated before submitting for review.",
    confirm: "Confirm Submit",
    processing: "Submitting...",
    rulesHeading: "Configured Rules",
    rulesSubheading: "These parameter values will be applied on confirm.",
    valueHeading: "Submit Value",
    previewHeading: "Live Preview",
    previewUnavailable:
      "Live preview unavailable — rules will still apply on confirm.",
    noRulesDetail:
      "Remote Config is configured but no parameter rules are defined for this app.",
  },
};

export default function FirebaseRcConfirmModal({
  configured,
  changes,
  noChanges,
  projectId,
  versionString,
  platform,
  rules = [],
  previewUnavailable = false,
  onClose,
  onConfirm,
  processing = false,
  error = null,
  isMobile,
  mode = "release",
  isResubmit = false,
}) {
  const hasRcChanges = configured && changes.length > 0;
  const hasRules = configured && rules.length > 0;
  const platformLabel = formatPlatform(platform);
  const copy = COPY[mode] || COPY.release;
  const activeValueKey = mode === "submit" ? "submitValue" : "releaseValue";

  const confirmLabel = processing
    ? (isResubmit && mode === "submit" ? "Resubmitting..." : copy.processing)
    : (isResubmit && mode === "submit" ? "Confirm Resubmit" : copy.confirm);

  const title = configured ? copy.titleRc : copy.title;

  function renderRules() {
    if (!hasRules) {
      return (
        <p className="text-[12px] text-dark-dim leading-relaxed">
          {copy.noRulesDetail}
        </p>
      );
    }
    return (
      <div className="overflow-x-auto rounded-[10px] border border-dark-border">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-dark-surface text-dark-dim text-left">
              <th className="px-3 py-2 font-semibold">Parameter</th>
              <th className="px-3 py-2 font-semibold">Target</th>
              <th className="px-3 py-2 font-semibold">Type</th>
              <th className="px-3 py-2 font-semibold">{copy.valueHeading}</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              const rawValue = rule[activeValueKey] ?? "";
              const resolved = resolvePlaceholder(rawValue, versionString);
              const hasPlaceholder =
                rawValue.includes("{{versionString}}") && versionString;
              return (
                <tr
                  key={`${rule.key}-${rule.target}`}
                  className="border-t border-dark-border"
                >
                  <td className="px-3 py-2 text-dark-text font-medium align-top">
                    {rule.key}
                    {rule.description ? (
                      <div className="text-[10px] text-dark-dim font-normal mt-0.5 leading-snug">
                        {rule.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-dark-dim align-top">
                    {formatTarget(rule.target)}
                  </td>
                  <td className="px-3 py-2 text-dark-dim align-top">
                    {formatValueType(rule.valueType)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="text-accent font-mono text-[11px] break-all">
                      {resolved || "—"}
                    </div>
                    {hasPlaceholder ? (
                      <div className="text-[10px] text-dark-dim mt-0.5">
                        ({rawValue})
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderLivePreview() {
    if (previewUnavailable) {
      return (
        <div className="rounded-[10px] border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-400/90 leading-relaxed">
          {copy.previewUnavailable}
        </div>
      );
    }
    if (!hasRcChanges) {
      return (
        <p className="text-[12px] text-dark-dim leading-relaxed">
          Remote Config is configured but no parameter changes are needed for this action.
        </p>
      );
    }
    return (
      <div className="overflow-x-auto rounded-[10px] border border-dark-border">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-dark-surface text-dark-dim text-left">
              <th className="px-3 py-2 font-semibold">Parameter</th>
              <th className="px-3 py-2 font-semibold">Target</th>
              <th className="px-3 py-2 font-semibold">Current</th>
              <th className="px-3 py-2 font-semibold">New</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <tr key={`${change.key}-${change.target}`} className="border-t border-dark-border">
                <td className="px-3 py-2 text-dark-text font-medium">{change.key}</td>
                <td className="px-3 py-2 text-dark-dim">{formatTarget(change.target)}</td>
                <td className="px-3 py-2 text-dark-dim font-mono text-[11px]">
                  {change.currentValue ?? "—"}
                </td>
                <td className="px-3 py-2 text-accent font-mono text-[11px]">
                  {change.resolvedValue ?? change.newValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return createPortal(
    <div
      onClick={processing ? undefined : onClose}
      className={`fixed inset-0 bg-black/40 backdrop-blur-[8px] flex justify-center z-[100] ${isMobile ? "items-end" : "items-center"}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "asc-fadein 0.3s ease" }}
        className={`bg-dark-card border border-dark-border-light w-full overflow-y-auto shadow-[0_32px_64px_rgba(0,0,0,0.15)] ${
          isMobile
            ? "rounded-t-2xl max-w-full max-h-[90vh]"
            : "rounded-2xl max-w-[560px] max-h-[85vh]"
        }`}
      >
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between sticky top-0 bg-dark-card z-[1]">
          <div>
            <div className="text-[15px] font-bold text-dark-text">{title}</div>
            <div className="text-[11px] text-dark-dim mt-0.5">
              {configured
                ? `${platformLabel} v${versionString}${projectId ? ` · ${projectId}` : ""}`
                : `${platformLabel} version ${versionString}`}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="w-7 h-7 rounded-full bg-dark-surface flex items-center justify-center cursor-pointer border-none hover:bg-dark-hover transition-colors disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86868b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={isMobile ? "px-4 py-4" : "px-6 py-5"}>
          {configured ? (
            <>
              <p className="text-[12px] text-amber-400/90 mb-4 leading-relaxed font-medium">
                {copy.rcWarning}
              </p>

              <div className="mb-4">
                <div className="text-[12px] font-semibold text-dark-text mb-1">
                  {copy.rulesHeading}
                </div>
                <div className="text-[11px] text-dark-dim mb-2">
                  {copy.rulesSubheading}
                </div>
                {renderRules()}
              </div>

              <div className="mb-2">
                <div className="text-[12px] font-semibold text-dark-text mb-1">
                  {copy.previewHeading}
                </div>
                {renderLivePreview()}
              </div>
            </>
          ) : (
            <>
              <div className="text-[13px] text-dark-text font-medium mb-2">
                {copy.bodyNoItems(platformLabel, versionString)}
              </div>
              <p className="text-[12px] text-dark-dim leading-relaxed">
                {copy.bodyNoItemsDetail}
              </p>
            </>
          )}

          {error && (
            <div className="text-[11px] text-danger font-medium mt-4">{error}</div>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold text-dark-dim bg-dark-surface border border-dark-border cursor-pointer hover:bg-dark-hover transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={processing}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-accent text-white border-none cursor-pointer hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
