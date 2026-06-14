const ITEMS = [
  { id: "sales", label: "Sales" },
  { id: "downloads", label: "Downloads" },
];

export default function AnalyticsSidebar({ active, onSelect, isMobile }) {
  if (isMobile) {
    return (
      <div className="flex gap-1 overflow-x-auto pb-3 border-b border-dark-border mb-4 -mx-1 px-1">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border-none cursor-pointer font-sans ${
              active === item.id
                ? "bg-accent text-white"
                : "bg-dark-surface text-dark-dim border border-dark-border"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <nav className="w-[140px] shrink-0 border-r border-dark-border pr-4 pt-1">
      <ul className="list-none m-0 p-0 space-y-0.5">
        {ITEMS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-[13px] border-none font-sans cursor-pointer transition-colors ${
                active === item.id
                  ? "bg-dark-hover text-dark-text font-medium"
                  : "bg-transparent text-dark-dim hover:bg-dark-hover/60 hover:text-dark-text"
              }`}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
