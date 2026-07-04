import { submitForReview } from "../api/index.js";
import useFirebaseRcGate from "../hooks/useFirebaseRcGate.js";
import FirebaseRcConfirmModal from "./FirebaseRcConfirmModal.jsx";

export default function SubmitForReviewButton({
  appId,
  versionId,
  accountId,
  versionString,
  platform,
  isResubmit = false,
  onSuccess,
  isMobile = false,
}) {
  const gate = useFirebaseRcGate(appId, "submit", versionString);

  async function handleConfirm() {
    gate.setProcessing(true);
    gate.setError(null);
    try {
      await submitForReview(appId, versionId, accountId, platform, versionString);
      gate.closeGate();
      await onSuccess?.();
    } catch (err) {
      gate.setError(err.message);
    } finally {
      gate.setProcessing(false);
    }
  }

  return (
    <>
      <button
        onClick={gate.openGate}
        disabled={gate.loadingPreview}
        className="w-full px-4 py-3 rounded-[10px] text-[13px] font-semibold bg-accent text-white border-none cursor-pointer font-sans hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {gate.loadingPreview
          ? "Loading..."
          : (isResubmit ? "Resubmit for Review" : "Submit for Review")}
      </button>

      {gate.showModal && (
        <FirebaseRcConfirmModal
          configured={gate.configured}
          changes={gate.changes}
          noChanges={gate.noChanges}
          projectId={gate.projectId}
          rules={gate.rules}
          previewUnavailable={gate.previewUnavailable}
          versionString={versionString}
          platform={platform}
          onClose={gate.closeGate}
          onConfirm={handleConfirm}
          processing={gate.processing}
          error={gate.error}
          isMobile={isMobile}
          mode="submit"
          isResubmit={isResubmit}
        />
      )}
    </>
  );
}
