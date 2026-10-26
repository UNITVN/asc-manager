import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchSubscriptionPricePoints, fetchSubscriptionEqualizations, fetchSubscriptionPrices,
} from "../api/index.js";
import { fetchIntroOffers, applyIntroOffers } from "../api/introOffers.js";
import { TERRITORIES, TERRITORY_MAP } from "../lib/territories.js";
import {
  OFFER_MODES, OFFER_DURATIONS, PLAN_TYPES,
  describeOffer, isDraftComplete, draftMatchesOffer, buildChanges,
} from "../lib/introOffers.js";

const BASE_TERRITORY = "USA";

const inputCls = "w-full px-3.5 py-2.5 bg-dark-surface border border-dark-border-light rounded-lg text-dark-text outline-none font-sans text-[13px] transition-colors";
const selectCls = "bg-dark-surface border border-dark-border-light rounded px-2 py-1 text-dark-text text-[12px] outline-none font-sans max-w-[150px]";

const isPaid = (mode) => mode === "PAY_AS_YOU_GO" || mode === "PAY_UP_FRONT";

function incompleteReason(draft) {
  if (!Number.isInteger(draft.numberOfPeriods) || draft.numberOfPeriods < 1) {
    return "Enter a period count of 1 or more";
  }
  if (isPaid(draft.offerMode) && !draft.pricePointId) return "Pick a price";
  return "Incomplete";
}

function describeSaved({ saved }) {
  return saved > 0 ? `Saved ${saved} offer${saved !== 1 ? "s" : ""}` : "Nothing to change";
}

function draftFromOffer(offer) {
  return {
    offerMode: offer.offerMode,
    duration: offer.duration,
    numberOfPeriods: offer.numberOfPeriods,
    planType: offer.planType || "",
    pricePointId: offer.pricePointId || "",
  };
}

function PlanTypeSelect({ label, value, onChange }) {
  return (
    <select aria-label={label} className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Plan: any</option>
      {PLAN_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  );
}

function DurationSelect({ label, value, onChange }) {
  return (
    <select aria-label={label} className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {OFFER_DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
    </select>
  );
}

function PeriodsInput({ label, value, onChange }) {
  return (
    <input
      aria-label={label}
      type="number"
      min={1}
      className={`${selectCls} w-[64px]`}
      value={value}
      onChange={(e) => onChange(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
    />
  );
}

export default function IntroOffersPanel({ productId, groupId, appId, accountId }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [offers, setOffers] = useState(null);
  const [drafts, setDrafts] = useState(new Map());
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [search, setSearch] = useState("");

  const [pricePointsCache, setPricePointsCache] = useState(new Map());
  const [equalizedMap, setEqualizedMap] = useState(new Map());

  const [bulk, setBulk] = useState({
    offerMode: "", duration: "ONE_WEEK", numberOfPeriods: 1, planType: "", pricePointId: "",
  });
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState(null);
  const [fillNote, setFillNote] = useState(null);

  useEffect(() => {
    if (!expanded || offers) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchIntroOffers(appId, groupId, productId, accountId)
      .then((data) => { if (!cancelled) setOffers(data.offers || []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [expanded, offers, appId, groupId, productId, accountId]);

  const offersByTerritory = useMemo(
    () => new Map((offers || []).map((o) => [o.territory, o])),
    [offers]
  );
  // New drafts follow the plan type the subscription's existing offers already use.
  const defaultPlanType = offers?.find((o) => o.planType)?.planType || "";

  const loadPricePoints = useCallback(async (territory) => {
    if (pricePointsCache.has(territory)) return;
    try {
      const result = await fetchSubscriptionPricePoints(appId, groupId, productId, territory, accountId);
      setPricePointsCache((prev) => new Map(prev).set(territory, result.pricePoints || []));
    } catch {
      // The select falls back to the current price only.
    }
  }, [appId, groupId, productId, accountId, pricePointsCache]);

  function effectiveDraft(territory) {
    const draft = drafts.get(territory);
    if (draft) return draft;
    const existing = offersByTerritory.get(territory);
    return existing ? draftFromOffer(existing) : null;
  }

  function commit(territory, draft) {
    setDrafts((prev) => {
      const next = new Map(prev);
      const existing = offersByTerritory.get(territory);
      if (existing && draftMatchesOffer(draft, existing)) next.delete(territory);
      else next.set(territory, draft);
      return next;
    });
    setSaveResult(null);
  }

  function setRowMode(territory, mode) {
    // "None" only exists on rows without an offer, so it just drops the draft.
    if (!mode) {
      setDrafts((prev) => {
        const next = new Map(prev);
        next.delete(territory);
        return next;
      });
      setSaveResult(null);
      return;
    }
    const base = effectiveDraft(territory) || {
      duration: "ONE_WEEK", numberOfPeriods: 1, planType: defaultPlanType, pricePointId: "",
    };
    commit(territory, { ...base, offerMode: mode, pricePointId: isPaid(mode) ? base.pricePointId : "" });
  }

  function setRowField(territory, field, value) {
    const base = effectiveDraft(territory);
    if (base) commit(territory, { ...base, [field]: value });
  }

  async function handleBasePriceChange(pricePointId) {
    setBulk((b) => ({ ...b, pricePointId }));
    setBulkError(null);
    setEqualizedMap(new Map());
    if (!pricePointId) return;

    setBulkLoading(true);
    try {
      const { equalizations = {} } = await fetchSubscriptionEqualizations(
        appId, groupId, productId, pricePointId, accountId
      );
      const target = new Map(Object.entries(equalizations));
      const base = (pricePointsCache.get(BASE_TERRITORY) || []).find((pp) => pp.id === pricePointId);
      target.set(BASE_TERRITORY, { id: pricePointId, customerPrice: base?.customerPrice });
      setEqualizedMap(target);
    } catch (err) {
      setBulkError(err.message);
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleFillAll() {
    if (!bulk.offerMode) return;
    setFillNote(null);

    // Only territories the subscription already has a price in can carry an offer.
    let sold = null;
    try {
      const { currentPrices = {} } = await fetchSubscriptionPrices(appId, groupId, productId, accountId);
      sold = new Set(Object.keys(currentPrices));
    } catch {
      // Fall back to every territory; Apple rejects the ones that are not on sale.
    }
    const candidates = TERRITORIES.filter((t) => !sold || sold.has(t.code));

    const fills = [];
    for (const t of candidates) {
      const pricePointId = isPaid(bulk.offerMode) ? equalizedMap.get(t.code)?.id : "";
      if (isPaid(bulk.offerMode) && !pricePointId) continue;
      fills.push([t.code, {
        offerMode: bulk.offerMode,
        duration: bulk.duration,
        numberOfPeriods: bulk.numberOfPeriods,
        planType: bulk.planType,
        pricePointId: pricePointId || "",
      }]);
    }
    setDrafts((prev) => {
      const next = new Map(prev);
      for (const [territory, draft] of fills) {
        const existing = offersByTerritory.get(territory);
        if (existing && draftMatchesOffer(draft, existing)) next.delete(territory);
        else next.set(territory, draft);
      }
      return next;
    });
    setSaveResult(null);
    setFillNote(`Filled ${fills.length} of ${candidates.length} territories${sold ? "" : " (could not check which are on sale)"}`);
  }

  const changes = buildChanges(drafts, offersByTerritory);

  async function handleApply() {
    if (changes.length === 0) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const result = await applyIntroOffers(appId, groupId, productId, { accountId, changes });
      setSaveResult(result);
      const sent = new Set(changes.map((c) => c.territory));
      const failed = new Set((result.errors || []).map((e) => e.territory));
      // Keep drafts that were not sent (still incomplete) as well as the ones that failed.
      setDrafts((prev) => {
        const next = new Map();
        for (const [territory, draft] of prev) {
          if (!sent.has(territory) || failed.has(territory)) next.set(territory, draft);
        }
        return next;
      });
      setOffers(null);
    } catch (err) {
      setSaveResult({ saved: 0, errors: [{ territory: "all", message: err.message }] });
      // The server may have deleted offers before the request died; drop the stale offer ids.
      setOffers(null);
    } finally {
      setSaving(false);
    }
  }

  const filteredTerritories = TERRITORIES.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.code.toLowerCase().includes(q) ||
      t.currency.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q)
    );
  });

  function renderPriceSelect(t, draft) {
    const cached = pricePointsCache.get(t.code);
    const equalized = equalizedMap.get(t.code);
    const existing = offersByTerritory.get(t.code);
    const known = new Map();
    if (existing?.pricePointId) known.set(existing.pricePointId, existing.customerPrice);
    if (equalized?.id) known.set(equalized.id, equalized.customerPrice);
    for (const pp of cached || []) known.set(pp.id, pp.customerPrice);

    return (
      <select
        aria-label={`Price for ${t.code}`}
        className={selectCls}
        value={draft.pricePointId || ""}
        onFocus={() => loadPricePoints(t.code)}
        onChange={(e) => setRowField(t.code, "pricePointId", e.target.value)}
      >
        <option value="">-- Price --</option>
        {[...known].map(([id, price]) => (
          <option key={id} value={id}>{price ? `${t.currency} ${price}` : id}</option>
        ))}
      </select>
    );
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
          Introductory Offers
        </span>
        {changes.length > 0 && (
          <span className="text-[11px] text-white font-semibold bg-accent px-1.5 py-0.5 rounded">
            {changes.length} pending
          </span>
        )}
        {drafts.size > changes.length && (
          <span className="text-[11px] text-dark-text font-semibold bg-dark-surface border border-dark-border-light px-1.5 py-0.5 rounded">
            {drafts.size - changes.length} incomplete
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

          {!error && offers && (
            <>
              <input
                className={inputCls}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter territories..."
              />

              <div className="max-h-[320px] overflow-y-auto rounded-lg border border-dark-border">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-dark-surface text-dark-dim text-left sticky top-0">
                      <th className="px-3 py-2 font-semibold">Territory</th>
                      <th className="px-3 py-2 font-semibold">Current</th>
                      <th className="px-3 py-2 font-semibold">Offer</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-dark-border bg-dark-surface/60">
                      <td className="px-3 py-2" colSpan={2}>
                        <span className="font-semibold text-dark-text">Set for all</span>
                        {isPaid(bulk.offerMode) && (
                          <span className="text-dark-dim ml-1.5">
                            Pick a USD price, other territories are equalized automatically
                          </span>
                        )}
                        {bulkError && <div className="text-[11px] text-danger mt-0.5">{bulkError}</div>}
                        {fillNote && <div className="text-[11px] text-dark-dim mt-0.5">{fillNote}</div>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <select
                            aria-label="Offer mode for all"
                            className={selectCls}
                            value={bulk.offerMode}
                            onChange={(e) => setBulk((b) => ({ ...b, offerMode: e.target.value, planType: b.planType || defaultPlanType }))}
                          >
                            <option value="">-- Mode --</option>
                            {OFFER_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                          <DurationSelect label="Duration for all" value={bulk.duration} onChange={(duration) => setBulk((b) => ({ ...b, duration }))} />
                          <PeriodsInput label="Periods for all" value={bulk.numberOfPeriods} onChange={(numberOfPeriods) => setBulk((b) => ({ ...b, numberOfPeriods }))} />
                          <PlanTypeSelect label="Plan type for all" value={bulk.planType} onChange={(planType) => setBulk((b) => ({ ...b, planType }))} />
                          {isPaid(bulk.offerMode) && (
                            <select
                              aria-label="USD price for all"
                              className={selectCls}
                              value={bulk.pricePointId}
                              disabled={bulkLoading}
                              onFocus={() => loadPricePoints(BASE_TERRITORY)}
                              onChange={(e) => handleBasePriceChange(e.target.value)}
                            >
                              <option value="">{bulkLoading ? "Calculating..." : "-- USD --"}</option>
                              {(pricePointsCache.get(BASE_TERRITORY) || []).map((pp) => (
                                <option key={pp.id} value={pp.id}>USD {pp.customerPrice}</option>
                              ))}
                            </select>
                          )}
                          <button
                            onClick={handleFillAll}
                            disabled={!bulk.offerMode || (isPaid(bulk.offerMode) && equalizedMap.size === 0)}
                            className="px-2.5 py-1 rounded text-[12px] font-semibold bg-accent text-white border-none font-sans cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Fill all territories
                          </button>
                        </div>
                      </td>
                    </tr>
                    {filteredTerritories.map((t) => {
                      const existing = offersByTerritory.get(t.code);
                      const draft = effectiveDraft(t.code);
                      const isPending = drafts.has(t.code);
                      const mode = draft?.offerMode || "";
                      const needsPrice = !!draft && isPending && !isDraftComplete(draft);

                      return (
                        <tr
                          key={t.code}
                          className={`border-t border-dark-border hover:bg-dark-surface/50 ${isPending ? "border-l-2 border-l-accent" : ""}`}
                        >
                          <td className="px-3 py-2">
                            <span className="font-mono text-dark-text">{t.code}</span>
                            <span className="text-dark-dim ml-1.5">{TERRITORY_MAP.get(t.code)?.name || ""}</span>
                          </td>
                          <td className="px-3 py-2 text-dark-text">
                            {existing ? describeOffer(existing, t.currency) : "None"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <select
                                aria-label={`Offer mode for ${t.code}`}
                                className={selectCls}
                                value={mode}
                                onChange={(e) => setRowMode(t.code, e.target.value)}
                              >
                                {/* An existing offer can be replaced but not deleted from here. */}
                                {!existing && <option value="">{"— None —"}</option>}
                                {OFFER_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                              </select>
                              {draft && (
                                <>
                                  <DurationSelect label={`Duration for ${t.code}`} value={draft.duration} onChange={(v) => setRowField(t.code, "duration", v)} />
                                  <PeriodsInput label={`Periods for ${t.code}`} value={draft.numberOfPeriods} onChange={(v) => setRowField(t.code, "numberOfPeriods", v)} />
                                  <PlanTypeSelect label={`Plan type for ${t.code}`} value={draft.planType || ""} onChange={(v) => setRowField(t.code, "planType", v)} />
                                  {isPaid(mode) && renderPriceSelect(t, draft)}
                                </>
                              )}
                              {needsPrice && <span className="text-[11px] text-danger">{incompleteReason(draft)}</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredTerritories.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-dark-dim">
                          No territories match your filter
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {changes.length > 0 && (
                <button
                  onClick={handleApply}
                  disabled={saving}
                  className={`w-full px-4 py-2.5 rounded-lg text-[13px] font-semibold bg-accent text-white border-none font-sans transition-all ${
                    saving ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:brightness-110"
                  }`}
                >
                  {saving ? "Applying..." : `Apply ${changes.length} offer change${changes.length !== 1 ? "s" : ""}`}
                </button>
              )}

            </>
          )}

          {saveResult && (
            <div className={`text-[12px] font-medium ${saveResult.errors?.length > 0 ? "text-danger" : "text-green-400"}`}>
              {saveResult.errors?.length > 0 ? (
                <>
                  <div>
                    Applied {saveResult.saved} of {saveResult.saved + saveResult.errors.length} territories
                  </div>
                  {saveResult.errors.map((e, i) => (
                    <div key={i} className="text-[11px] mt-0.5">{e.territory}: {e.message}</div>
                  ))}
                </>
              ) : (
                <div>{describeSaved(saveResult)}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
