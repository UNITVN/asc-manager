import { useState, useEffect } from "react";
import { fetchReviewSubmissions } from "../api/index.js";

const STATUS_COLORS = {
  "Unresolved issues": "#ff453a",
  "Review Completed": "#30d158",
  "Removed": "#8e8e93",
  "Waiting for Review": "#ff9f0a",
  "In Review": "#0a84ff",
};

const STATUS_ICONS = {
  "Review Completed": "\u2713",
  "Removed": "\u2013",
};

export function formatDate(dateString) {
  if (!dateString) return "\u2014";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ReviewStatus({ status }) {
  const color = STATUS_COLORS[status] || "#8e8e93";
  const icon = STATUS_ICONS[status];

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
      {icon ? (
        <span
          className="w-[16px] h-[16px] rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: color }}
        >
          {icon}
        </span>
      ) : (
        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: color }} />
      )}
      <span style={{ color }}>{status}</span>
    </span>
  );
}

function MessagesTable({ messages, onViewDetail }) {
  if (messages.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-[12px] font-bold text-dark-text uppercase tracking-wide mb-1">Unresolved Issues</h3>
      <p className="text-[12px] text-dark-dim mb-3 mt-0">
        Review messages with unresolved issues that require your attention.
      </p>
      <div className="bg-dark-surface rounded-[10px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-[10px] font-bold text-dark-dim uppercase tracking-wide px-4 py-2.5">Date Created</th>
                <th className="text-[10px] font-bold text-dark-dim uppercase tracking-wide px-4 py-2.5">Versions</th>
                <th className="text-[10px] font-bold text-dark-dim uppercase tracking-wide px-4 py-2.5">Grace Period Ends</th>
                <th className="text-[10px] font-bold text-dark-dim uppercase tracking-wide px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr
                  key={msg.id}
                  className="border-b border-dark-border last:border-b-0 cursor-pointer hover:bg-dark-hover transition-colors"
                  onClick={() => onViewDetail(msg.id)}
                >
                  <td className="px-4 py-3 text-[13px] text-accent font-medium whitespace-nowrap">
                    {formatDate(msg.createdDate)}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-dark-text whitespace-nowrap">{msg.versions}</td>
                  <td className="px-4 py-3 text-[13px] text-dark-dim whitespace-nowrap">
                    {msg.gracePeriodEnds ? formatDate(msg.gracePeriodEnds) : "\u2014"}
                  </td>
                  <td className="px-4 py-3"><ReviewStatus status={msg.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SubmissionsTable({ submissions, onViewDetail }) {
  if (submissions.length === 0) return null;

  return (
    <div>
      <h3 className="text-[12px] font-bold text-dark-text uppercase tracking-wide mb-1">Submissions</h3>
      <p className="text-[12px] text-dark-dim mb-3 mt-0">
        Submissions currently in review or waiting for review.
      </p>
      <div className="bg-dark-surface rounded-[10px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-[10px] font-bold text-dark-dim uppercase tracking-wide px-4 py-2.5">Date Submitted</th>
                <th className="text-[10px] font-bold text-dark-dim uppercase tracking-wide px-4 py-2.5">Versions</th>
                <th className="text-[10px] font-bold text-dark-dim uppercase tracking-wide px-4 py-2.5">Submitted By</th>
                <th className="text-[10px] font-bold text-dark-dim uppercase tracking-wide px-4 py-2.5">Items</th>
                <th className="text-[10px] font-bold text-dark-dim uppercase tracking-wide px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-dark-border last:border-b-0 cursor-pointer hover:bg-dark-hover transition-colors"
                  onClick={() => onViewDetail(sub.id)}
                >
                  <td className="px-4 py-3 text-[13px] text-accent font-medium whitespace-nowrap">
                    {formatDate(sub.submittedDate)}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-dark-text whitespace-nowrap">{sub.versions}</td>
                  <td className="px-4 py-3 text-[13px] text-dark-dim whitespace-nowrap">{sub.submittedBy}</td>
                  <td className="px-4 py-3 text-[13px] text-dark-text whitespace-nowrap">{sub.itemCount}</td>
                  <td className="px-4 py-3"><ReviewStatus status={sub.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AppReviewSection({ appId, accountId, onViewDetail }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchReviewSubmissions(appId, accountId)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [appId, accountId]);

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-[13px] font-bold text-dark-text uppercase tracking-wide mb-3">App Review</h2>
        <div className="bg-dark-surface rounded-[10px] px-4 py-6 text-center">
          <span className="text-[12px] text-dark-dim">Loading review submissions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <h2 className="text-[13px] font-bold text-dark-text uppercase tracking-wide mb-3">App Review</h2>
        <div className="bg-dark-surface rounded-[10px] px-4 py-6 text-center">
          <span className="text-[12px] text-dark-dim">Failed to load review submissions.</span>
        </div>
      </div>
    );
  }

  const hasMessages = data?.messages?.length > 0;
  const hasSubmissions = data?.submissions?.length > 0;

  if (!hasMessages && !hasSubmissions) {
    return (
      <div className="mb-8">
        <h2 className="text-[13px] font-bold text-dark-text uppercase tracking-wide mb-3">App Review</h2>
        <div className="bg-dark-surface rounded-[10px] px-4 py-6 text-center">
          <span className="text-[12px] text-dark-dim">No review submissions found.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-[13px] font-bold text-dark-text uppercase tracking-wide mb-3">App Review</h2>
      {hasMessages && <MessagesTable messages={data.messages} onViewDetail={onViewDetail} />}
      {hasSubmissions && <SubmissionsTable submissions={data.submissions} onViewDetail={onViewDetail} />}
    </div>
  );
}
