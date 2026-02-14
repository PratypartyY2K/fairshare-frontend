import type { GroupTab } from "../types";

export function GroupTabNav({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: Array<{ key: GroupTab; label: string }>;
  activeTab: GroupTab;
  onTabChange: (tab: GroupTab) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm backdrop-blur">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
