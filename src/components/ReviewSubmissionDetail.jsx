import { useState, useEffect } from "react";
import { fetchReviewSubmissionDetail, fetchResolutionCenter } from "../api/index.js";
import { ReviewStatus, formatDate } from "./AppReviewSection.jsx";
import AppIcon from "./AppIcon.jsx";

const ITEM_STATE_DISPLAY = {
  READY_FOR_REVIEW: "Ready for Review",
  ACCEPTED: "Accepted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REMOVED: "Removed",
};

const ITEM_STATE_COLORS = {
  "Ready for Review": "#ff9f0a",
  Accepted: "#30d158",
  Approved: "#30d158",
  Rejected: "#ff453a",
  Removed: "#8e8e93",
};

const ITEM_TYPE_LABELS = {
  appStoreVersion: "App Store Version",
  appCustomProductPage: "Custom Product Page",
  appStoreVersionExperiment: "Product Page Experiment",
  appEvent: "App Event",
};

function DetailRow({ label, children }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <span className="text-[12px] text-dark-dim w-[140px] shrink-0">{label}</span>
      <span className="text-[13px] text-dark-text">{children}</span>
    </div>
  );
}

function RejectionReasons({ rejections }) {
  if (!rejections?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {rejections.map((rejection) => (
        <div key={rejection.id} className="rounded-lg border border-dark-border bg-dark-bg/50 p-3">
          {rejection.reasons?.map((reason, idx) => (
            <div key={idx} className="text-[12px] text-dark-text">
              {reason.reasonSection && (
                <span className="font-semibold text-accent">{reason.reasonSection}</span>
              )}
              {reason.reasonCode && (
                <span className="text-dark-dim ml-2">({reason.reasonCode})</span>
              )}
              {reason.reasonDescription && (
                <p className="mt-1 text-dark-dim m-0">{reason.reasonDescription}</p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ResolutionCenterSection({ rcState }) {
  const { loading, data, error } = rcState;

  if (loading) {
    return (
      <div className="bg-dark-surface rounded-[10px] px-4 py-6 text-center">
        <span className="text-[12px] text-dark-dim">Loading Resolution Center messages...</span>
      </div>
    );
  }

  if (error?.code === "WEB_SESSION_REQUIRED") {
    return (
      <div className="bg-dark-surface rounded-[10px] p-5">
        <h3 className="text-[12px] font-bold text-dark-text uppercase tracking-wide mb-2">
          Resolution Center
        </h3>
        <p className="text-[13px] text-dark-dim m-0">
          No Apple ID web session is linked for this ASC account. An admin can link one in{" "}
          <a href="/admin" className="text-accent">Admin</a>.
        </p>
      </div>
    );
  }

  if (error?.code === "WEB_SESSION_EXPIRED") {
    return (
      <div className="bg-dark-surface rounded-[10px] p-5">
        <h3 className="text-[12px] font-bold text-dark-text uppercase tracking-wide mb-2">
          Resolution Center
        </h3>
        <p className="text-[13px] text-dark-dim m-0">
          The Apple ID web session has expired. An admin must re-link the account in{" "}
          <a href="/admin" className="text-accent">Admin</a>.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-dark-surface rounded-[10px] p-5">
        <h3 className="text-[12px] font-bold text-dark-text uppercase tracking-wide mb-2">
          Resolution Center
        </h3>
        <p className="text-[13px] text-dark-dim m-0">
          {error.message || "Failed to load Resolution Center messages."}
        </p>
      </div>
    );
  }

  const threads = data?.threads || [];
  if (!threads.length) {
    return (
      <div className="bg-dark-surface rounded-[10px] p-5">
        <h3 className="text-[12px] font-bold text-dark-text uppercase tracking-wide mb-2">
          Resolution Center
        </h3>
        <p className="text-[13px] text-dark-dim m-0">No messages in the Resolution Center for this submission.</p>
      </div>
    );
  }

  const allMessages = threads
    .flatMap((thread) =>
      (thread.messages || []).map((msg) => ({ ...msg, threadType: thread.threadType }))
    )
    .sort((a, b) => new Date(a.createdDate) - new Date(b.createdDate));

  return (
    <div className="bg-dark-surface rounded-[10px] p-5">
      <h3 className="text-[12px] font-bold text-dark-text uppercase tracking-wide mb-1">
        Resolution Center
      </h3>
      <p className="text-[12px] text-dark-dim mb-4 mt-0">
        Messages from App Review (via linked Apple ID web session).
      </p>
      <div className="space-y-4">
        {allMessages.map((msg) => (
          <div key={msg.id} className="border border-dark-border rounded-lg p-4">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-[13px] font-semibold text-dark-text">
                {msg.fromActor?.name || "App Review"}
              </span>
              <span className="text-[11px] text-dark-dim shrink-0">{formatDate(msg.createdDate)}</span>
            </div>
            <p className="text-[13px] text-dark-text m-0 whitespace-pre-wrap leading-relaxed">
              {msg.messageBodyPlain || msg.messageBody || "\u2014"}
            </p>
            <RejectionReasons rejections={msg.rejections} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewSubmissionDetail({ app, submissionId, isMobile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rcState, setRcState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRcState({ loading: true, data: null, error: null });

    fetchReviewSubmissionDetail(app.id, submissionId, app.accountId)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    fetchResolutionCenter(app.id, submissionId, app.accountId)
      .then((result) => { if (!cancelled) setRcState({ loading: false, data: result, error: null }); })
      .catch((err) => {
        if (!cancelled) {
          setRcState({
            loading: false,
            data: null,
            error: { message: err.message, code: err.code, status: err.status },
          });
        }
      });

    return () => { cancelled = true; };
  }, [app.id, submissionId, app.accountId]);

  return (
    <div style={{ animation: "asc-slidein 0.3s ease backwards" }}>
      <div className={`sticky top-0 z-10 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border ${isMobile ? "px-3 py-3" : "px-7 py-3"}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-accent text-sm font-medium bg-transparent border-none cursor-pointer font-sans px-0"
          >
            <span className="text-lg leading-none">{"\u2039"}</span>
            {app.name}
          </button>
        </div>
      </div>

      <div className={`${isMobile ? "px-3 py-4" : "px-7 py-5"} max-w-4xl`}>
        <div className="flex items-center gap-4 mb-6">
          <AppIcon app={app} size={48} />
          <div>
            <h1 className="text-[18px] font-bold text-dark-text m-0 leading-tight">Review Submission</h1>
            <p className="text-[13px] text-dark-dim m-0 mt-0.5">
              {data ? data.versions : "Loading..."}
            </p>
          </div>
          {data && (
            <div className="ml-auto">
              <ReviewStatus status={data.displayStatus} />
            </div>
          )}
        </div>

        {loading && (
          <div className="bg-dark-surface rounded-[10px] px-4 py-8 text-center">
            <span className="text-[12px] text-dark-dim">Loading submission details...</span>
          </div>
        )}

        {error && (
          <div className="bg-dark-surface rounded-[10px] px-4 py-8 text-center">
            <span className="text-[12px] text-dark-dim">Failed to load submission details.</span>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="bg-dark-surface rounded-[10px] p-5">
              <h3 className="text-[12px] font-bold text-dark-text uppercase tracking-wide mb-3">Details</h3>
              <DetailRow label="Status"><ReviewStatus status={data.displayStatus} /></DetailRow>
              <DetailRow label="Date Submitted">{formatDate(data.submittedDate)}</DetailRow>
              <DetailRow label="Platform">{data.platform || "Unknown"}</DetailRow>
              <DetailRow label="Versions">{data.versions}</DetailRow>
              {data.submittedBy && <DetailRow label="Submitted By">{data.submittedBy}</DetailRow>}
              {data.lastUpdatedBy && <DetailRow label="Last Updated By">{data.lastUpdatedBy}</DetailRow>}
            </div>

            {data.items && data.items.length > 0 && (
              <div className="bg-dark-surface rounded-[10px] p-5">
                <h3 className="text-[12px] font-bold text-dark-text uppercase tracking-wide mb-3">
                  Submission Items ({data.items.length})
                </h3>
                <div className="rounded-lg overflow-hidden border border-dark-border">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-dark-border">
                        <th className="text-[10px] font-bold text-dark-dim uppercase tracking-wide px-4 py-2.5">Type</th>
                        <th className="text-[10px] font-bold text-dark-dim uppercase tracking-wide px-4 py-2.5">Version</th>
                        <th className="text-[10px] font-bold text-dark-dim uppercase tracking-wide px-4 py-2.5">Platform</th>
                        <th className="text-[10px] font-bold text-dark-dim uppercase tracking-wide px-4 py-2.5">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item) => {
                        const displayState = ITEM_STATE_DISPLAY[item.state] || item.displayState || item.state;
                        const stateColor = ITEM_STATE_COLORS[displayState] || "#8e8e93";
                        return (
                          <tr key={item.id} className="border-b border-dark-border last:border-b-0">
                            <td className="px-4 py-3 text-[13px] text-dark-text">
                              {ITEM_TYPE_LABELS[item.type] || item.type}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-dark-text">
                              {item.versionString || "\u2014"}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-dark-text">
                              {item.platform || "\u2014"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                                <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: stateColor }} />
                                <span style={{ color: stateColor }}>{displayState}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <ResolutionCenterSection rcState={rcState} />
          </div>
        )}
      </div>
    </div>
  );
}
