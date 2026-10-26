import { useState, useEffect, useCallback } from "react";
import {
  fetchIAPs, deleteIAP,
  fetchSubscriptionGroups, deleteSubscriptionGroup,
  deleteSubscription, fetchReviewDraft,
} from "../api/index.js";
import AppIcon from "./AppIcon.jsx";
import IAPSection from "./IAPSection.jsx";
import SubscriptionGroupSection from "./SubscriptionGroupSection.jsx";
import ProductModal from "./ProductModal.jsx";
import StatusDot from "./StatusDot.jsx";

export default function ProductsPage({ app, accounts, isMobile }) {
  const [iaps, setIaps] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [modalMode, setModalMode] = useState(null);
  const [modalTarget, setModalTarget] = useState(null);
  const [subRefreshKey, setSubRefreshKey] = useState(0);
  const [draft, setDraft] = useState({ submissionId: null, items: [] });

  const loadDraft = useCallback(() => {
    fetchReviewDraft(app.id, app.accountId).then(setDraft).catch(() => {});
  }, [app.id, app.accountId]);

  useEffect(() => { loadDraft(); }, [loadDraft]);

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [iapData, groupData] = await Promise.all([
        fetchIAPs(app.id, app.accountId),
        fetchSubscriptionGroups(app.id, app.accountId),
      ]);
      setIaps(iapData);
      setGroups(groupData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [app.id, app.accountId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDeleteIAP(iap) {
    try {
      await deleteIAP(app.id, iap.id, app.accountId);
      setIaps((prev) => prev.filter((i) => i.id !== iap.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteGroup(group) {
    try {
      await deleteSubscriptionGroup(app.id, group.id, app.accountId);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteSub(sub, group) {
    try {
      await deleteSubscription(app.id, group.id, sub.id, app.accountId);
      setSubRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  function openModal(mode, target = null) {
    setModalMode(mode);
    setModalTarget(target);
  }

  function handleModalSaved() {
    setModalMode(null);
    setModalTarget(null);
    if (modalMode?.includes("iap")) {
      fetchIAPs(app.id, app.accountId).then(setIaps).catch(() => {});
    } else if (modalMode?.includes("group")) {
      fetchSubscriptionGroups(app.id, app.accountId).then(setGroups).catch(() => {});
    } else if (modalMode?.includes("sub")) {
      setSubRefreshKey((k) => k + 1);
    }
  }

  const consumables = iaps.filter((i) => i.type === "CONSUMABLE");
  const nonConsumables = iaps.filter((i) => i.type === "NON_CONSUMABLE");
  const nonRenewing = iaps.filter((i) => i.type === "NON_RENEWING_SUBSCRIPTION");

  return (
    <div style={{ animation: "asc-slidein 0.3s ease backwards" }}>
      {/* Back navigation bar */}
      <div className={`sticky top-0 z-10 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border ${isMobile ? "px-3 py-3" : "px-7 py-3"}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-accent text-sm font-medium bg-transparent border-none cursor-pointer font-sans px-0"
          >
            <span className="text-lg leading-none">{"\u2039"}</span>
            {app.name}
          </button>
          <span className="text-dark-phantom text-sm">/</span>
          <span className="text-sm text-dark-dim font-medium">Products</span>
        </div>
      </div>

      <div className={isMobile ? "px-3 pt-5 pb-10" : "px-7 pt-6 pb-16 max-w-[960px]"}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <AppIcon app={app} size={48} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-dark-text m-0 leading-tight">Products</h1>
            <div className="text-[12px] text-dark-dim mt-0.5">{app.name} &mdash; In-App Purchases & Subscriptions</div>
          </div>
        </div>

        {loading && (
          <div className="text-center px-5 py-20 text-dark-dim">
            <div className="text-[28px] mb-3 inline-block" style={{ animation: "asc-spin 1s linear infinite" }}>
              {"\u21bb"}
            </div>
            <div className="text-sm font-semibold">Loading products...</div>
          </div>
        )}

        {error && !loading && (
          <div className="text-center px-5 py-16 text-danger">
            <div className="text-sm font-semibold mb-2">Failed to load products</div>
            <div className="text-xs text-dark-dim max-w-[400px] mx-auto mb-4">{error}</div>
            <button
              onClick={loadData}
              className="px-[18px] py-2 rounded-lg text-xs font-semibold bg-accent text-white border-none cursor-pointer font-sans"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-8">
            {/* IAP Sections — only show types that have items, plus one "+ New" to create any type */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-dark-text uppercase tracking-wide">In-App Purchases</span>
                <button
                  onClick={() => openModal("create-iap")}
                  className="text-[11px] font-semibold text-accent bg-transparent border-none cursor-pointer font-sans px-0 hover:underline"
                >
                  + New
                </button>
              </div>
              {iaps.length === 0 ? (
                <div className="text-center py-6 text-dark-ghost">
                  <div className="text-xs font-semibold">No in-app purchases yet</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {consumables.length > 0 && (
                    <IAPSection
                      title="Consumables"
                      iaps={consumables}
                      onEdit={(iap) => openModal("edit-iap", iap)}
                      onDelete={handleDeleteIAP}
                      onAdd={() => openModal("create-iap", { type: "CONSUMABLE" })}
                    />
                  )}
                  {nonConsumables.length > 0 && (
                    <IAPSection
                      title="Non-Consumables"
                      iaps={nonConsumables}
                      onEdit={(iap) => openModal("edit-iap", iap)}
                      onDelete={handleDeleteIAP}
                      onAdd={() => openModal("create-iap", { type: "NON_CONSUMABLE" })}
                    />
                  )}
                  {nonRenewing.length > 0 && (
                    <IAPSection
                      title="Non-Renewing Subscriptions"
                      iaps={nonRenewing}
                      onEdit={(iap) => openModal("edit-iap", iap)}
                      onDelete={handleDeleteIAP}
                      onAdd={() => openModal("create-iap", { type: "NON_RENEWING_SUBSCRIPTION" })}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Subscription Groups */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-dark-text uppercase tracking-wide">Subscription Groups</span>
                <button
                  onClick={() => openModal("create-group")}
                  className="text-[11px] font-semibold text-accent bg-transparent border-none cursor-pointer font-sans px-0 hover:underline"
                >
                  + New Group
                </button>
              </div>

              {draft.items.length > 0 && (
                <div className="bg-dark-surface rounded-[10px] px-4 py-3 mb-2 border border-dark-border">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusDot status="ADDED_TO_REVIEW" />
                    <span className="text-[11px] text-dark-dim">
                      Draft submission, submit it together with the app version
                    </span>
                  </div>
                  <div className="space-y-1">
                    {draft.items.map((item) => (
                      <div key={`${item.kind}:${item.id}`} className="flex items-center gap-2 text-[12px]">
                        <span className="text-[10px] font-bold text-accent-light bg-accent-bg px-1.5 py-0.5 rounded">
                          {item.kind === "group" ? "Group" : "Sub"}
                        </span>
                        <span className="text-dark-text font-semibold truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {groups.length === 0 ? (
                <div className="text-center py-6 text-dark-ghost">
                  <div className="text-xs font-semibold">No subscription groups yet</div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {groups.map((group) => (
                    <SubscriptionGroupSection
                      key={group.id}
                      group={group}
                      appId={app.id}
                      accountId={app.accountId}
                      onEditGroup={(g) => openModal("edit-group", g)}
                      onDeleteGroup={handleDeleteGroup}
                      onAddSub={(g) => openModal("create-sub", { groupId: g.id })}
                      onEditSub={(sub, g) => openModal("edit-sub", { ...sub, groupId: g.id })}
                      onDeleteSub={handleDeleteSub}
                      refreshKey={subRefreshKey}
                      draftItems={draft.items}
                      onDraftChanged={loadDraft}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {modalMode && (
        <ProductModal
          mode={modalMode}
          target={modalTarget}
          appId={app.id}
          accountId={app.accountId}
          isMobile={isMobile}
          onClose={() => { setModalMode(null); setModalTarget(null); }}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  );
}
