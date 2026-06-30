import { useState, useEffect } from "react";
import { updateVersionRelease, fetchReleaseChecklist } from "../api/index.js";
import { RELEASE_TYPES } from "../constants/index.js";

export default function VersionReleaseSection({ appId, versionId, accountId, detail, onDetailUpdate, isMobile }) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [checklistConfigured, setChecklistConfigured] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(true);

  const currentType = detail.releaseType || "AFTER_APPROVAL";
  const currentDate = detail.earliestReleaseDate || "";

  useEffect(() => {
    let cancelled = false;

    async function loadChecklist() {
      setChecklistLoading(true);
      try {
        const data = await fetchReleaseChecklist(appId);
        if (!cancelled) {
          setChecklistConfigured((data.items || []).length > 0);
        }
      } catch {
        if (!cancelled) setChecklistConfigured(false);
      } finally {
        if (!cancelled) setChecklistLoading(false);
      }
    }

    loadChecklist();
    return () => { cancelled = true; };
  }, [appId]);

  useEffect(() => {
    if (checklistLoading || !checklistConfigured || currentType === "MANUAL") return;

    let cancelled = false;

    async function enforceManual() {
      setSaving(true);
      setSaveError(null);
      try {
        await updateVersionRelease(appId, versionId, {
          accountId,
          releaseType: "MANUAL",
          earliestReleaseDate: null,
        });
        if (!cancelled) await onDetailUpdate();
      } catch (err) {
        if (!cancelled) setSaveError(err.message);
      } finally {
        if (!cancelled) setSaving(false);
      }
    }

    enforceManual();
    return () => { cancelled = true; };
  }, [checklistLoading, checklistConfigured, currentType, appId, versionId, accountId, onDetailUpdate]);

  async function handleTypeChange(newType) {
    if (checklistConfigured && newType !== "MANUAL") return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateVersionRelease(appId, versionId, {
        accountId,
        releaseType: newType,
        earliestReleaseDate: newType === "SCHEDULED" ? (currentDate || new Date(Date.now() + 86400000).toISOString()) : null,
      });
      await onDetailUpdate();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDateChange(dateStr) {
    if (!dateStr || checklistConfigured) return;
    setSaving(true);
    setSaveError(null);
    try {
      const isoDate = new Date(dateStr).toISOString();
      await updateVersionRelease(appId, versionId, {
        accountId,
        releaseType: "SCHEDULED",
        earliestReleaseDate: isoDate,
      });
      await onDetailUpdate();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function toLocalDatetime(isoStr) {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const effectiveType = checklistConfigured ? "MANUAL" : currentType;

  return (
    <div className="mb-8">
      <h2 className="text-[13px] font-bold text-dark-text uppercase tracking-wide mb-3">App Store Version Release</h2>
      <p className="text-[12px] text-dark-dim mb-4 leading-relaxed">
        Choose how this version is released to the App Store. You can release manually, automatically after approval, or schedule a specific date.
      </p>

      {checklistConfigured && (
        <div className="text-[12px] text-dark-dim mb-4 px-3.5 py-2.5 rounded-[10px] bg-accent/5 border border-accent/20 leading-relaxed">
          This app has a release checklist — version must use manual release.
        </div>
      )}

      <div className="space-y-2.5">
        {RELEASE_TYPES.map((rt) => {
          const disabledByChecklist = checklistConfigured && rt.value !== "MANUAL";
          return (
            <label
              key={rt.value}
              className={`flex items-start gap-3 rounded-[10px] px-4 py-3 transition-colors ${
                disabledByChecklist
                  ? "bg-dark-surface opacity-50 cursor-not-allowed"
                  : "bg-dark-surface hover:bg-dark-hover cursor-pointer"
              }`}
            >
              <input
                type="radio"
                name="releaseType"
                value={rt.value}
                checked={effectiveType === rt.value}
                onChange={() => handleTypeChange(rt.value)}
                disabled={saving || disabledByChecklist}
                className="w-4 h-4 accent-accent mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[13px] text-dark-text font-medium">{rt.label}</span>
                {rt.value === "SCHEDULED" && effectiveType === "SCHEDULED" && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <input
                      type="datetime-local"
                      value={toLocalDatetime(currentDate)}
                      onChange={(e) => handleDateChange(e.target.value)}
                      disabled={saving || checklistConfigured}
                      className="px-3 py-1.5 bg-dark-bg border border-dark-border-light rounded-lg text-dark-text text-[13px] font-sans outline-none"
                    />
                    <span className="text-[11px] text-dark-dim">{tz}</span>
                  </div>
                )}
              </div>
              {saving && effectiveType === rt.value && (
                <span className="text-sm text-dark-dim shrink-0" style={{ animation: "asc-spin 1s linear infinite" }}>{"\u21bb"}</span>
              )}
            </label>
          );
        })}
      </div>

      {saveError && (
        <div className="text-[11px] text-danger font-medium mt-2">{saveError}</div>
      )}
    </div>
  );
}