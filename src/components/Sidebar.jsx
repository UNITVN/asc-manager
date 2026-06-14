import { STATUS_MAP } from "../constants/index.js";
import { getStatus } from "../utils/index.js";

const GROUP_OPTIONS = [
  { key: "none", label: "None" },
  { key: "status", label: "Status" },
  { key: "account", label: "Account" },
];

export default function Sidebar({
  isMobile,
  sidebarOpen,
  setSidebarOpen,
  filterStatusSet,
  setFilterStatusSet,
  filterAccountSet,
  setFilterAccountSet,
  groupBy,
  setGroupBy,
  accounts,
  apps,
  closeSidebarOnMobile,
  onShowAdd,
  isAdmin,
}) {
  const presentStatuses = Object.keys(STATUS_MAP).filter((s) =>
    apps.some((a) => a.status === s)
  );

  function toggleStatus(status) {
    setFilterStatusSet((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function toggleAccount(accountName) {
    setFilterAccountSet((prev) => {
      const next = new Set(prev);
      if (next.has(accountName)) next.delete(accountName);
      else next.add(accountName);
      return next;
    });
  }

  return (
    <div
      className="bg-dark-sidebar border-r border-dark-border flex flex-col shrink-0 overflow-hidden"
      style={
        isMobile
          ? {
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              zIndex: 51,
              width: 280,
              transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
            }
          : {
              width: sidebarOpen ? 256 : 0,
              transition: "width 0.25s ease",
            }
      }
    >
      {/* Logo */}
      <div className="px-[18px] pt-[18px] pb-3.5 border-b border-dark-border flex items-center gap-2.5 min-w-[240px]">
        <div className="w-[34px] h-[34px] rounded-[9px] bg-gradient-to-br from-accent to-purple flex items-center justify-center text-[17px] font-extrabold text-white">
          A
        </div>
        <div>
          <div className="text-sm font-extrabold tracking-tight">ASC Manager</div>
          <div className="text-[10px] text-dark-ghost font-semibold">
            {__APP_TITLE__ === "ASC Manager" ? "Multi-Account Hub" : __APP_TITLE__.replace("ASC Manager \u2014 ", "")}
          </div>
        </div>
        {isMobile && (
          <span
            onClick={() => setSidebarOpen(false)}
            className="ml-auto cursor-pointer text-dark-dim text-lg px-2 py-1"
          >
            {"\u2715"}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-2 py-2.5 flex-1 overflow-y-auto min-w-[240px]">
        {/* Group By */}
        <div className="text-[9.5px] font-bold tracking-[0.1em] uppercase text-dark-ghost px-3 pt-3.5 pb-1.5">
          Group By
        </div>
        <div className="flex gap-1 px-2 pb-2">
          {GROUP_OPTIONS.map((opt) => {
            const active = groupBy === opt.key;
            return (
              <span
                key={opt.key}
                onClick={() => setGroupBy(opt.key)}
                className={`px-3 py-[5px] rounded-[20px] text-[11.5px] font-semibold cursor-pointer transition-all whitespace-nowrap ${
                  active
                    ? "border border-accent-border bg-accent-bg text-accent-light"
                    : "border border-dark-border bg-transparent text-dark-faint"
                }`}
              >
                {opt.label}
              </span>
            );
          })}
        </div>

        {/* Status filter */}
        <div className="flex items-center justify-between px-3 pt-4 pb-1.5">
          <span className="text-[9.5px] font-bold tracking-[0.1em] uppercase text-dark-ghost">
            Status
          </span>
          {filterStatusSet.size > 0 && (
            <span
              onClick={() => setFilterStatusSet(new Set())}
              className="text-[10px] text-accent cursor-pointer font-semibold"
            >
              Clear
            </span>
          )}
        </div>
        {presentStatuses.map((st) => {
          const active = filterStatusSet.has(st);
          const count = apps.filter((a) => a.status === st).length;
          const { label, color } = getStatus(st);
          return (
            <div
              key={st}
              onClick={() => toggleStatus(st)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-[13px] font-medium transition-all ${
                active
                  ? "bg-accent-bg text-accent-light border border-accent-border"
                  : "text-dark-muted border border-transparent"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: color, opacity: active ? 1 : 0.4 }}
              />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
              <span className={`ml-auto text-[11px] font-bold font-mono ${active ? "text-accent-light" : "text-dark-phantom"}`}>
                {count}
              </span>
            </div>
          );
        })}

        {/* Account filter */}
        <div className="flex items-center justify-between px-3 pt-5 pb-1.5">
          <span className="text-[9.5px] font-bold tracking-[0.1em] uppercase text-dark-ghost">
            Accounts
          </span>
          {filterAccountSet.size > 0 && (
            <span
              onClick={() => setFilterAccountSet(new Set())}
              className="text-[10px] text-accent cursor-pointer font-semibold"
            >
              Clear
            </span>
          )}
        </div>
        {accounts.map((acc) => {
          const active = filterAccountSet.has(acc.name);
          const count = apps.filter((a) => a.account === acc.name).length;
          return (
            <div
              key={acc.id}
              onClick={() => toggleAccount(acc.name)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-[13px] font-medium transition-all ${
                active
                  ? "bg-accent-bg text-accent-light border border-accent-border"
                  : "text-dark-muted border border-transparent"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: acc.color, opacity: active ? 1 : 0.4 }}
              />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">{acc.name}</span>
              <span className={`ml-auto text-[11px] font-bold font-mono ${active ? "text-accent-light" : "text-dark-phantom"}`}>
                {count}
              </span>
            </div>
          );
        })}

        <div
          onClick={() => { onShowAdd(); closeSidebarOnMobile(); }}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer text-[13px] font-semibold text-accent mt-1"
        >
          <span className="text-base w-5 text-center">+</span>
          Add Account
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-dark-border min-w-[240px]">
        {isAdmin && (
          <a
            href="/admin"
            className="block text-center text-[11px] font-semibold text-accent no-underline mb-2 hover:brightness-110"
          >
            Admin
          </a>
        )}
        <div className="text-[10px] text-dark-phantom text-center leading-relaxed">
          App Store Connect API v2<br />
          {accounts.length} account{accounts.length !== 1 ? "s" : ""} connected
        </div>
      </div>
    </div>
  );
}
