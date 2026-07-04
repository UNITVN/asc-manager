import { releaseVersion } from "../api/index.js";
import useFirebaseRcGate from "../hooks/useFirebaseRcGate.js";
import FirebaseRcConfirmModal from "./FirebaseRcConfirmModal.jsx";

export default function ReleaseVersionButton({
  appId,
  versionId,
  accountId,
  versionString,
  platform,
  onSuccess,
  isMobile = false,
  className = "",
}) {
  const gate = useFirebaseRcGate(appId, "release", versionString);

  async function handleConfirm() {
    gate.setProcessing(true);
    gate.setError(null);
    try {
      await releaseVersion(appId, versionId, accountId, versionString);
      gate.closeGate();
      onSuccess?.();
    } catch (err) {
      gate.setError(err.message);
    } finally {
      gate.setProcessing(false);
    }
  }

  return (
    <>
      <div className={className}>
        <button
          onClick={gate.openGate}
          disabled={gate.loadingPreview}
          className="w-full px-4 py-3 rounded-[10px] text-[13px] font-semibold bg-accent text-white border-none cursor-pointer font-sans hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {gate.loadingPreview ? "Loading..." : "Release This Version"}
        </button>
      </div>

      {gate.showModal && (
        <FirebaseRcConfirmModal
          configured={gate.configured}
          changes={gate.changes}
          noChanges={gate.noChanges}
          projectId={gate.projectId}
          versionString={versionString}
          platform={platform}
          onClose={gate.closeGate}
          onConfirm={handleConfirm}
          processing={gate.processing}
          error={gate.error}
          isMobile={isMobile}
          mode="release"
        />
      )}
    </>
  );
}
