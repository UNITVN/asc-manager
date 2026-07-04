import { useState } from "react";
import { updateVersionRelease } from "../api/index.js";
import { RELEASE_TYPES } from "../constants/index.js";

export default function VersionReleaseSection({ appId, versionId, accountId, detail, onDetailUpdate, isMobile }) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const currentType = detail.releaseType || "AFTER_APPROVAL";
  const currentDate = detail.earliestReleaseDate || "";

  async function handleTypeChange(newType) {
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
    if (!dateStr) return;
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

  return (
    <div className="mb-8">
      <h2 className="text-[13px] font-bold text-dark-text uppercase tracking-wide mb-3">App Store Version Release</h2>
      <p className="text-[12px] text-dark-dim mb-4 leading-relaxed">
        Choose how this version is released to the App Store. You can release manually, automatically after approval, or schedule a specific date.
      </p>

      <div className="space-y-2.5">
        {RELEASE_TYPES.map((rt) => (
          <label
            key={rt.value}
            className="flex items-start gap-3 rounded-[10px] px-4 py-3 transition-colors bg-dark-surface hover:bg-dark-hover cursor-pointer"
          >
            <input
              type="radio"
              name="releaseType"
              value={rt.value}
              checked={currentType === rt.value}
              onChange={() => handleTypeChange(rt.value)}
              disabled={saving}
              className="w-4 h-4 accent-accent mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-dark-text font-medium">{rt.label}</span>
              {rt.value === "SCHEDULED" && currentType === "SCHEDULED" && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <input
                    type="datetime-local"
                    value={toLocalDatetime(currentDate)}
                    onChange={(e) => handleDateChange(e.target.value)}
                    disabled={saving}
                    className="px-3 py-1.5 bg-dark-bg border border-dark-border-light rounded-lg text-dark-text text-[13px] font-sans outline-none"
                  />
                  <span className="text-[11px] text-dark-dim">{tz}</span>
                </div>
              )}
            </div>
            {saving && currentType === rt.value && (
              <span className="text-sm text-dark-dim shrink-0" style={{ animation: "asc-spin 1s linear infinite" }}>{"\u21bb"}</span>
            )}
          </label>
        ))}
      </div>

      {saveError && (
        <div className="text-[11px] text-danger font-medium mt-2">{saveError}</div>
      )}
    </div>
  );
}
