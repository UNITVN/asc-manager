import { useState } from "react";
import { releaseVersion, fetchReleaseChecklist } from "../api/index.js";
import ReleaseChecklistModal from "./ReleaseChecklistModal.jsx";

function isChecklistComplete(items, checkedIds) {
  return items.length === 0 || items.every((item) => checkedIds.has(item.id));
}

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
  const [showModal, setShowModal] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState(null);

  function resetModalState() {
    setChecklistItems([]);
    setCheckedIds(new Set());
    setError(null);
  }

  function toggleChecklistItem(id) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleReleaseClick() {
    setLoadingChecklist(true);
    setError(null);
    resetModalState();
    try {
      const data = await fetchReleaseChecklist(appId);
      setChecklistItems(data.items || []);
      setShowModal(true);
    } catch {
      setChecklistItems([]);
      setShowModal(true);
    } finally {
      setLoadingChecklist(false);
    }
  }

  function handleClose() {
    if (releasing) return;
    setShowModal(false);
    resetModalState();
  }

  async function handleConfirm() {
    if (!isChecklistComplete(checklistItems, checkedIds)) return;
    setReleasing(true);
    setError(null);
    try {
      await releaseVersion(appId, versionId, accountId);
      setShowModal(false);
      resetModalState();
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setReleasing(false);
    }
  }

  return (
    <>
      <div className={className}>
        <button
          onClick={handleReleaseClick}
          disabled={loadingChecklist}
          className="w-full px-4 py-3 rounded-[10px] text-[13px] font-semibold bg-accent text-white border-none cursor-pointer font-sans hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingChecklist ? "Loading..." : "Release This Version"}
        </button>
      </div>

      {showModal && (
        <ReleaseChecklistModal
          items={checklistItems}
          versionString={versionString}
          platform={platform}
          checkedIds={checkedIds}
          onToggleItem={toggleChecklistItem}
          onClose={handleClose}
          onConfirm={handleConfirm}
          releasing={releasing}
          error={error}
          isMobile={isMobile}
        />
      )}
    </>
  );
}
