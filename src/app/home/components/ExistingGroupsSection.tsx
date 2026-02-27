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
    <section className="panel panel-tall fade-rise">
      <h2 className="section-title">Existing groups</h2>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          className="field flex-1 text-sm"
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
          className="btn btn-primary text-sm"
          disabled={loadingGroups}
        >
          Apply
        </button>
        <button
          onClick={() => {
            setGroupFilterInput("");
            setGroupFilterApplied("");
          }}
          className="btn btn-ghost text-sm"
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
          <div className="mt-4 grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-xl bg-[var(--panel-strong)] px-3 py-2 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
            <div className="flex items-center gap-1">
              <span>Name</span>
              <button
                className={`btn btn-sort ${groupsSort === "name,asc" ? "btn-sort-active" : ""}`}
                onClick={() => setGroupsSort("name,asc")}
                disabled={loadingGroups}
                aria-label="Sort name ascending"
              >
                ▲
              </button>
              <button
                className={`btn btn-sort ${groupsSort === "name,desc" ? "btn-sort-active" : ""}`}
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
                className={`btn btn-sort ${groupsSort === "memberCount,asc" ? "btn-sort-active" : ""}`}
                onClick={() => setGroupsSort("memberCount,asc")}
                disabled={loadingGroups}
                aria-label="Sort members ascending"
              >
                ▲
              </button>
              <button
                className={`btn btn-sort ${groupsSort === "memberCount,desc" ? "btn-sort-active" : ""}`}
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
              <li key={group.id} className="group-row">
                {editingGroupId === group.id ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      className="field flex-1"
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      placeholder="Group name"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSaveGroupName(group.id)}
                        disabled={savingGroupId === group.id || !editingGroupName.trim()}
                        className="btn btn-primary disabled:opacity-50"
                      >
                        {savingGroupId === group.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={onCancelEditing}
                        disabled={savingGroupId === group.id}
                        className="btn btn-ghost disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                    <Link className="link-accent" href={`/groups/${group.id}`}>
                      {group.name?.trim() ? group.name : `Group #${group.id}`}
                    </Link>
                    <span className="text-sm text-[var(--text-muted)]">{getGroupMembersCount(group) ?? "—"}</span>
                    <button onClick={() => onStartEditing(group)} className="btn btn-ghost text-sm">
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
        <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--text-muted)] lg:flex-row lg:items-center lg:justify-between">
          <span>
            Page {groupsPage} of {groupsTotalPages} ({groupsTotalItems} groups total)
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>Page size</span>
              <select
                className="field py-1"
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
    </section>
  );
}
