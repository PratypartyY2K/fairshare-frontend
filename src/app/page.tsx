"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { PaginatedResponse } from "../lib/pagination";
import {
  matchesGroupName,
  toApiPage,
  toUiPage,
} from "./home/groupFilters";
import { ApiStatusSection } from "./home/components/ApiStatusSection";
import { CreateGroupSection } from "./home/components/CreateGroupSection";
import { ExistingGroupsSection } from "./home/components/ExistingGroupsSection";
import type { CreateGroupResponse, Group } from "./home/types";

type GroupsSort =
  | "name,asc"
  | "name,desc"
  | "memberCount,asc"
  | "memberCount,desc";

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
  const [groupsSort, setGroupsSort] = useState<GroupsSort>("name,asc");
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
          page: String(toApiPage(page)),
          pageSize: String(pageSize),
          sort,
        });
        if (nameFilter.trim()) query.set("name", nameFilter.trim());
        const res = await api<PaginatedResponse<Group>>(
          `/groups?${query.toString()}`,
        );
        const normalizedPage =
          Number.isFinite(res.currentPage) && res.currentPage >= 0
            ? toUiPage(res.currentPage)
            : page;
        const safeTotalPages =
          Number.isFinite(res.totalPages) && res.totalPages > 0
            ? res.totalPages
            : 1;
        const items = res.items ?? [];

        setGroups(items);
        setGroupsPage(normalizedPage);
        setGroupsTotalPages(safeTotalPages);
        setGroupsTotalItems(
          Number.isFinite(res.totalItems) && res.totalItems >= 0
            ? res.totalItems
            : 0,
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
        setGroupsError(
          e instanceof Error ? e.message : "Failed to load groups",
        );
      } finally {
        setLoadingGroups(false);
      }
    },
    [groupFilterApplied, groupsPageSize, groupsSort],
  );

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

      <CreateGroupSection
        groupName={groupName}
        loading={loading}
        createGroupError={createGroupError}
        createdGroup={createdGroup}
        setGroupName={setGroupName}
        onCreateGroup={onCreateGroup}
      />

      <ApiStatusSection
        loadingStatus={loadingStatus}
        rootStatus={rootStatus}
        healthStatus={healthStatus}
        statusError={statusError}
        loadStatus={loadStatus}
      />

      <ExistingGroupsSection
        groupFilterInput={groupFilterInput}
        groupFilterApplied={groupFilterApplied}
        loadingGroups={loadingGroups}
        groupsError={groupsError}
        filteredGroups={filteredGroups}
        groupsTotalItems={groupsTotalItems}
        groupsPage={groupsPage}
        groupsTotalPages={groupsTotalPages}
        groupsPageSize={groupsPageSize}
        groupsSort={groupsSort}
        serverFilterApplied={serverFilterApplied}
        editingGroupId={editingGroupId}
        editingGroupName={editingGroupName}
        savingGroupId={savingGroupId}
        renameError={renameError}
        setGroupFilterInput={setGroupFilterInput}
        setGroupFilterApplied={setGroupFilterApplied}
        setGroupsPageSize={setGroupsPageSize}
        setGroupsSort={setGroupsSort}
        setEditingGroupName={setEditingGroupName}
        onReload={(page) => void loadGroups(page, groupFilterApplied)}
        onSaveGroupName={(groupId) => void saveGroupName(groupId)}
        onStartEditing={startEditingGroup}
        onCancelEditing={() => {
          setEditingGroupId(null);
          setEditingGroupName("");
        }}
      />
    </main>
  );
}
