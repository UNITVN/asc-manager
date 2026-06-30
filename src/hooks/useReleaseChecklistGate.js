import { useState } from "react";
import { fetchReleaseChecklist } from "../api/index.js";

function isChecklistComplete(items, checkedIds) {
  return items.length === 0 || items.every((item) => checkedIds.has(item.id));
}

export default function useReleaseChecklistGate(appId) {
  const [showModal, setShowModal] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const hasChecklist = checklistItems.length > 0;

  function resetModalState() {
    setChecklistItems([]);
    setCheckedIds(new Set());
    setError(null);
  }

  function toggleItem(id) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function openGate() {
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

  function closeGate() {
    if (processing) return;
    setShowModal(false);
    resetModalState();
  }

  return {
    showModal,
    checklistItems,
    checkedIds,
    loadingChecklist,
    processing,
    setProcessing,
    error,
    setError,
    hasChecklist,
    isComplete: () => isChecklistComplete(checklistItems, checkedIds),
    toggleItem,
    openGate,
    closeGate,
    resetModalState,
  };
}