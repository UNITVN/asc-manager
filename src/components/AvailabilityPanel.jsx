import { useState, useEffect } from "react";
import {
  fetchIAPAvailability, setIAPAvailability,
  fetchSubscriptionAvailability, setSubscriptionAvailability,
} from "../api/index.js";
import { TERRITORY_MAP } from "../lib/territories.js";

const inputCls = "w-full px-3.5 py-2.5 bg-dark-surface border border-dark-border-light rounded-lg text-dark-text outline-none font-sans text-[13px] transition-colors";

export default function AvailabilityPanel({ productType, productId, groupId, appId, accountId }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [inNew, setInNew] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const isIAP = productType === "iap";

  function applyData(next) {
    setData(next);
    setSelected(new Set(next.territories));
    setInNew(next.availableInNewTerritories);
  }

  // Lazy-load on first expand
  useEffect(() => {
    if (!expanded || data) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchFn = isIAP
      ? fetchIAPAvailability(appId, productId, accountId)
      : fetchSubscriptionAvailability(appId, groupId, productId, accountId);

    fetchFn
      .then((res) => { if (!cancelled) applyData(res); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [expanded, data, isIAP, appId, productId, groupId, accountId]);

  const original = new Set(data?.territories || []);
  const dirty = data != null && (
    inNew !== data.availableInNewTerritories
    || selected.size !== original.size
    || [...selected].some((c) => !original.has(c))
  );

  function toggle(code) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
    setSaveMessage(null);
  }

  // Only territories ASC accepts; names come from the static map when known
  const territoryList = (data?.validTerritories || [])
    .map((code) => ({ code, name: TERRITORY_MAP.get(code)?.name || code }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filtered = territoryList.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
  });

  function setFiltered(checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const t of filtered) {
        if (checked) next.add(t.code); else next.delete(t.code);
      }
      return next;
    });
    setSaveMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    try {
      const payload = { accountId, territories: [...selected], availableInNewTerritories: inNew };
      const res = isIAP
        ? await setIAPAvailability(appId, productId, payload)
        : await setSubscriptionAvailability(appId, groupId, productId, payload);
      applyData(res);
      setSaveMessage({ ok: true, text: `Saved availability for ${res.territories.length} territories` });
    } catch (err) {
      setSaveMessage({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

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
        <span className="text-[12px] font-bold text-dark-text uppercase tracking-wide">
          Availability
        </span>
        {data && (
          <span className="text-[11px] text-dark-dim font-semibold bg-dark-surface px-1.5 py-0.5 rounded">
            {data.territories.length}
          </span>
        )}
        {dirty && (
          <span className="text-[11px] text-white font-semibold bg-accent px-1.5 py-0.5 rounded">
            unsaved
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-3">
          {loading && (
            <div className="text-center py-3 text-dark-dim">
              <div className="text-sm inline-block" style={{ animation: "asc-spin 1s linear infinite" }}>{"↻"}</div>
            </div>
          )}

          {error && <div className="text-[11px] text-danger font-semibold">{error}</div>}

          {!loading && !error && data && (
            <>
              {!data.exists && (
                <div className="text-[11px] text-dark-dim">
                  Not available in any territory yet. Select territories and save.
                </div>
              )}

              <input
                className={inputCls}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter territories..."
              />

              <div className="flex items-center gap-3 text-[11px]">
                <button
                  onClick={() => setFiltered(true)}
                  className="bg-transparent border-none cursor-pointer text-accent font-semibold font-sans p-0"
                >
                  Select {search.trim() ? "shown" : "all"}
                </button>
                <button
                  onClick={() => setFiltered(false)}
                  className="bg-transparent border-none cursor-pointer text-accent font-semibold font-sans p-0"
                >
                  Clear {search.trim() ? "shown" : "all"}
                </button>
                <span className="text-dark-dim ml-auto">{selected.size} selected</span>
              </div>

              <div className="max-h-[260px] overflow-y-auto rounded-lg border border-dark-border">
                {filtered.map((t) => (
                  <label
                    key={t.code}
                    className="flex items-center gap-2 px-3 py-1.5 text-[12px] border-t border-dark-border first:border-t-0 hover:bg-dark-surface/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(t.code)}
                      onChange={() => toggle(t.code)}
                    />
                    <span className="font-mono text-dark-text">{t.code}</span>
                    <span className="text-dark-dim">{t.name}</span>
                  </label>
                ))}
                {filtered.length === 0 && (
                  <div className="px-3 py-4 text-center text-[12px] text-dark-dim">
                    No territories match your filter
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-[12px] text-dark-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={inNew}
                  onChange={(e) => { setInNew(e.target.checked); setSaveMessage(null); }}
                />
                Automatically available in new territories
              </label>

              {dirty && (
                <button
                  onClick={handleSave}
                  disabled={saving || selected.size === 0}
                  className={`w-full px-4 py-2.5 rounded-lg text-[13px] font-semibold bg-accent text-white border-none font-sans transition-all ${
                    saving || selected.size === 0 ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:brightness-110"
                  }`}
                >
                  {saving ? "Saving..." : "Save availability"}
                </button>
              )}

              {saveMessage && (
                <div className={`text-[12px] font-medium ${saveMessage.ok ? "text-green-400" : "text-danger"}`}>
                  {saveMessage.text}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
