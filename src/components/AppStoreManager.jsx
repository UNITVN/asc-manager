import { useState, useEffect, useCallback } from "react";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { fetchApps, fetchAccounts, createAccount, fetchVersions, fetchCiBuildRuns, fetchCurrentUser, setVendorNumber } from "../api/index.js";
import { STATUS_MAP } from "../constants/index.js";
import TopBar from "./TopBar.jsx";
import Sidebar from "./Sidebar.jsx";
import AppGrid from "./AppGrid.jsx";
import AddAccountModal from "./AddAccountModal.jsx";
import AppDetailPage from "./AppDetailPage.jsx";
import VersionDetailPage from "./VersionDetailPage.jsx";
import ProductsPage from "./ProductsPage.jsx";
import XcodeCloudPage from "./XcodeCloudPage.jsx";
import AnalyticsPage from "./AnalyticsPage.jsx";
import BuildDetailPage from "./BuildDetailPage.jsx";
import WorkflowEditPage from "./WorkflowEditPage.jsx";
import ReviewSubmissionDetail from "./ReviewSubmissionDetail.jsx";

function buildGroups(apps, groupBy, accounts) {
  if (groupBy === "none") return [{ key: "all", label: null, apps }];
  if (groupBy === "status") {
    const order = Object.keys(STATUS_MAP);
    const byStatus = {};
    apps.forEach((a) => { (byStatus[a.status] = byStatus[a.status] || []).push(a); });
    return order.filter((s) => byStatus[s]).map((s) => ({
      key: s, label: STATUS_MAP[s].label, color: STATUS_MAP[s].color, apps: byStatus[s],
    }));
  }
  const knownNames = new Set(accounts.map((a) => a.name));
  const groups = accounts
    .map((acc) => ({
      key: acc.id, label: acc.name, color: acc.color,
      apps: apps.filter((a) => a.account === acc.name),
    }))
    .filter((g) => g.apps.length > 0);
  const orphans = apps.filter((a) => !knownNames.has(a.account));
  if (orphans.length > 0) {
    groups.push({ key: "__unknown__", label: "Unknown Account", color: "#8e8e93", apps: orphans });
  }
  return groups;
}

function getRouteFromPath() {
  const path = window.location.pathname;
  const versionMatch = path.match(/^\/app\/([^/]+)\/version\/([^/]+)$/);
  if (versionMatch) return { appId: versionMatch[1], versionId: versionMatch[2], subPage: null };
  const productsMatch = path.match(/^\/app\/([^/]+)\/products$/);
  if (productsMatch) return { appId: productsMatch[1], versionId: null, subPage: "products" };
  const xcodeCloudWorkflowMatch = path.match(/^\/app\/([^/]+)\/xcode-cloud\/workflow\/([^/]+)$/);
  if (xcodeCloudWorkflowMatch) return { appId: xcodeCloudWorkflowMatch[1], versionId: null, subPage: "xcode-cloud-workflow", workflowId: xcodeCloudWorkflowMatch[2] };
  const xcodeCloudBuildMatch = path.match(/^\/app\/([^/]+)\/xcode-cloud\/build\/([^/]+)$/);
  if (xcodeCloudBuildMatch) return { appId: xcodeCloudBuildMatch[1], versionId: null, subPage: "xcode-cloud-build", buildId: xcodeCloudBuildMatch[2] };
  const xcodeCloudMatch = path.match(/^\/app\/([^/]+)\/xcode-cloud$/);
  if (xcodeCloudMatch) return { appId: xcodeCloudMatch[1], versionId: null, subPage: "xcode-cloud" };
  const analyticsMatch = path.match(/^\/app\/([^/]+)\/analytics$/);
  if (analyticsMatch) return { appId: analyticsMatch[1], versionId: null, subPage: "analytics" };
  const reviewMatch = path.match(/^\/app\/([^/]+)\/review\/([^/]+)$/);
  if (reviewMatch) return { appId: reviewMatch[1], versionId: null, subPage: "review", submissionId: reviewMatch[2] };
  const appMatch = path.match(/^\/app\/([^/]+)$/);
  if (appMatch) return { appId: appMatch[1], versionId: null, subPage: null };
  return { appId: null, versionId: null, subPage: null };
}

export default function AppStoreManager() {
  const isMobile = useIsMobile();

  const [accounts, setAccounts] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatusSet, setFilterStatusSet] = useState(new Set());
  const [filterAccountSet, setFilterAccountSet] = useState(new Set());
  const [groupBy, setGroupBy] = useState("account");
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [showAdd, setShowAdd] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [currentView, setCurrentView] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const selectApp = useCallback((app) => {
    setSelectedApp(app);
    setSelectedVersion(null);
    setCurrentView(app ? "detail" : null);
    if (app) {
      window.history.pushState({ appId: app.id }, "", `/app/${app.id}`);
    } else {
      window.history.pushState(null, "", "/");
    }
  }, []);

  const selectVersion = useCallback((version, app) => {
    setSelectedVersion({ version, app });
    setCurrentView("version");
    window.history.pushState(
      { appId: app.id, versionId: version.id },
      "",
      `/app/${app.id}/version/${version.id}`
    );
  }, []);

  const navigateToProducts = useCallback((app) => {
    setSelectedApp(app);
    setSelectedVersion(null);
    setCurrentView("products");
    window.history.pushState({ appId: app.id, subPage: "products" }, "", `/app/${app.id}/products`);
  }, []);

  const navigateToXcodeCloud = useCallback((app) => {
    setSelectedApp(app);
    setSelectedVersion(null);
    setSelectedBuildRun(null);
    setCurrentView("xcode-cloud");
    window.history.pushState({ appId: app.id, subPage: "xcode-cloud" }, "", `/app/${app.id}/xcode-cloud`);
  }, []);

  const navigateToAnalytics = useCallback((app) => {
    setSelectedApp(app);
    setSelectedVersion(null);
    setCurrentView("analytics");
    window.history.pushState({ appId: app.id, subPage: "analytics" }, "", `/app/${app.id}/analytics`);
  }, []);

  const [selectedBuildRun, setSelectedBuildRun] = useState(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  const navigateToWorkflowEdit = useCallback((workflow, app) => {
    setSelectedApp(app);
    setSelectedVersion(null);
    setSelectedBuildRun(null);
    setSelectedWorkflowId(workflow.id);
    setCurrentView("xcode-cloud-workflow");
    window.history.pushState(
      { appId: app.id, workflowId: workflow.id, subPage: "xcode-cloud-workflow" },
      "",
      `/app/${app.id}/xcode-cloud/workflow/${workflow.id}`
    );
  }, []);

  const navigateToXcodeCloudBuild = useCallback((buildRun, app) => {
    setSelectedApp(app);
    setSelectedVersion(null);
    setSelectedBuildRun(buildRun);
    setCurrentView("xcode-cloud-build");
    window.history.pushState(
      { appId: app.id, buildId: buildRun.id, subPage: "xcode-cloud-build" },
      "",
      `/app/${app.id}/xcode-cloud/build/${buildRun.id}`
    );
  }, []);

  const navigateToReviewDetail = useCallback((submissionId, app) => {
    setSelectedApp(app);
    setSelectedVersion(null);
    setSelectedSubmissionId(submissionId);
    setCurrentView("review");
    window.history.pushState(
      { appId: app.id, submissionId, subPage: "review" },
      "",
      `/app/${app.id}/review/${submissionId}`
    );
  }, []);

  const loadData = useCallback(async (fresh = false) => {
    try {
      setError(null);
      const [accts, appsList] = await Promise.all([fetchAccounts(), fetchApps({ fresh })]);
      setAccounts(accts);
      setApps(appsList);

      const route = getRouteFromPath();
      if (route.versionId) {
        const appMatch = appsList.find((a) => a.id === route.appId);
        if (appMatch) {
          setSelectedApp(appMatch);
          setCurrentView("version");
          try {
            const versions = await fetchVersions(appMatch.id, appMatch.accountId);
            const vMatch = versions.find((v) => v.id === route.versionId);
            if (vMatch) setSelectedVersion({ version: vMatch, app: appMatch });
          } catch {
            // Version deep-link failed, stay on app detail
          }
        }
      } else if (route.subPage === "products") {
        const appMatch = appsList.find((a) => a.id === route.appId);
        if (appMatch) {
          setSelectedApp(appMatch);
          setCurrentView("products");
        }
      } else if (route.subPage === "xcode-cloud-workflow") {
        const appMatch = appsList.find((a) => a.id === route.appId);
        if (appMatch) {
          setSelectedApp(appMatch);
          setSelectedWorkflowId(route.workflowId);
          setCurrentView("xcode-cloud-workflow");
        }
      } else if (route.subPage === "xcode-cloud-build") {
        const appMatch = appsList.find((a) => a.id === route.appId);
        if (appMatch) {
          setSelectedApp(appMatch);
          setCurrentView("xcode-cloud-build");
          try {
            const buildsRes = await fetchCiBuildRuns(appMatch.id, appMatch.accountId);
            const buildMatch = (buildsRes.data || []).find((b) => b.id === route.buildId);
            if (buildMatch) setSelectedBuildRun(buildMatch);
          } catch {
            // Build deep-link resolution failed, page will show with available data
          }
        }
      } else if (route.subPage === "review") {
        const appMatch = appsList.find((a) => a.id === route.appId);
        if (appMatch) {
          setSelectedApp(appMatch);
          setSelectedSubmissionId(route.submissionId);
          setCurrentView("review");
        }
      } else if (route.subPage === "xcode-cloud") {
        const appMatch = appsList.find((a) => a.id === route.appId);
        if (appMatch) {
          setSelectedApp(appMatch);
          setCurrentView("xcode-cloud");
        }
      } else if (route.subPage === "analytics") {
        const appMatch = appsList.find((a) => a.id === route.appId);
        if (appMatch) {
          setSelectedApp(appMatch);
          setCurrentView("analytics");
        }
      } else if (route.appId) {
        const match = appsList.find((a) => a.id === route.appId);
        if (match) {
          setSelectedApp(match);
          setCurrentView("detail");
        }
      }
    } catch (err) {
      setError(err.message);
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    fetchCurrentUser()
      .then((data) => setCurrentUser(data.user))
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    function onPopState() {
      const route = getRouteFromPath();

      if (route.versionId) {
        const appMatch = apps.find((a) => a.id === route.appId);
        if (appMatch) {
          setSelectedApp(appMatch);
          setCurrentView("version");
          fetchVersions(appMatch.id, appMatch.accountId)
            .then((versions) => {
              const vMatch = versions.find((v) => v.id === route.versionId);
              setSelectedVersion(vMatch ? { version: vMatch, app: appMatch } : null);
            })
            .catch(() => setSelectedVersion(null));
        } else {
          setSelectedApp(null);
          setSelectedVersion(null);
          setCurrentView(null);
        }
        return;
      }

      setSelectedVersion(null);

      if (route.subPage === "products") {
        const appMatch = apps.find((a) => a.id === route.appId);
        setSelectedApp(appMatch || null);
        setCurrentView(appMatch ? "products" : null);
        return;
      }

      if (route.subPage === "xcode-cloud-workflow") {
        const appMatch = apps.find((a) => a.id === route.appId);
        if (appMatch) {
          setSelectedApp(appMatch);
          setSelectedWorkflowId(route.workflowId);
          setSelectedBuildRun(null);
          setCurrentView("xcode-cloud-workflow");
        } else {
          setSelectedApp(null);
          setSelectedWorkflowId(null);
          setCurrentView(null);
        }
        return;
      }

      if (route.subPage === "xcode-cloud-build") {
        const appMatch = apps.find((a) => a.id === route.appId);
        if (appMatch) {
          setSelectedApp(appMatch);
          setCurrentView("xcode-cloud-build");
          fetchCiBuildRuns(appMatch.id, appMatch.accountId)
            .then((res) => {
              const buildMatch = (res.data || []).find((b) => b.id === route.buildId);
              setSelectedBuildRun(buildMatch || null);
            })
            .catch(() => setSelectedBuildRun(null));
        } else {
          setSelectedApp(null);
          setSelectedBuildRun(null);
          setCurrentView(null);
        }
        return;
      }

      if (route.subPage === "review") {
        const appMatch = apps.find((a) => a.id === route.appId);
        if (appMatch) {
          setSelectedApp(appMatch);
          setSelectedSubmissionId(route.submissionId);
          setCurrentView("review");
        } else {
          setSelectedApp(null);
          setSelectedSubmissionId(null);
          setCurrentView(null);
        }
        return;
      }

      if (route.subPage === "xcode-cloud") {
        const appMatch = apps.find((a) => a.id === route.appId);
        setSelectedApp(appMatch || null);
        setSelectedBuildRun(null);
        setCurrentView(appMatch ? "xcode-cloud" : null);
        return;
      }

      if (route.subPage === "analytics") {
        const appMatch = apps.find((a) => a.id === route.appId);
        setSelectedApp(appMatch || null);
        setCurrentView(appMatch ? "analytics" : null);
        return;
      }

      if (route.appId) {
        const match = apps.find((a) => a.id === route.appId);
        setSelectedApp(match || null);
        setCurrentView(match ? "detail" : null);
      } else {
        setSelectedApp(null);
        setCurrentView(null);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [apps]);

  const filtered = apps.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.bundleId.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatusSet.size > 0 && !filterStatusSet.has(a.status)) return false;
    if (filterAccountSet.size > 0 && !filterAccountSet.has(a.account)) return false;
    return true;
  });

  const grouped = buildGroups(filtered, groupBy, accounts);

  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const closeSidebarOnMobile = () => { if (isMobile) setSidebarOpen(false); };

  if (currentView === "version" && selectedVersion) {
    return (
      <div className="font-sans bg-dark-bg text-dark-text min-h-screen antialiased">
        <VersionDetailPage
          app={selectedVersion.app}
          version={selectedVersion.version}
          accounts={accounts}
          isMobile={isMobile}
        />
      </div>
    );
  }

  if (currentView === "products" && selectedApp) {
    return (
      <div className="font-sans bg-dark-bg text-dark-text min-h-screen antialiased">
        <ProductsPage
          app={selectedApp}
          accounts={accounts}
          isMobile={isMobile}
        />
      </div>
    );
  }

  if (currentView === "review" && selectedApp && selectedSubmissionId) {
    return (
      <div className="font-sans bg-dark-bg text-dark-text min-h-screen antialiased">
        <ReviewSubmissionDetail
          app={selectedApp}
          submissionId={selectedSubmissionId}
          isMobile={isMobile}
        />
      </div>
    );
  }

  if (currentView === "xcode-cloud-workflow" && selectedApp && selectedWorkflowId) {
    return (
      <div className="font-sans bg-dark-bg text-dark-text min-h-screen antialiased">
        <WorkflowEditPage
          app={selectedApp}
          workflowId={selectedWorkflowId}
          isMobile={isMobile}
        />
      </div>
    );
  }

  if (currentView === "xcode-cloud-build" && selectedApp && selectedBuildRun) {
    return (
      <div className="font-sans bg-dark-bg text-dark-text min-h-screen antialiased">
        <BuildDetailPage
          app={selectedApp}
          buildRun={selectedBuildRun}
          accounts={accounts}
          isMobile={isMobile}
        />
      </div>
    );
  }

  if (currentView === "xcode-cloud" && selectedApp) {
    return (
      <div className="font-sans bg-dark-bg text-dark-text min-h-screen antialiased">
        <XcodeCloudPage
          app={selectedApp}
          accounts={accounts}
          isMobile={isMobile}
          onSelectBuild={(buildRun) => navigateToXcodeCloudBuild(buildRun, selectedApp)}
          onSelectWorkflow={(workflow) => navigateToWorkflowEdit(workflow, selectedApp)}
        />
      </div>
    );
  }

  if (currentView === "analytics" && selectedApp) {
    return (
      <div className="font-sans bg-dark-bg text-dark-text min-h-screen antialiased">
        <AnalyticsPage
          app={selectedApp}
          isAdmin={currentUser?.role === "admin"}
          isMobile={isMobile}
        />
      </div>
    );
  }

  if (selectedApp) {
    return (
      <div className="font-sans bg-dark-bg text-dark-text min-h-screen antialiased">
        <AppDetailPage
          app={selectedApp}
          accounts={accounts}
          isMobile={isMobile}
          onSelectVersion={(version) => selectVersion(version, selectedApp)}
          onViewProducts={() => navigateToProducts(selectedApp)}
          onViewXcodeCloud={() => navigateToXcodeCloud(selectedApp)}
          onViewAnalytics={() => navigateToAnalytics(selectedApp)}
          onViewReviewDetail={(submissionId) => navigateToReviewDetail(submissionId, selectedApp)}
        />
      </div>
    );
  }

  return (
    <div className="font-sans bg-dark-bg text-dark-text h-screen overflow-hidden antialiased flex">
      <Sidebar
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        filterStatusSet={filterStatusSet}
        setFilterStatusSet={setFilterStatusSet}
        filterAccountSet={filterAccountSet}
        setFilterAccountSet={setFilterAccountSet}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        accounts={accounts}
        apps={apps}
        closeSidebarOnMobile={closeSidebarOnMobile}
        onShowAdd={() => setShowAdd(true)}
      />

      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40"
          style={{ zIndex: 50 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        <TopBar
          isMobile={isMobile}
          search={search}
          setSearch={setSearch}
          syncing={syncing}
          onSync={() => { setSyncing(true); loadData(true); }}
          onShowAdd={() => setShowAdd(true)}
          onToggleSidebar={toggleSidebar}
        />

        <div className={isMobile ? "px-3 pt-2 pb-8" : "px-7 pt-2 pb-12"}>
          {loading && (
            <div className="text-center px-5 py-20 text-dark-dim">
              <div className="text-[28px] mb-3 inline-block" style={{ animation: "asc-spin 1s linear infinite" }}>
                {"\u21bb"}
              </div>
              <div className="text-sm font-semibold">Loading apps from App Store Connect...</div>
            </div>
          )}

          {error && !loading && (
            <div className="text-center px-5 py-16 text-danger">
              <div className="text-sm font-semibold mb-2">Failed to load data</div>
              <div className="text-xs text-dark-dim max-w-[400px] mx-auto mb-4">{error}</div>
              <button
                onClick={() => { setLoading(true); loadData(); }}
                className="px-[18px] py-2 rounded-lg text-xs font-semibold bg-accent text-white border-none cursor-pointer font-sans"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <AppGrid
              grouped={grouped}
              accounts={accounts}
              onSelectApp={selectApp}
              isMobile={isMobile}
            />
          )}
        </div>
      </div>

      {showAdd && (
        <AddAccountModal
          onClose={() => setShowAdd(false)}
          onAdd={async (a) => {
            try {
              const created = await createAccount({
                name: a.name,
                issuerId: a.issuer,
                keyId: a.keyId,
                privateKey: a.pk,
                color: a.color,
              });
              if (a.vendorNumber?.trim()) {
                await setVendorNumber(created.id, a.vendorNumber.trim());
              }
              loadData();
            } catch (err) {
              console.error("Failed to add account:", err);
              setError(err.message);
            }
          }}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
