import { useEffect, useState, useMemo } from "react";
import {
  fetchPublishedChangelog,
  fetchPublishedChangelogVersions,
  fetchPublicPublishedChangelog,
  fetchPublicPublishedChangelogVersions,
} from "../api/index.js";
import AppIcon from "./AppIcon.jsx";

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pb[i] || 0) - (pa[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function isLoggedIn() {
  return Boolean(window.__auth?.getToken?.());
}

export default function ChangelogPage({ app, isAdmin, isMobile, isPublicView = false }) {
  const [publishedVersions, setPublishedVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(app.version || "");
  const [entry, setEntry] = useState(null);
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const usePublicApi = isPublicView || !isLoggedIn();

  const versionOptions = useMemo(() => {
    const options = new Set(publishedVersions);
    if (app.version) options.add(app.version);
    return [...options].sort(compareVersions);
  }, [publishedVersions, app.version]);

  useEffect(() => {
    let cancelled = false;
    const loadVersions = usePublicApi
      ? fetchPublicPublishedChangelogVersions(app.id)
      : fetchPublishedChangelogVersions(app.id);

    loadVersions
      .then((versions) => {
        if (!cancelled) setPublishedVersions(versions);
      })
      .catch(() => {
        if (!cancelled) setPublishedVersions([]);
      });
    return () => { cancelled = true; };
  }, [app.id, usePublicApi]);

  useEffect(() => {
    if (!versionOptions.length) {
      setSelectedVersion(app.version || "");
      return;
    }
    if (!versionOptions.includes(selectedVersion)) {
      setSelectedVersion(versionOptions.includes(app.version) ? app.version : versionOptions[0]);
    }
  }, [versionOptions, app.version, selectedVersion]);

  useEffect(() => {
    if (!selectedVersion) {
      setLoading(false);
      setPublished(false);
      setEntry(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadChangelog = usePublicApi
      ? fetchPublicPublishedChangelog(app.id, selectedVersion)
      : fetchPublishedChangelog(app.id, selectedVersion);

    loadChangelog
      .then((data) => {
        if (cancelled) return;
        setPublished(data.published);
        setEntry(data.entry);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load changelog");
        setPublished(false);
        setEntry(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [app.id, selectedVersion, usePublicApi]);

  const manageUrl = `/changelog?appId=${encodeURIComponent(app.id)}&accountId=${encodeURIComponent(app.accountId || "")}`;
  const showManage = isAdmin && isLoggedIn() && !isPublicView;

  return (
    <div style={{ animation: "asc-slidein 0.3s ease backwards" }}>
      <div className={`sticky top-0 z-10 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border ${isMobile ? "px-3 py-3" : "px-7 py-3"}`}>
        <div className="flex items-center gap-3">
          {!isPublicView && (
            <>
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-1.5 text-accent text-sm font-medium bg-transparent border-none cursor-pointer font-sans px-0"
              >
                <span className="text-lg leading-none">{"\u2039"}</span>
                {app.name}
              </button>
              <span className="text-dark-phantom text-sm">/</span>
            </>
          )}
          <span className="text-sm text-dark-dim font-medium">Changelog</span>
        </div>
      </div>

      <div className={isMobile ? "px-3 pt-5 pb-10" : "px-7 pt-6 pb-16 max-w-[960px]"}>
        <div className="flex items-center gap-4 mb-6">
          <AppIcon app={app} size={48} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-dark-text m-0 leading-tight">Changelog</h1>
            <div className="text-[12px] text-dark-dim mt-0.5">{app.name}</div>
            {app.bundleId && (
              <div className="text-[11px] text-dark-dim font-mono mt-0.5">{app.bundleId}</div>
            )}
          </div>
          {showManage && (
            <a
              href={manageUrl}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold bg-dark-surface text-dark-label border border-dark-border-light no-underline shrink-0"
            >
              Manage
            </a>
          )}
        </div>

        <div className="bg-dark-surface rounded-[10px] px-4 py-4 mb-4">
          <label htmlFor="changelog-version" className="block text-[10px] text-dark-dim font-bold uppercase tracking-wide mb-2">
            Version
          </label>
          <select
            id="changelog-version"
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="w-full max-w-xs px-3 py-2 bg-dark-bg border border-dark-border-light rounded-lg text-[13px] text-dark-text font-sans"
          >
            {versionOptions.map((v) => (
              <option key={v} value={v}>v{v}</option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="text-center px-5 py-16 text-dark-dim">
            <div className="text-[28px] mb-3 inline-block" style={{ animation: "asc-spin 1s linear infinite" }}>
              {"\u21bb"}
            </div>
            <div className="text-sm font-semibold">Loading changelog...</div>
          </div>
        )}

        {error && !loading && (
          <div className="text-center px-5 py-16 text-danger">
            <div className="text-sm font-semibold mb-2">Failed to load changelog</div>
            <div className="text-xs text-dark-dim max-w-[400px] mx-auto">{error}</div>
          </div>
        )}

        {!loading && !error && !published && (
          <div className="bg-dark-surface rounded-[10px] px-4 py-8 text-center">
            <p className="text-[13px] text-dark-dim m-0">
              No changelog published for v{selectedVersion} yet.
            </p>
          </div>
        )}

        {!loading && !error && published && entry && (
          <div className="bg-dark-surface rounded-[10px] px-4 py-4">
            {entry.publishedAt && (
              <p className="text-[11px] text-dark-dim m-0 mb-3">
                {`Published ${new Date(entry.publishedAt).toLocaleString()}`}
                {entry.baseBranch && entry.headBranch && ` · ${entry.baseBranch} → ${entry.headBranch}`}
              </p>
            )}
            <pre className="text-[13px] text-dark-text leading-relaxed m-0 whitespace-pre-wrap font-sans">
              {entry.text}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
