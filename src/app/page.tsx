"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

type CreateGroupResponse = {
  id: number;
  name?: string;
};

type Group = {
  id: number;
  name?: string;
};

type PaginatedResponse<T> = {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

type BannerVariant = "loading" | "empty" | "error" | "info";

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
  const [groupName, setGroupName] = useState("");
  const [createdGroupId, setCreatedGroupId] = useState<number | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
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

  async function loadGroups() {
    setGroupsError(null);
    setLoadingGroups(true);
    try {
      const res = await api<PaginatedResponse<Group>>("/groups");
      setGroups(res.items ?? []);
    } catch (e: unknown) {
      setGroupsError(e instanceof Error ? e.message : "Failed to load groups");
    } finally {
      setLoadingGroups(false);
    }
  }

  useEffect(() => {
    void loadGroups();
    void loadStatus();
  }, []);

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
    try {
      const res = await api<CreateGroupResponse>("/groups", {
        method: "POST",
        body: JSON.stringify({ name: groupName }),
      });
      setCreatedGroupId(res.id);
      setGroupName("");
      await loadGroups();
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
      await loadGroups();
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

        {createdGroupId !== null && (
          <div className="mt-4 text-sm">
            Created group:{" "}
            <a className="underline" href={`/groups/${createdGroupId}`}>
              Open group #{createdGroupId}
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
        {!loadingGroups && !groupsError && groups.length === 0 && (
          <StatusBanner variant="empty" message="No groups yet." />
        )}
        {!loadingGroups && !groupsError && groups.length > 0 && (
          <ul className="mt-3 space-y-2">
            {groups.map((group) => (
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
                  <div className="flex items-center justify-between gap-2">
                    <a className="underline" href={`/groups/${group.id}`}>
                      {group.name?.trim()
                        ? group.name
                        : `Group #${group.id}`}
                    </a>
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
        )}
      </div>
    </main>
  );
}
