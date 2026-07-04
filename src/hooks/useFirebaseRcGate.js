import { useState } from "react";
import { fetchFirebaseRcPreview } from "../api/index.js";

export default function useFirebaseRcGate(appId, phase, versionString) {
  const [showModal, setShowModal] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [changes, setChanges] = useState([]);
  const [noChanges, setNoChanges] = useState(true);
  const [projectId, setProjectId] = useState(null);

  function resetModalState() {
    setError(null);
    setConfigured(false);
    setChanges([]);
    setNoChanges(true);
    setProjectId(null);
  }

  async function openGate() {
    setLoadingPreview(true);
    resetModalState();
    try {
      const data = await fetchFirebaseRcPreview(appId, phase, versionString);
      setConfigured(Boolean(data.configured));
      setChanges(data.changes || []);
      setNoChanges(Boolean(data.noChanges));
      setProjectId(data.projectId || null);
      setShowModal(true);
    } catch (err) {
      setConfigured(false);
      setChanges([]);
      setNoChanges(true);
      setError(err.message);
      setShowModal(true);
    } finally {
      setLoadingPreview(false);
    }
  }

  function closeGate() {
    if (processing) return;
    setShowModal(false);
    resetModalState();
  }

  return {
    showModal,
    loadingPreview,
    processing,
    setProcessing,
    error,
    setError,
    configured,
    changes,
    noChanges,
    projectId,
    openGate,
    closeGate,
    resetModalState,
  };
}
