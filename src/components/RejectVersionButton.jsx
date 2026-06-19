import { useState } from "react";
import { rejectVersion } from "../api/index.js";

function formatPlatform(platform) {
  if (platform === "IOS") return "iOS";
  if (platform === "MAC_OS") return "macOS";
  return platform;
}

export default function RejectVersionButton({
  appId,
  versionId,
  accountId,
  versionString,
  platform,
  onSuccess,
  className = "",
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState(null);

  async function handleReject() {
    setRejecting(true);
    setError(null);
    try {
      await rejectVersion(appId, versionId, accountId);
      setShowConfirm(false);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setRejecting(false);
    }
  }

  const platformLabel = formatPlatform(platform);

  if (showConfirm) {
    return (
      <div className={`border border-danger/30 bg-danger/5 rounded-[10px] px-4 py-3 ${className}`}>
        <div className="text-[13px] text-dark-text font-medium mb-1">
          Reject {platformLabel} version {versionString}?
        </div>
        <div className="text-[11px] text-dark-dim mb-3">
          This will remove the approved version from the release queue. The version will move to Developer Rejected and can be edited and resubmitted for review.
        </div>
        {error && (
          <div className="text-[11px] text-danger font-medium mb-3">{error}</div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReject}
            disabled={rejecting}
            className="px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-danger text-white border-none cursor-pointer font-sans hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rejecting ? "Rejecting..." : "Confirm Reject"}
          </button>
          <button
            onClick={() => { setShowConfirm(false); setError(null); }}
            disabled={rejecting}
            className="px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-transparent text-dark-dim border border-dark-border cursor-pointer font-sans hover:bg-dark-surface transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full px-4 py-3 rounded-[10px] text-[13px] font-semibold bg-transparent text-danger border border-danger/30 cursor-pointer font-sans hover:bg-danger/10 transition-colors"
      >
        Reject This Version
      </button>
    </div>
  );
}