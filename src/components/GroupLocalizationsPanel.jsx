import { useState, useEffect } from "react";
import {
  fetchSubscriptionGroupLocalizations, createSubscriptionGroupLocalization,
  updateSubscriptionGroupLocalization, deleteSubscriptionGroupLocalization,
} from "../api/index.js";
import { LOCALE_DISPLAY_NAMES } from "../constants/index.js";

const inputCls = "w-full px-3.5 py-2.5 bg-dark-bg border border-dark-border-light rounded-lg text-dark-text outline-none font-sans text-[13px] transition-colors";

export default function GroupLocalizationsPanel({ groupId, appId, accountId }) {
  const [expanded, setExpanded] = useState(true);
  const [locs, setLocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newLocale, setNewLocale] = useState("");
  const [newName, setNewName] = useState("");
  const [newAppName, setNewAppName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAppName, setEditAppName] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSubscriptionGroupLocalizations(appId, groupId, accountId)
      .then((data) => { if (!cancelled) setLocs(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [appId, groupId, accountId]);

  async function run(fn) {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  const handleAdd = () => run(async () => {
    const created = await createSubscriptionGroupLocalization(appId, groupId, {
      accountId, locale: newLocale, name: newName.trim(), customAppName: newAppName.trim(),
    });
    setLocs((prev) => [...prev, created]);
    setNewLocale(""); setNewName(""); setNewAppName("");
  });

  const handleSaveEdit = (loc) => run(async () => {
    const updated = await updateSubscriptionGroupLocalization(appId, groupId, loc.id, {
      accountId, name: editName.trim(), customAppName: editAppName.trim(),
    });
    setLocs((prev) => prev.map((l) => (l.id === loc.id ? updated : l)));
    setEditingId(null);
  });

  const handleDelete = (loc) => run(async () => {
    await deleteSubscriptionGroupLocalization(appId, groupId, loc.id, accountId);
    setLocs((prev) => prev.filter((l) => l.id !== loc.id));
  });

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
        <span className="text-[12px] font-bold text-dark-text uppercase tracking-wide">Localizations</span>
        {!loading && (
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
            locs.length ? "text-dark-dim bg-dark-surface" : "text-white bg-danger"
          }`}>
            {locs.length || "missing"}
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-2">
          <div className="text-[11px] text-dark-dim">
            Group display name shown to customers. At least one is required before its subscriptions can be submitted.
          </div>

          {loading && (
            <div className="text-center py-3 text-dark-dim">
              <div className="text-sm inline-block" style={{ animation: "asc-spin 1s linear infinite" }}>{"↻"}</div>
            </div>
          )}

          {error && <div className="text-[11px] text-danger font-semibold">{error}</div>}

          {!loading && locs.map((loc) => (
            <div key={loc.id} className="bg-dark-surface rounded-lg px-3 py-2.5">
              {editingId === loc.id ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-dark-dim">{loc.locale}</div>
                  <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Display name" />
                  <input className={inputCls} value={editAppName} onChange={(e) => setEditAppName(e.target.value)} placeholder="Custom app name (optional)" />
                  <div className="flex gap-3">
                    <button onClick={() => handleSaveEdit(loc)} disabled={busy || !editName.trim()} className="text-[11px] font-semibold text-accent bg-transparent border-none cursor-pointer font-sans px-0 disabled:opacity-50">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-[11px] font-semibold text-dark-dim bg-transparent border-none cursor-pointer font-sans px-0">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-dark-dim">{loc.locale}</span>
                    <span className="text-[12px] text-dark-text ml-2 font-semibold">{loc.name}</span>
                    {loc.customAppName && (
                      <div className="text-[11px] text-dark-dim truncate">{loc.customAppName}</div>
                    )}
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={() => { setEditingId(loc.id); setEditName(loc.name); setEditAppName(loc.customAppName); }}
                      className="text-[11px] font-semibold text-accent bg-transparent border-none cursor-pointer font-sans px-0"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(loc)}
                      disabled={busy}
                      className="text-[11px] font-semibold text-dark-dim hover:text-danger bg-transparent border-none cursor-pointer font-sans px-0"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {!loading && (
            <div className="bg-dark-surface rounded-lg px-3 py-2.5 space-y-2">
              <div className="text-[11px] font-bold text-dark-dim uppercase">Add Localization</div>
              <div className="grid grid-cols-2 gap-2">
                <select className={inputCls} value={newLocale} onChange={(e) => setNewLocale(e.target.value)}>
                  <option value="">Select locale...</option>
                  {Object.entries(LOCALE_DISPLAY_NAMES)
                    .filter(([code]) => !locs.some((l) => l.locale === code))
                    .sort((x, y) => x[1].localeCompare(y[1]))
                    .map(([code, label]) => (
                      <option key={code} value={code}>{label} ({code})</option>
                    ))}
                </select>
                <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Display name" />
              </div>
              <input className={inputCls} value={newAppName} onChange={(e) => setNewAppName(e.target.value)} placeholder="Custom app name (optional)" />
              <div className="flex justify-end">
                <button
                  onClick={handleAdd}
                  disabled={busy || !newLocale || !newName.trim()}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-accent text-white border-none cursor-pointer font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? "Working..." : "Add"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
