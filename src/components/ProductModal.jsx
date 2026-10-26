import { useState, useEffect } from "react";
import {
  createIAP, updateIAP,
  createSubscriptionGroup, updateSubscriptionGroup,
  createSubscription, updateSubscription,
  fetchIAPLocalizations, createIAPLocalization, updateIAPLocalization, deleteIAPLocalization,
  fetchSubscriptionLocalizations, createSubscriptionLocalization, updateSubscriptionLocalization, deleteSubscriptionLocalization,
} from "../api/index.js";
import { IAP_TYPES, SUBSCRIPTION_PERIODS } from "../constants/index.js";
import { LOCALE_DISPLAY_NAMES } from "../constants/index.js";
import PricingPanel from "./PricingPanel.jsx";
import IntroOffersPanel from "./IntroOffersPanel.jsx";
import AvailabilityPanel from "./AvailabilityPanel.jsx";
import ReviewScreenshotPanel from "./ReviewScreenshotPanel.jsx";
import GroupLocalizationsPanel from "./GroupLocalizationsPanel.jsx";

const labelCls = "text-[11px] uppercase tracking-wide font-semibold text-dark-dim mb-1.5 block";
const inputCls = "w-full px-3.5 py-2.5 bg-dark-surface border border-dark-border-light rounded-lg text-dark-text outline-none font-sans text-[13px] transition-colors";

function modalTitle(mode) {
  const titles = {
    "create-iap": "New In-App Purchase",
    "edit-iap": "Edit In-App Purchase",
    "create-group": "New Subscription Group",
    "edit-group": "Edit Subscription Group",
    "create-sub": "New Subscription",
    "edit-sub": "Edit Subscription",
  };
  return titles[mode] || "Product";
}

export default function ProductModal({ mode, target, appId, accountId, isMobile, onClose, onSaved }) {
  // Form fields
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [type, setType] = useState("CONSUMABLE");
  const [period, setPeriod] = useState("ONE_MONTH");
  const [familySharable, setFamilySharable] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Localizations
  const [locsExpanded, setLocsExpanded] = useState(false);
  const [locs, setLocs] = useState([]);
  const [locsLoading, setLocsLoading] = useState(false);
  const [locsError, setLocsError] = useState(null);
  const [newLocale, setNewLocale] = useState("");
  const [newLocName, setNewLocName] = useState("");
  const [newLocDesc, setNewLocDesc] = useState("");
  const [addingLoc, setAddingLoc] = useState(false);
  const [editingLocId, setEditingLocId] = useState(null);
  const [editLocName, setEditLocName] = useState("");
  const [editLocDesc, setEditLocDesc] = useState("");

  // Pre-fill for edit modes
  useEffect(() => {
    if (!target) return;
    if (mode === "create-iap" && target.type) {
      setType(target.type);
    } else if (mode === "edit-iap") {
      setName(target.name || "");
      setFamilySharable(target.familySharable || false);
      setReviewNote(target.reviewNote || "");
    } else if (mode === "edit-group") {
      setReferenceName(target.referenceName || "");
    } else if (mode === "edit-sub") {
      setName(target.name || "");
      setPeriod(target.subscriptionPeriod || "ONE_MONTH");
      setFamilySharable(target.familySharable || false);
      setReviewNote(target.reviewNote || "");
    }
  }, [mode, target]);

  const isEditMode = mode.startsWith("edit-");
  const isIAP = mode.includes("iap");
  const isSub = mode.includes("sub");
  const isGroup = mode.includes("group");
  const showLocs = isEditMode && (isIAP || isSub);
  const showPricing = isEditMode && (isIAP || isSub);

  // Lazy-load localizations
  useEffect(() => {
    if (!locsExpanded || !showLocs || !target) return;
    let cancelled = false;
    setLocsLoading(true);
    setLocsError(null);

    const fetchFn = isIAP
      ? fetchIAPLocalizations(appId, target.id, accountId)
      : fetchSubscriptionLocalizations(appId, target.groupId, target.id, accountId);

    fetchFn
      .then((data) => { if (!cancelled) setLocs(data); })
      .catch((err) => { if (!cancelled) setLocsError(err.message); })
      .finally(() => { if (!cancelled) setLocsLoading(false); });
    return () => { cancelled = true; };
  }, [locsExpanded, showLocs, target, appId, accountId, isIAP]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      if (mode === "create-iap") {
        await createIAP(appId, { accountId, name, productId, type });
      } else if (mode === "edit-iap") {
        await updateIAP(appId, target.id, { accountId, name, familySharable, reviewNote });
      } else if (mode === "create-group") {
        await createSubscriptionGroup(appId, { accountId, referenceName });
      } else if (mode === "edit-group") {
        await updateSubscriptionGroup(appId, target.id, { accountId, referenceName });
      } else if (mode === "create-sub") {
        await createSubscription(appId, target.groupId, { accountId, name, productId, subscriptionPeriod: period });
      } else if (mode === "edit-sub") {
        await updateSubscription(appId, target.groupId, target.id, { accountId, name, subscriptionPeriod: period, familySharable, reviewNote });
      }
      onSaved();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddLoc() {
    if (!newLocale.trim() || !newLocName.trim()) return;
    setAddingLoc(true);
    try {
      const createFn = isIAP
        ? createIAPLocalization(appId, target.id, { accountId, locale: newLocale.trim(), name: newLocName.trim(), description: newLocDesc.trim() })
        : createSubscriptionLocalization(appId, target.groupId, target.id, { accountId, locale: newLocale.trim(), name: newLocName.trim(), description: newLocDesc.trim() });
      const newLoc = await createFn;
      setLocs((prev) => [...prev, newLoc]);
      setNewLocale("");
      setNewLocName("");
      setNewLocDesc("");
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setAddingLoc(false);
    }
  }

  async function handleUpdateLoc(loc) {
    try {
      const updateFn = isIAP
        ? updateIAPLocalization(appId, target.id, loc.id, { accountId, name: editLocName, description: editLocDesc })
        : updateSubscriptionLocalization(appId, target.groupId, target.id, loc.id, { accountId, name: editLocName, description: editLocDesc });
      const updated = await updateFn;
      setLocs((prev) => prev.map((l) => (l.id === loc.id ? updated : l)));
      setEditingLocId(null);
    } catch (err) {
      setSaveError(err.message);
    }
  }

  async function handleDeleteLoc(loc) {
    try {
      if (isIAP) {
        await deleteIAPLocalization(appId, target.id, loc.id, accountId);
      } else {
        await deleteSubscriptionLocalization(appId, target.groupId, target.id, loc.id, accountId);
      }
      setLocs((prev) => prev.filter((l) => l.id !== loc.id));
    } catch (err) {
      setSaveError(err.message);
    }
  }

  function canSave() {
    if (saving) return false;
    if (mode === "create-iap") return name && productId;
    if (mode === "edit-iap") return !!name;
    if (mode === "create-group" || mode === "edit-group") return !!referenceName;
    if (mode === "create-sub") return name && productId;
    if (mode === "edit-sub") return !!name;
    return false;
  }

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 bg-black/40 backdrop-blur-[8px] flex justify-center z-[100] ${isMobile ? "items-end" : "items-center"}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "asc-fadein 0.3s ease" }}
        className={`bg-dark-card border border-dark-border-light w-full shadow-[0_32px_64px_rgba(0,0,0,0.15)] ${
          isMobile
            ? "rounded-t-2xl max-w-full max-h-[90vh] overflow-y-auto"
            : "rounded-2xl max-w-[540px] max-h-[85vh] overflow-y-auto"
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between sticky top-0 bg-dark-card z-[1]">
          <span className="text-[15px] font-bold text-dark-text">{modalTitle(mode)}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-dark-surface flex items-center justify-center cursor-pointer border-none hover:bg-dark-hover transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86868b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={isMobile ? "px-5 py-5" : "px-6 py-5"}>
          <div className="space-y-4">
            {/* Create IAP fields */}
            {mode === "create-iap" && (
              <>
                <div>
                  <label className={labelCls}>Name</label>
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" autoFocus />
                </div>
                <div>
                  <label className={labelCls}>Product ID</label>
                  <input className={`${inputCls} font-mono`} value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="com.example.product" />
                </div>
                <div>
                  <label className={labelCls}>Type</label>
                  <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
                    {IAP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Edit IAP fields */}
            {mode === "edit-iap" && (
              <>
                <div>
                  <label className={labelCls}>Name</label>
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="familySharable"
                    checked={familySharable}
                    onChange={(e) => setFamilySharable(e.target.checked)}
                    className="w-4 h-4 rounded accent-accent"
                  />
                  <label htmlFor="familySharable" className="text-[13px] text-dark-text font-medium cursor-pointer">Family Sharing</label>
                </div>
                <div>
                  <label className={labelCls}>Review Note</label>
                  <textarea
                    className={`${inputCls} h-[80px] resize-y`}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Optional note for App Review"
                  />
                </div>
              </>
            )}

            {/* Create/Edit group fields */}
            {(mode === "create-group" || mode === "edit-group") && (
              <div>
                <label className={labelCls}>Reference Name</label>
                <input className={inputCls} value={referenceName} onChange={(e) => setReferenceName(e.target.value)} placeholder="e.g. Premium Plans" autoFocus />
              </div>
            )}

            {mode === "edit-group" && (
              <GroupLocalizationsPanel groupId={target.id} appId={appId} accountId={accountId} />
            )}

            {/* Create subscription fields */}
            {mode === "create-sub" && (
              <>
                <div>
                  <label className={labelCls}>Name</label>
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Subscription name" autoFocus />
                </div>
                <div>
                  <label className={labelCls}>Product ID</label>
                  <input className={`${inputCls} font-mono`} value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="com.example.sub.monthly" />
                </div>
                <div>
                  <label className={labelCls}>Period</label>
                  <select className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)}>
                    {SUBSCRIPTION_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Edit subscription fields */}
            {mode === "edit-sub" && (
              <>
                <div>
                  <label className={labelCls}>Name</label>
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className={labelCls}>Period</label>
                  <select className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)}>
                    {SUBSCRIPTION_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="familySharableSub"
                    checked={familySharable}
                    onChange={(e) => setFamilySharable(e.target.checked)}
                    className="w-4 h-4 rounded accent-accent"
                  />
                  <label htmlFor="familySharableSub" className="text-[13px] text-dark-text font-medium cursor-pointer">Family Sharing</label>
                </div>
                <div>
                  <label className={labelCls}>Review Note</label>
                  <textarea
                    className={`${inputCls} h-[80px] resize-y`}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Optional note for App Review"
                  />
                </div>
              </>
            )}

            {/* Localizations panel (edit modes only) */}
            {showLocs && (
              <div className="border-t border-dark-border pt-4 mt-4">
                <button
                  onClick={() => setLocsExpanded(!locsExpanded)}
                  className="flex items-center gap-2 bg-transparent border-none cursor-pointer px-0 font-sans mb-3"
                >
                  <span className="text-dark-dim text-xs transition-transform" style={{ display: "inline-block", transform: locsExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
                    {"\u25BE"}
                  </span>
                  <span className="text-[12px] font-bold text-dark-text uppercase tracking-wide">Localizations</span>
                  {locs.length > 0 && (
                    <span className="text-[11px] text-dark-dim font-semibold bg-dark-hover px-1.5 py-0.5 rounded">{locs.length}</span>
                  )}
                </button>

                {locsExpanded && (
                  <div className="space-y-2">
                    {locsLoading && (
                      <div className="text-center py-3 text-dark-dim">
                        <div className="text-sm inline-block" style={{ animation: "asc-spin 1s linear infinite" }}>{"\u21bb"}</div>
                      </div>
                    )}

                    {locsError && (
                      <div className="text-[11px] text-danger font-semibold">{locsError}</div>
                    )}

                    {!locsLoading && !locsError && locs.map((loc) => (
                      <div key={loc.id} className="bg-dark-surface rounded-lg px-3 py-2.5">
                        {editingLocId === loc.id ? (
                          <div className="space-y-2">
                            <div className="text-[11px] font-bold text-dark-dim">{loc.locale}</div>
                            <input
                              className={inputCls}
                              value={editLocName}
                              onChange={(e) => setEditLocName(e.target.value)}
                              placeholder="Name"
                            />
                            <textarea
                              className={`${inputCls} h-[60px] resize-y`}
                              value={editLocDesc}
                              onChange={(e) => setEditLocDesc(e.target.value)}
                              placeholder="Description"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditingLocId(null)}
                                className="text-[11px] font-semibold text-dark-dim bg-transparent border-none cursor-pointer font-sans px-0"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleUpdateLoc(loc)}
                                className="text-[11px] font-semibold text-accent bg-transparent border-none cursor-pointer font-sans px-0"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-dark-dim">{loc.locale}</span>
                              <span className="text-[12px] text-dark-text ml-2">{loc.name}</span>
                              {loc.description && (
                                <div className="text-[11px] text-dark-dim mt-0.5 truncate">{loc.description}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => { setEditingLocId(loc.id); setEditLocName(loc.name); setEditLocDesc(loc.description || ""); }}
                                className="text-[11px] font-semibold text-accent bg-transparent border-none cursor-pointer font-sans px-0"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteLoc(loc)}
                                className="text-[11px] font-semibold text-dark-dim hover:text-danger bg-transparent border-none cursor-pointer font-sans px-0"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add localization form */}
                    {!locsLoading && !locsError && (
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
                          <input className={inputCls} value={newLocName} onChange={(e) => setNewLocName(e.target.value)} placeholder="Name" />
                        </div>
                        <textarea
                          className={`${inputCls} h-[50px] resize-y`}
                          value={newLocDesc}
                          onChange={(e) => setNewLocDesc(e.target.value)}
                          placeholder="Description (optional)"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={handleAddLoc}
                            disabled={addingLoc || !newLocale.trim() || !newLocName.trim()}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-accent text-white border-none cursor-pointer font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addingLoc ? "Adding..." : "Add"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Availability panel (edit modes only) */}
            {showPricing && (
              <AvailabilityPanel
                productType={isIAP ? "iap" : "subscription"}
                productId={target.id}
                groupId={target.groupId}
                appId={appId}
                accountId={accountId}
              />
            )}

            {/* Review screenshot (subscription edit only) */}
            {showPricing && !isIAP && (
              <ReviewScreenshotPanel
                productId={target.id}
                groupId={target.groupId}
                appId={appId}
                accountId={accountId}
              />
            )}

            {/* Pricing panel (edit modes only) */}
            {showPricing && (
              <PricingPanel
                productType={isIAP ? "iap" : "subscription"}
                productId={target.id}
                groupId={target.groupId}
                appId={appId}
                accountId={accountId}
              />
            )}

            {/* Introductory offers (subscription edit only) */}
            {showPricing && !isIAP && (
              <IntroOffersPanel
                productId={target.id}
                groupId={target.groupId}
                appId={appId}
                accountId={accountId}
              />
            )}
          </div>

          {saveError && (
            <div className="text-[11px] text-danger font-medium mt-3">{saveError}</div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t border-dark-border flex gap-2.5 ${isMobile ? "flex-col-reverse" : "justify-end"}`}>
          <button
            onClick={onClose}
            className="px-[18px] py-2.5 rounded-lg text-[13px] font-semibold bg-dark-surface text-dark-label border border-dark-border-light cursor-pointer font-sans hover:bg-dark-hover transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!canSave()}
            onClick={handleSave}
            className={`px-[18px] py-2.5 rounded-lg text-[13px] font-semibold bg-accent text-white border-none font-sans transition-all ${
              !canSave() ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:brightness-110"
            }`}
          >
            {saving ? "Saving..." : isEditMode ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
