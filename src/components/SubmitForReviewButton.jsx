import { submitForReview, updateVersionRelease } from "../api/index.js";
import useReleaseChecklistGate from "../hooks/useReleaseChecklistGate.js";
import ReleaseChecklistModal from "./ReleaseChecklistModal.jsx";

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
  const gate = useReleaseChecklistGate(appId);

  async function handleConfirm() {
    if (!gate.isComplete()) return;
    gate.setProcessing(true);
    gate.setError(null);
    try {
      if (gate.hasChecklist) {
        await updateVersionRelease(appId, versionId, {
          accountId,
          releaseType: "MANUAL",
          earliestReleaseDate: null,
        });
      }
      await submitForReview(appId, versionId, accountId, platform);
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
        disabled={gate.loadingChecklist}
        className="w-full px-4 py-3 rounded-[10px] text-[13px] font-semibold bg-accent text-white border-none cursor-pointer font-sans hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {gate.loadingChecklist
          ? "Loading..."
          : (isResubmit ? "Resubmit for Review" : "Submit for Review")}
      </button>

      {gate.showModal && (
        <ReleaseChecklistModal
          items={gate.checklistItems}
          versionString={versionString}
          platform={platform}
          checkedIds={gate.checkedIds}
          onToggleItem={gate.toggleItem}
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