import { createPortal } from "react-dom";

function formatPlatform(platform) {
  if (platform === "IOS") return "iOS";
  if (platform === "MAC_OS") return "macOS";
  return platform;
}

const COPY = {
  release: {
    titleNoItems: "Release Version",
    titleWithItems: "Release Checklist",
    bodyWithItems: "Complete all items before releasing. Progress is not saved.",
    bodyNoItems: (platformLabel, versionString) =>
      `Release ${platformLabel} version ${versionString} to the App Store?`,
    bodyNoItemsDetail:
      "This will publish the approved version. It may take up to 24 hours to appear on the App Store.",
    confirm: "Confirm Release",
    processing: "Releasing...",
  },
  submit: {
    titleNoItems: "Submit for Review",
    titleWithItems: "Release Checklist",
    bodyWithItems: "Complete all items before submitting. Progress is not saved.",
    bodyNoItems: (platformLabel, versionString) =>
      `Submit ${platformLabel} version ${versionString} for App Review?`,
    bodyNoItemsDetail:
      "This will move the version to \"Waiting for Review\". This action cannot be undone.",
    confirm: "Confirm Submit",
    processing: "Submitting...",
  },
};

export default function ReleaseChecklistModal({
  items,
  versionString,
  platform,
  checkedIds,
  onToggleItem,
  onClose,
  onConfirm,
  processing = false,
  error = null,
  isMobile,
  mode = "release",
  isResubmit = false,
}) {
  const hasChecklist = items.length > 0;
  const completedCount = items.filter((item) => checkedIds.has(item.id)).length;
  const allComplete = !hasChecklist || completedCount === items.length;
  const platformLabel = formatPlatform(platform);
  const copy = COPY[mode] || COPY.release;

  const confirmLabel = processing
    ? (isResubmit && mode === "submit" ? "Resubmitting..." : copy.processing)
    : (isResubmit && mode === "submit" ? "Confirm Resubmit" : copy.confirm);

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
            : "rounded-2xl max-w-[520px] max-h-[85vh]"
        }`}
      >
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between sticky top-0 bg-dark-card z-[1]">
          <div>
            <div className="text-[15px] font-bold text-dark-text">
              {hasChecklist ? copy.titleWithItems : copy.titleNoItems}
            </div>
            <div className="text-[11px] text-dark-dim mt-0.5">
              {hasChecklist
                ? `Version ${versionString} · ${completedCount} of ${items.length} completed`
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
          {hasChecklist ? (
            <>
              <p className="text-[12px] text-dark-dim mb-4 leading-relaxed">
                {copy.bodyWithItems}
              </p>
              <div className="space-y-2.5">
                {items.map((item) => {
                  const checked = checkedIds.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 cursor-pointer rounded-[10px] px-4 py-3 transition-colors ${
                        checked ? "bg-accent/10 border border-accent/20" : "bg-dark-surface hover:bg-dark-hover"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleItem(item.id)}
                        disabled={processing}
                        className="w-4 h-4 accent-accent mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] font-medium ${checked ? "text-dark-dim line-through" : "text-dark-text"}`}>
                          {item.label}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-dark-dim mt-1 leading-relaxed">{item.description}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
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
              disabled={processing || !allComplete}
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