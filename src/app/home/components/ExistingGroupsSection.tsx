import Link from "next/link";
import { PaginationControls } from "../../../components/ui/PaginationControls";
import { StatusBanner } from "../../../components/ui/StatusBanner";
import { getGroupMembersCount } from "../groupFilters";
import type { Group } from "../types";

type GroupsSort =
  | "name,asc"
  | "name,desc"
  | "memberCount,asc"
  | "memberCount,desc";

export function ExistingGroupsSection({
  groupFilterInput,
  groupFilterApplied,
  loadingGroups,
  groupsError,
  filteredGroups,
  groupsTotalItems,
  groupsPage,
  groupsTotalPages,
  groupsPageSize,
  groupsSort,
  serverFilterApplied,
  editingGroupId,
  editingGroupName,
  savingGroupId,
  renameError,
  setGroupFilterInput,
  setGroupFilterApplied,
  setGroupsPageSize,
  setGroupsSort,
  setEditingGroupName,
  onReload,
  onSaveGroupName,
  onStartEditing,
  onCancelEditing,
}: {
  groupFilterInput: string;
  groupFilterApplied: string;
  loadingGroups: boolean;
  groupsError: string | null;
  filteredGroups: Group[];
  groupsTotalItems: number;
  groupsPage: number;
  groupsTotalPages: number;
  groupsPageSize: number;
  groupsSort: GroupsSort;
  serverFilterApplied: boolean;
  editingGroupId: number | null;
  editingGroupName: string;
  savingGroupId: number | null;
  renameError: string | null;
  setGroupFilterInput: (value: string) => void;
  setGroupFilterApplied: (value: string) => void;
  setGroupsPageSize: (size: number) => void;
  setGroupsSort: (sort: GroupsSort) => void;
  setEditingGroupName: (name: string) => void;
  onReload: (page: number) => void;
  onSaveGroupName: (groupId: number) => void;
  onStartEditing: (group: Group) => void;
  onCancelEditing: () => void;
}) {
  return (
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
      </div>

      {loadingGroups && <StatusBanner variant="loading" message="Loading groups..." />}
      {groupsError && (
        <StatusBanner
          variant="error"
          message={groupsError}
          onRetry={() => onReload(1)}
        />
      )}
      {!loadingGroups && !groupsError && groupFilterApplied && !serverFilterApplied && (
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
          <div className="mt-3 grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2 text-xs uppercase tracking-wide text-gray-500">
            <div className="flex items-center gap-1">
              <span>Name</span>
              <button
                className={`rounded border px-1 leading-none ${groupsSort === "name,asc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => setGroupsSort("name,asc")}
                disabled={loadingGroups}
                aria-label="Sort name ascending"
              >
                ▲
              </button>
              <button
                className={`rounded border px-1 leading-none ${groupsSort === "name,desc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => setGroupsSort("name,desc")}
                disabled={loadingGroups}
                aria-label="Sort name descending"
              >
                ▼
              </button>
            </div>
            <div className="flex items-center justify-end gap-1">
              <span>Members</span>
              <button
                className={`rounded border px-1 leading-none ${groupsSort === "memberCount,asc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => setGroupsSort("memberCount,asc")}
                disabled={loadingGroups}
                aria-label="Sort members ascending"
              >
                ▲
              </button>
              <button
                className={`rounded border px-1 leading-none ${groupsSort === "memberCount,desc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => setGroupsSort("memberCount,desc")}
                disabled={loadingGroups}
                aria-label="Sort members descending"
              >
                ▼
              </button>
            </div>
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
                        onClick={() => onSaveGroupName(group.id)}
                        disabled={savingGroupId === group.id || !editingGroupName.trim()}
                        className="rounded-xl border px-4 py-2 disabled:opacity-50"
                      >
                        {savingGroupId === group.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={onCancelEditing}
                        disabled={savingGroupId === group.id}
                        className="rounded-xl border px-4 py-2 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                    <Link className="underline" href={`/groups/${group.id}`}>
                      {group.name?.trim() ? group.name : `Group #${group.id}`}
                    </Link>
                    <span className="text-sm text-gray-600">{getGroupMembersCount(group) ?? "—"}</span>
                    <button onClick={() => onStartEditing(group)} className="text-sm underline">
                      Rename
                    </button>
                  </div>
                )}
                {editingGroupId === group.id && renameError && (
                  <StatusBanner
                    variant="error"
                    message={renameError}
                    onRetry={() => onSaveGroupName(group.id)}
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
                onChange={(e) => setGroupsPageSize(Number(e.target.value))}
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
              onPageChange={onReload}
            />
          </div>
        </div>
      )}
    </div>
  );
}
