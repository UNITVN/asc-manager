import { useState, useEffect, useRef } from "react";
import {
  fetchSubscriptionReviewScreenshot,
  uploadSubscriptionReviewScreenshot,
  deleteSubscriptionReviewScreenshot,
} from "../api/index.js";

function previewUrl(imageAsset, width = 200) {
  if (!imageAsset?.templateUrl) return null;
  const height = Math.round(width * 2.16);
  return imageAsset.templateUrl
    .replace("{w}", String(width))
    .replace("{h}", String(height))
    .replace("{f}", "png");
}

export default function ReviewScreenshotPanel({ productId, groupId, appId, accountId }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef(null);

  // Lazy-load on first expand
  useEffect(() => {
    if (!expanded || loaded) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSubscriptionReviewScreenshot(appId, groupId, productId, accountId)
      .then((res) => { if (!cancelled) { setScreenshot(res.screenshot); setLoaded(true); } })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [expanded, loaded, appId, groupId, productId, accountId]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await uploadSubscriptionReviewScreenshot(appId, groupId, productId, accountId, file);
      setScreenshot(res.screenshot);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setConfirmDelete(false);
    setBusy(true);
    setError(null);
    try {
      await deleteSubscriptionReviewScreenshot(appId, groupId, productId, accountId);
      setScreenshot(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const url = previewUrl(screenshot?.imageAsset);

  return (
    <div className="border-t border-dark-border pt-4 mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer px-0 font-sans mb-3"
      >
        <span
          className="text-dark-dim text-xs transition-transform"
          style={{ display: "inline-block", transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          {"▾"}
        </span>
        <span className="text-[12px] font-bold text-dark-text uppercase tracking-wide">
          Review Screenshot
        </span>
        {loaded && (
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
            screenshot ? "text-dark-dim bg-dark-surface" : "text-white bg-danger"
          }`}>
            {screenshot ? "1" : "missing"}
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-3">
          {loading && (
            <div className="text-center py-3 text-dark-dim">
              <div className="text-sm inline-block" style={{ animation: "asc-spin 1s linear infinite" }}>{"↻"}</div>
            </div>
          )}

          {error && <div className="text-[11px] text-danger font-semibold">{error}</div>}

          {!loading && loaded && (
            <>
              <div className="text-[11px] text-dark-dim">
                Screenshot of the paywall for App Review. Required before the subscription can be submitted.
              </div>

              {screenshot && (
                <div className="flex items-start gap-3 bg-dark-surface rounded-lg px-3 py-2.5">
                  {url ? (
                    <img src={url} alt={screenshot.fileName} className="w-[90px] rounded border border-dark-border" />
                  ) : (
                    <div className="w-[90px] h-[120px] rounded border border-dark-border flex items-center justify-center text-[10px] text-dark-dim text-center px-1">
                      {screenshot.assetDeliveryState?.state || "Processing"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-[12px]">
                    <div className="text-dark-text font-semibold truncate">{screenshot.fileName}</div>
                    <div className="text-dark-dim mt-0.5">
                      {screenshot.assetDeliveryState?.state || ""}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFile} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-accent text-white border-none cursor-pointer font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? "Working..." : screenshot ? "Replace" : "Upload"}
                </button>
                {screenshot && (
                  <button
                    onClick={handleDelete}
                    disabled={busy}
                    className={`text-[11px] font-semibold bg-transparent border-none cursor-pointer font-sans px-0 ${
                      confirmDelete ? "text-danger" : "text-dark-dim hover:text-danger"
                    }`}
                  >
                    {confirmDelete ? "Confirm?" : "Delete"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
