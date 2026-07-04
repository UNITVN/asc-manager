import { useState } from "react";
import { fetchFirebaseRcConfig, fetchFirebaseRcPreview } from "../api/index.js";

export default function useFirebaseRcGate(appId, phase, versionString) {
  const [showModal, setShowModal] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [changes, setChanges] = useState([]);
  const [noChanges, setNoChanges] = useState(true);
  const [projectId, setProjectId] = useState(null);
  const [rules, setRules] = useState([]);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);

  function resetModalState() {
    setError(null);
    setConfigured(false);
    setChanges([]);
    setNoChanges(true);
    setProjectId(null);
    setRules([]);
    setPreviewUnavailable(false);
  }

  async function openGate() {
    setLoadingPreview(true);
    resetModalState();
    try {
      const [configResult, previewResult] = await Promise.allSettled([
        fetchFirebaseRcConfig(appId),
        fetchFirebaseRcPreview(appId, phase, versionString),
      ]);

      let configOk = false;

      if (configResult.status === "fulfilled") {
        configOk = true;
        const cfg = configResult.value || {};
        setConfigured(Boolean(cfg.configured));
        setRules(Array.isArray(cfg.parameters) ? cfg.parameters : []);
        setProjectId(cfg.projectId || null);
      }

      if (previewResult.status === "fulfilled") {
        const preview = previewResult.value || {};
        setChanges(preview.changes || []);
        setNoChanges(Boolean(preview.noChanges));
        if (configOk && !configResult.value?.configured) {
          setConfigured(false);
        }
      } else if (configOk && configResult.value?.configured) {
        setPreviewUnavailable(true);
        setChanges([]);
        setNoChanges(true);
      }

      if (!configOk && previewResult.status === "rejected") {
        throw previewResult.reason instanceof Error
          ? previewResult.reason
          : new Error(String(previewResult.reason));
      }

      setShowModal(true);
    } catch (err) {
      setConfigured(false);
      setChanges([]);
      setNoChanges(true);
      setRules([]);
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
    rules,
    previewUnavailable,
    openGate,
    closeGate,
    resetModalState,
  };
}
