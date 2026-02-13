"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type CreateGroupResponse = {
  id: number;
  name?: string;
};

type Group = {
  id: number;
  name?: string;
  memberCount?: number;
  membersCount?: number;
  totalMembers?: number;
};

type PaginatedResponse<T> = {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

type BannerVariant = "loading" | "empty" | "error" | "info";

function hasWildcardPattern(value: string) {
  return value.includes("*") || value.includes("?");
}

function wildcardToRegex(pattern: string) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^${escaped.replace(/\\\*/g, ".*").replace(/\\\?/g, ".")}$`,
    "i",
  );
}

function matchesGroupName(name: string, pattern: string) {
  const normalizedPattern = pattern.trim();
  if (!normalizedPattern) return true;
  if (hasWildcardPattern(normalizedPattern)) {
    return wildcardToRegex(normalizedPattern).test(name);
  }
  return name.toLowerCase().includes(normalizedPattern.toLowerCase());
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

function PaginationControls({
  currentPage,
  totalPages,
  loading,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={loading || currentPage <= 1}
        className="rounded-xl border px-3 py-1 disabled:opacity-50"
      >
        Previous
      </button>
      {visiblePages.map((page, index) => {
        const showLeftGap = index > 0 && visiblePages[index - 1] < page - 1;
        return (
          <span key={`page-${page}`} className="flex items-center gap-2">
            {showLeftGap && <span className="text-gray-400">…</span>}
            <button
              onClick={() => onPageChange(page)}
              disabled={loading}
              className={`rounded-xl border px-3 py-1 disabled:opacity-50 ${
                page === currentPage
                  ? "border-slate-900 bg-slate-900 font-semibold text-white ring-2 ring-slate-300"
                  : "border-slate-300 bg-white"
              }`}
            >
              {page}
            </button>
          </span>
        );
      })}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={loading || currentPage >= totalPages}
        className="rounded-xl border px-3 py-1 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

function StatusBanner({
  variant,
  message,
  onRetry,
}: {
  variant: BannerVariant;
  message: string;
  onRetry?: () => void;
}) {
  const styles = {
    loading: "border-slate-200 bg-slate-50 text-slate-700",
    empty: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
  }[variant];
  const icon = {
    loading: "⏳",
    empty: "🗂️",
    error: "⚠️",
    info: "ℹ️",
  }[variant];

  return (
    <div className={`mt-3 flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${styles}`}>
      <div className="flex items-start gap-2">
        <span aria-hidden="true">{icon}</span>
        <span>{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="text-xs underline">
          Retry
        </button>
      )}
    </div>
  );
}

export default function HomePage() {
  const [groupsPageSize, setGroupsPageSize] = useState(10);
  const [groupName, setGroupName] = useState("");
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupFilterInput, setGroupFilterInput] = useState("");
  const [groupFilterApplied, setGroupFilterApplied] = useState("");
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsTotalPages, setGroupsTotalPages] = useState(1);
  const [groupsTotalItems, setGroupsTotalItems] = useState(0);
  const [groupsSort, setGroupsSort] = useState("id,desc");
  const [serverFilterApplied, setServerFilterApplied] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [savingGroupId, setSavingGroupId] = useState<number | null>(null);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [rootStatus, setRootStatus] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const explainTransfers = [
    { from: "Ava", to: "Ben", amount: 42.5, reason: "Dinner + groceries" },
    { from: "Chen", to: "Ava", amount: 18.25, reason: "Utilities" },
    { from: "Ben", to: "Chen", amount: 7.0, reason: "Rideshare" },
  ];
  const explainBalances = [
    { name: "Ava", amount: -18.25 },
    { name: "Ben", amount: 30.75 },
    { name: "Chen", amount: -12.5 },
  ];
  const explainExpenses = [
    {
      title: "Groceries",
      total: 75.6,
      paidBy: "Ben",
      date: "Jan 12",
      splits: [
        { name: "Ava", amount: 25.2 },
        { name: "Ben", amount: 25.2 },
        { name: "Chen", amount: 25.2 },
      ],
    },
    {
      title: "Utilities",
      total: 54.75,
      paidBy: "Ava",
      date: "Jan 15",
      splits: [
        { name: "Ava", amount: 18.25 },
        { name: "Ben", amount: 18.25 },
        { name: "Chen", amount: 18.25 },
      ],
    },
    {
      title: "Rideshare",
      total: 21.0,
      paidBy: "Chen",
      date: "Jan 18",
      splits: [
        { name: "Ava", amount: 7.0 },
        { name: "Ben", amount: 7.0 },
        { name: "Chen", amount: 7.0 },
      ],
    },
  ];

  function getGroupMembersCount(group: Group) {
    if (Number.isFinite(group.memberCount)) return group.memberCount;
    if (Number.isFinite(group.membersCount)) return group.membersCount;
    if (Number.isFinite(group.totalMembers)) return group.totalMembers;
    return null;
  }

  const loadGroups = useCallback(
    async (
      page = 1,
      nameFilter = groupFilterApplied,
      pageSize = groupsPageSize,
      sort = groupsSort,
    ) => {
    setGroupsError(null);
    setLoadingGroups(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort,
      });
      if (nameFilter.trim()) query.set("name", nameFilter.trim());
      const res = await api<PaginatedResponse<Group>>(`/groups?${query.toString()}`);
      const safePage =
        Number.isFinite(res.currentPage) && res.currentPage > 0
          ? res.currentPage
          : page;
      const safeTotalPages =
        Number.isFinite(res.totalPages) && res.totalPages > 0 ? res.totalPages : 1;
      const items = res.items ?? [];

      setGroups(items);
      setGroupsPage(safePage);
      setGroupsTotalPages(
        safeTotalPages,
      );
      setGroupsTotalItems(
        Number.isFinite(res.totalItems) && res.totalItems >= 0 ? res.totalItems : 0,
      );
      if (nameFilter.trim()) {
        const normalized = nameFilter.trim();
        const backendApplied = items.every((group) =>
          matchesGroupName(group.name ?? "", normalized),
        );
        setServerFilterApplied(backendApplied);
      } else {
        setServerFilterApplied(true);
      }
    } catch (e: unknown) {
      setGroupsError(e instanceof Error ? e.message : "Failed to load groups");
    } finally {
      setLoadingGroups(false);
    }
  }, [groupFilterApplied, groupsPageSize, groupsSort]);

  const filteredGroups = useMemo(() => {
    const normalized = groupFilterApplied.trim();
    if (!normalized) return groups;
    return groups.filter((group) =>
      matchesGroupName(group.name ?? "", normalized),
    );
  }, [groups, groupFilterApplied]);

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    void loadGroups(1, groupFilterApplied);
  }, [groupFilterApplied, groupsPageSize, groupsSort, loadGroups]);

  async function loadStatus() {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const [rootRes, healthRes] = await Promise.all([
        api<Record<string, string>>("/"),
        api<Record<string, string>>("/health"),
      ]);
      setRootStatus(Object.values(rootRes ?? {}).join(" ") || "OK");
      setHealthStatus(Object.values(healthRes ?? {}).join(" ") || "OK");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Status unavailable";
      setRootStatus(message);
      setHealthStatus(message);
      setStatusError(message);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function onCreateGroup() {
    setCreateGroupError(null);
    setLoading(true);
    const trimmedName = groupName.trim();
    try {
      const res = await api<CreateGroupResponse>("/groups", {
        method: "POST",
        body: JSON.stringify({ name: groupName }),
      });
      setCreatedGroup({
        id: res.id,
        name: (res.name ?? trimmedName) || undefined,
      });
      setGroupName("");
      await loadGroups(1, groupFilterApplied);
    } catch (e: unknown) {
      if (e instanceof Error) setCreateGroupError(e.message);
      else if (typeof e === "string") setCreateGroupError(e);
      else setCreateGroupError("Failed to create group");
    } finally {
      setLoading(false);
    }
  }

  function startEditingGroup(group: Group) {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name ?? "");
  }

  async function saveGroupName(groupId: number) {
    const trimmedName = editingGroupName.trim();
    if (!trimmedName) {
      setRenameError("Group name cannot be empty");
      return;
    }

    setRenameError(null);
    setSavingGroupId(groupId);
    try {
      await api<void>(`/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmedName }),
      });
      setEditingGroupId(null);
      setEditingGroupName("");
      await loadGroups(groupsPage, groupFilterApplied);
    } catch (e: unknown) {
      setRenameError(e instanceof Error ? e.message : "Failed to update group");
    } finally {
      setSavingGroupId(null);
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold">Fairshare</h1>
      <p className="text-sm text-gray-500 mt-1">
        MVP: create a group → add members → add expenses → settlements
      </p>

      <div className="mt-6 rounded-2xl border p-4">
        <h2 className="font-medium">Create a group</h2>

        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-xl border px-3 py-2 outline-none"
            placeholder="e.g., Roommates"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <button
            onClick={onCreateGroup}
            disabled={!groupName.trim() || loading}
            className="rounded-xl border px-4 py-2 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>

        {loading && (
          <StatusBanner variant="loading" message="Creating group..." />
        )}
        {createGroupError && (
          <StatusBanner
            variant="error"
            message={createGroupError}
            onRetry={onCreateGroup}
          />
        )}

        {createdGroup !== null && (
          <div className="mt-4 text-sm">
            Created group:{" "}
            <a className="underline" href={`/groups/${createdGroup.id}`}>
              {createdGroup.name}
            </a>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">API status</h2>
          <button
            onClick={loadStatus}
            className="text-sm underline"
            disabled={loadingStatus}
          >
            {loadingStatus ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <div>Root (/): {loadingStatus ? "Loading..." : rootStatus}</div>
          <div>Health (/health): {loadingStatus ? "Loading..." : healthStatus}</div>
        </div>
        {statusError && (
          <StatusBanner
            variant="error"
            message={statusError}
            onRetry={loadStatus}
          />
        )}
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <h2 className="font-medium">Existing groups</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
            placeholder="Filter by group name (supports * and ?)"
            value={groupFilterInput}
            onChange={(e) => setGroupFilterInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setGroupFilterApplied(groupFilterInput.trim());
              }
            }}
          />
          <button
            onClick={() => setGroupFilterApplied(groupFilterInput.trim())}
            className="rounded-xl border px-4 py-2 text-sm"
            disabled={loadingGroups}
          >
            Apply
          </button>
          <button
            onClick={() => {
              setGroupFilterInput("");
              setGroupFilterApplied("");
            }}
            className="rounded-xl border px-4 py-2 text-sm"
            disabled={loadingGroups || (!groupFilterInput && !groupFilterApplied)}
          >
            Clear
          </button>
          <select
            className="rounded-xl border px-3 py-2 text-sm"
            value={groupsSort}
            onChange={(e) => setGroupsSort(e.target.value)}
            disabled={loadingGroups}
            aria-label="Sort groups"
          >
            <option value="id,desc">Newest first</option>
            <option value="id,asc">Oldest first</option>
            <option value="name,asc">Name A-Z</option>
            <option value="name,desc">Name Z-A</option>
            <option value="memberCount,desc">Most members</option>
            <option value="memberCount,asc">Fewest members</option>
          </select>
        </div>

        {loadingGroups && (
          <StatusBanner variant="loading" message="Loading groups..." />
        )}
        {groupsError && (
          <StatusBanner
            variant="error"
            message={groupsError}
            onRetry={loadGroups}
          />
        )}
        {!loadingGroups &&
          !groupsError &&
          groupFilterApplied &&
          !serverFilterApplied && (
            <StatusBanner
              variant="info"
              message={`Backend filter is not applied yet. Showing matches on the current page for "${groupFilterApplied}".`}
            />
          )}
        {!loadingGroups && !groupsError && filteredGroups.length === 0 && (
          <StatusBanner
            variant="empty"
            message={
              groupFilterApplied
                ? "No groups match this filter on the current page."
                : groupsTotalItems > 0
                  ? "No groups on this page."
                  : "No groups yet."
            }
          />
        )}
        {!loadingGroups && !groupsError && filteredGroups.length > 0 && (
          <>
            <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2 px-2 text-xs uppercase tracking-wide text-gray-500">
              <span>Name</span>
              <span>Members</span>
              <span />
            </div>
            <ul className="mt-3 space-y-2">
              {filteredGroups.map((group) => (
                <li key={group.id} className="rounded-xl border px-3 py-2">
                  {editingGroupId === group.id ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        className="flex-1 rounded-xl border px-3 py-2 outline-none"
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        placeholder="Group name"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveGroupName(group.id)}
                          disabled={
                            savingGroupId === group.id ||
                            !editingGroupName.trim()
                          }
                          className="rounded-xl border px-4 py-2 disabled:opacity-50"
                        >
                          {savingGroupId === group.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingGroupId(null);
                            setEditingGroupName("");
                          }}
                          disabled={savingGroupId === group.id}
                          className="rounded-xl border px-4 py-2 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                      <a className="underline" href={`/groups/${group.id}`}>
                        {group.name?.trim()
                          ? group.name
                          : `Group #${group.id}`}
                      </a>
                      <span className="text-sm text-gray-600">
                        {getGroupMembersCount(group) ?? "—"}
                      </span>
                      <button
                        onClick={() => startEditingGroup(group)}
                        className="text-sm underline"
                      >
                        Rename
                      </button>
                    </div>
                  )}
                  {editingGroupId === group.id && renameError && (
                    <StatusBanner
                      variant="error"
                      message={renameError}
                      onRetry={() => saveGroupName(group.id)}
                    />
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {!loadingGroups && !groupsError && groupsTotalItems > 0 && (
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <span>
              Page {groupsPage} of {groupsTotalPages} ({groupsTotalItems} groups total)
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <span>Page size</span>
                <select
                  className="rounded-xl border px-2 py-1"
                  value={groupsPageSize}
                  onChange={(e) => {
                    setGroupsPageSize(Number(e.target.value));
                  }}
                  disabled={loadingGroups}
                >
                  {[5, 10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <PaginationControls
                currentPage={groupsPage}
                totalPages={groupsTotalPages}
                loading={loadingGroups}
                onPageChange={(page) =>
                  void loadGroups(page, groupFilterApplied)
                }
              />
            </div>
          </div>
        )}
      </div>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#e0f2fe_50%,#fef9c3_100%)] p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
              Explain
            </p>
            <h2 className="font-serif text-2xl font-semibold text-slate-900">
              Why this settles the way it does
            </h2>
          </div>
          <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs text-amber-700">
            Preview data (API coming soon)
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
            <h3 className="text-sm font-semibold text-slate-900">
              Settlement transfers
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Minimal set of payments to zero out the group.
            </p>
            <ul className="mt-3 space-y-3 text-sm">
              {explainTransfers.map((transfer) => (
                <li
                  key={`${transfer.from}-${transfer.to}-${transfer.amount}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3"
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      {transfer.from} → {transfer.to}
                    </div>
                    <div className="text-xs text-slate-500">
                      {transfer.reason}
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
                    ${transfer.amount.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
            <h3 className="text-sm font-semibold text-slate-900">
              Net balances
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Positive = receives, negative = pays.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {explainBalances.map((balance) => (
                <li
                  key={balance.name}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2"
                >
                  <span className="font-medium text-slate-900">
                    {balance.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      balance.amount >= 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {balance.amount >= 0 ? "+" : "-"}$
                    {Math.abs(balance.amount).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
            <h3 className="text-sm font-semibold text-slate-900">
              Expenses + splits
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Every expense shows who paid and each share.
            </p>
            <div className="mt-3 space-y-3 text-sm">
              {explainExpenses.map((expense) => (
                <div
                  key={`${expense.title}-${expense.date}`}
                  className="rounded-xl border border-slate-100 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {expense.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        Paid by {expense.paidBy} · {expense.date}
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      ${expense.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                    {expense.splits.map((split) => (
                      <span
                        key={`${expense.title}-${split.name}`}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1"
                      >
                        {split.name} ${split.amount.toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
