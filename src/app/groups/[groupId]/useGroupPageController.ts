"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "../../../lib/api";
import type { PaginatedResponse } from "../../../lib/pagination";
import {
  buildMemberValueMap,
  formatAmount,
  formatContributionDescription,
  formatMoney,
  getLedgerExplanationEntries,
  getMemberName,
  getShortTimeZoneLabel,
  getTransferKey,
  toApiPage,
  toUiPage,
} from "./groupPageUtils";
import type {
  ConfirmedTransfer,
  EventResponse,
  Expense,
  GroupResponse,
  GroupTab,
  LedgerEntry,
  LedgerExplanationResponse,
  Member,
  SettlementTransfer,
} from "./types";

export function useGroupPageController() {
  const defaultPageSize = 10;
  const defaultListSort = "createdAt,desc";
  const pathname = usePathname();
  const groupId = useMemo(() => {
    if (!pathname) return NaN;
    const parts = pathname.split("/").filter(Boolean);
    return Number(parts[1]);
  }, [pathname]);
  const currentUserStorageKey = useMemo(
    () =>
      Number.isFinite(groupId)
        ? `fairshare:group:${groupId}:current-user-id`
        : "",
    [groupId],
  );

  const [members, setMembers] = useState<Member[]>([]);
  const [userName, setUserName] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [savingGroupName, setSavingGroupName] = useState(false);
  const [renameGroupError, setRenameGroupError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesPage, setExpensesPage] = useState(1);
  const [expensesPageSize, setExpensesPageSize] = useState(defaultPageSize);
  const [expensesTotalPages, setExpensesTotalPages] = useState(1);
  const [expensesTotalItems, setExpensesTotalItems] = useState(0);
  const [expensesSort, setExpensesSort] = useState(defaultListSort);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [paidByUserId, setPaidByUserId] = useState<number | "">("");
  const [splitMode, setSplitMode] = useState<
    "equal" | "exact" | "percentage" | "shares"
  >("equal");
  const [exactAmounts, setExactAmounts] = useState<Record<number, string>>({});
  const [percentages, setPercentages] = useState<Record<number, string>>({});
  const [shares, setShares] = useState<Record<number, string>>({});

  const [settlements, setSettlements] = useState<SettlementTransfer[]>([]);
  const [addingExpense, setAddingExpense] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [settlementsError, setSettlementsError] = useState<string | null>(null);
  const [addExpenseError, setAddExpenseError] = useState<string | null>(null);
  const [confirmationId, setConfirmationId] = useState("");
  const [confirmationIdError, setConfirmationIdError] = useState<string | null>(
    null,
  );
  const [paidTransfers, setPaidTransfers] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmingTransfers, setConfirmingTransfers] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmTransferError, setConfirmTransferError] = useState<
    string | null
  >(null);

  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState<string>("");
  const [editPaidByUserId, setEditPaidByUserId] = useState<number | "">("");
  const [editSplitMode, setEditSplitMode] = useState<
    "equal" | "exact" | "percentage" | "shares"
  >("equal");
  const [editExactAmounts, setEditExactAmounts] = useState<
    Record<number, string>
  >({});
  const [editPercentages, setEditPercentages] = useState<
    Record<number, string>
  >({});
  const [editShares, setEditShares] = useState<Record<number, string>>({});
  const [updatingExpense, setUpdatingExpense] = useState(false);
  const [updateExpenseError, setUpdateExpenseError] = useState<string | null>(
    null,
  );
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(
    null,
  );
  const [deleteExpenseError, setDeleteExpenseError] = useState<string | null>(
    null,
  );

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledgerExplanation, setLedgerExplanation] =
    useState<LedgerExplanationResponse | null>(null);
  const [loadingLedgerExplanation, setLoadingLedgerExplanation] =
    useState(false);
  const [ledgerExplanationError, setLedgerExplanationError] = useState<
    string | null
  >(null);
  const [currentUserId, setCurrentUserId] = useState<number | "">("");
  const [selectedLedgerExplanationUserId, setSelectedLedgerExplanationUserId] =
    useState<number | "">("");

  const [events, setEvents] = useState<EventResponse[]>([]);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPageSize, setEventsPageSize] = useState(defaultPageSize);
  const [eventsTotalPages, setEventsTotalPages] = useState(1);
  const [eventsTotalItems, setEventsTotalItems] = useState(0);
  const [eventsSort, setEventsSort] = useState(defaultListSort);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [confirmedTransfers, setConfirmedTransfers] = useState<
    ConfirmedTransfer[]
  >([]);
  const [confirmedTransfersPage, setConfirmedTransfersPage] = useState(1);
  const [confirmedTransfersPageSize, setConfirmedTransfersPageSize] =
    useState(defaultPageSize);
  const [confirmedTransfersTotalPages, setConfirmedTransfersTotalPages] =
    useState(1);
  const [confirmedTransfersTotalItems, setConfirmedTransfersTotalItems] =
    useState(0);
  const [confirmedTransfersSort, setConfirmedTransfersSort] =
    useState(defaultListSort);
  const [loadingConfirmedTransfers, setLoadingConfirmedTransfers] =
    useState(false);
  const [confirmedTransfersError, setConfirmedTransfersError] = useState<
    string | null
  >(null);
  const [confirmedFilter, setConfirmedFilter] = useState("");

  const [owesFromUserId, setOwesFromUserId] = useState<number | "">("");
  const [owesToUserId, setOwesToUserId] = useState<number | "">("");
  const [owesAmount, setOwesAmount] = useState<number | null>(null);
  const [owesHistoricalAmount, setOwesHistoricalAmount] = useState<
    number | null
  >(null);
  const [owesView, setOwesView] = useState<"current" | "historical" | null>(
    null,
  );
  const [loadingOwes, setLoadingOwes] = useState(false);
  const [owesError, setOwesError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GroupTab>("members");

  const cardClassName =
    "rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur";
  const tabs: Array<{ key: GroupTab; label: string }> = [
    { key: "members", label: "Members" },
    { key: "expenses", label: "Expenses" },
    { key: "settle", label: "Settle" },
    { key: "explain", label: "Explain" },
    { key: "history", label: "History" },
  ];

  function getSectionClass(tab: GroupTab) {
    return activeTab === tab ? cardClassName : `${cardClassName} hidden`;
  }

  const memberNameById = useMemo(
    () =>
      new Map(members.map((member) => [member.id, getMemberName(member)] as const)),
    [members],
  );

  async function confirmPaidTransfer(transfer: SettlementTransfer) {
    const key = getTransferKey(transfer);
    if (confirmingTransfers.has(key)) return;
    const isPaid = paidTransfers.has(key);
    if (isPaid) return;

    setConfirmingTransfers((prev) => new Set(prev).add(key));
    try {
      const confirmationHeader = confirmationId.trim();
      setConfirmTransferError(null);
      await api<void>(`/groups/${groupId}/settlements/confirm`, {
        method: "POST",
        confirmationId: confirmationHeader || undefined,
        body: JSON.stringify({
          confirmationId: confirmationHeader || undefined,
          transfers: [
            {
              fromUserId: transfer.fromUserId,
              toUserId: transfer.toUserId,
              amount: transfer.amount,
            },
          ],
        }),
      });
      if (Number.isFinite(groupId)) {
        await loadSettlements(groupId);
      }
      setPaidTransfers((prev) => new Set(prev).add(key));
    } catch (e: unknown) {
      setConfirmTransferError(
        e instanceof Error ? e.message : "Failed to confirm transfer",
      );
    } finally {
      setConfirmingTransfers((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function generateConfirmationIdFromApi() {
    if (!Number.isFinite(groupId)) return;
    try {
      setConfirmationIdError(null);
      const res = await api<{ confirmationId: string }>(
        `/groups/${groupId}/api/confirmation-id`,
      );
      setConfirmationId(res?.confirmationId ?? "");
    } catch (e: unknown) {
      setConfirmationIdError(
        e instanceof Error ? e.message : "Failed to generate confirmation ID",
      );
    }
  }

  async function loadGroup(gid: number) {
    setGroupError(null);
    setMembersError(null);
    setLoadingMembers(true);
    try {
      const group = await api<GroupResponse>(`/groups/${gid}`);
      setMembers(group.members ?? []);
      setGroupName(group.name ?? null);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? (e.message ?? "Failed to load group") : String(e);
      setGroupError(message || "Failed to load group");
      setMembersError(message || "Failed to load group");
    } finally {
      setLoadingMembers(false);
    }
  }

  useEffect(() => {
    setExactAmounts((prev) => buildMemberValueMap(members, prev));
    setPercentages((prev) => buildMemberValueMap(members, prev));
    setShares((prev) => buildMemberValueMap(members, prev));
    setEditExactAmounts((prev) => buildMemberValueMap(members, prev));
    setEditPercentages((prev) => buildMemberValueMap(members, prev));
    setEditShares((prev) => buildMemberValueMap(members, prev));
  }, [members]);

  const ledgerExplanationEntries =
    getLedgerExplanationEntries(ledgerExplanation);
  const ledgerExplanationByUserId = useMemo(
    () =>
      new Map(
        ledgerExplanationEntries.map((entry) => [entry.userId, entry] as const),
      ),
    [ledgerExplanationEntries],
  );

  useEffect(() => {
    if (!currentUserStorageKey) {
      setCurrentUserId("");
      return;
    }

    try {
      const stored = window.localStorage.getItem(currentUserStorageKey);
      if (!stored) return;
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) {
        setCurrentUserId(parsed);
      }
    } catch {
      // Ignore localStorage access issues in restricted environments.
    }
  }, [currentUserStorageKey]);

  useEffect(() => {
    if (members.length === 0) {
      setCurrentUserId("");
      return;
    }

    setCurrentUserId((prev) => {
      if (prev !== "" && members.some((member) => member.id === prev)) {
        return prev;
      }
      return members[0].id;
    });
  }, [members]);

  useEffect(() => {
    if (!currentUserStorageKey || currentUserId === "") return;

    try {
      window.localStorage.setItem(currentUserStorageKey, String(currentUserId));
    } catch {
      // Ignore localStorage access issues in restricted environments.
    }
  }, [currentUserStorageKey, currentUserId]);

  useEffect(() => {
    setSelectedLedgerExplanationUserId((prev) => {
      if (ledgerExplanationEntries.length === 0) return "";
      if (
        prev !== "" &&
        ledgerExplanationEntries.some((entry) => entry.userId === prev)
      ) {
        return prev;
      }
      if (
        currentUserId !== "" &&
        ledgerExplanationEntries.some((entry) => entry.userId === currentUserId)
      ) {
        return currentUserId;
      }
      return ledgerExplanationEntries[0].userId;
    });
  }, [ledgerExplanationEntries, currentUserId]);

  async function addMember() {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    setAddMemberError(null);
    setAddingMember(true);
    try {
      await api<{ userId: number; name: string }>(
        `/groups/${groupId}/members`,
        {
          method: "POST",
          body: JSON.stringify({ name: userName }),
        },
      );
      setUserName("");
      await loadGroup(groupId);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setAddMemberError(e.message ?? "Failed to add member");
      } else {
        setAddMemberError(String(e) || "Failed to add member");
      }
    } finally {
      setAddingMember(false);
    }
  }

  async function saveGroupName() {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    const trimmedName = editingGroupName.trim();
    if (!trimmedName) {
      setRenameGroupError("Group name cannot be empty");
      return;
    }

    setRenameGroupError(null);
    setSavingGroupName(true);
    try {
      const res = await api<GroupResponse>(`/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmedName }),
      });
      setGroupName(res.name ?? trimmedName);
      setMembers(res.members ?? []);
      setEditingGroupName("");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setRenameGroupError(e.message ?? "Failed to update group");
      } else {
        setRenameGroupError(String(e) || "Failed to update group");
      }
    } finally {
      setSavingGroupName(false);
    }
  }

  const loadExpenses = useCallback(
    async function (
      gid: number,
      page = expensesPage,
      pageSize = expensesPageSize,
      sort = expensesSort,
    ) {
      setLoadingExpenses(true);
      setExpensesError(null);
      try {
        const query = new URLSearchParams({
          page: String(toApiPage(page)),
          size: String(pageSize),
          sort,
        });
        const res = await api<PaginatedResponse<Expense>>(
          `/groups/${gid}/expenses?${query.toString()}`,
        );
        setExpenses(res.items ?? []);
        setExpensesPage(
          Number.isFinite(res.currentPage) && res.currentPage >= 0
            ? toUiPage(res.currentPage)
            : page,
        );
        setExpensesTotalPages(
          Number.isFinite(res.totalPages) && res.totalPages > 0
            ? res.totalPages
            : 1,
        );
        setExpensesTotalItems(
          Number.isFinite(res.totalItems) && res.totalItems >= 0
            ? res.totalItems
            : 0,
        );
      } catch (e: unknown) {
        setExpensesError(
          e instanceof Error ? e.message : "Failed to load expenses",
        );
      } finally {
        setLoadingExpenses(false);
      }
    },
    [expensesPage, expensesPageSize, expensesSort],
  );

  async function loadSettlements(gid: number) {
    setLoadingSettlements(true);
    setSettlementsError(null);
    try {
      const res = await api<{ transfers: SettlementTransfer[] }>(
        `/groups/${gid}/settlements`,
      );
      setSettlements(res.transfers ?? []);
    } catch (e: unknown) {
      setSettlementsError(
        e instanceof Error ? e.message : "Failed to load settlements",
      );
    } finally {
      setLoadingSettlements(false);
    }
  }

  async function loadLedger(gid: number) {
    setLoadingLedger(true);
    setLedgerError(null);
    try {
      const res = await api<{ entries: LedgerEntry[] }>(
        `/groups/${gid}/ledger`,
      );
      setLedgerEntries(res.entries ?? []);
    } catch (e: unknown) {
      setLedgerError(e instanceof Error ? e.message : "Failed to load ledger");
    } finally {
      setLoadingLedger(false);
    }
  }

  async function loadLedgerExplanation(gid: number) {
    setLoadingLedgerExplanation(true);
    setLedgerExplanationError(null);
    try {
      const res = await api<LedgerExplanationResponse>(
        `/groups/${gid}/explanations/ledger`,
      );
      setLedgerExplanation(res);
    } catch (e: unknown) {
      setLedgerExplanationError(
        e instanceof Error ? e.message : "Failed to load ledger explanation",
      );
    } finally {
      setLoadingLedgerExplanation(false);
    }
  }

  const loadEvents = useCallback(
    async (
      gid: number,
      page = eventsPage,
      pageSize = eventsPageSize,
      sort = eventsSort,
    ) => {
      setLoadingEvents(true);
      setEventsError(null);
      try {
        const query = new URLSearchParams({
          page: String(toApiPage(page)),
          size: String(pageSize),
          sort,
        });
        const res = await api<PaginatedResponse<EventResponse>>(
          `/groups/${gid}/events?${query.toString()}`,
        );
        setEventsPage(
          Number.isFinite(res.currentPage) && res.currentPage >= 0
            ? toUiPage(res.currentPage)
            : page,
        );
        setEventsTotalPages(
          Number.isFinite(res.totalPages) && res.totalPages > 0
            ? res.totalPages
            : 1,
        );
        setEventsTotalItems(
          Number.isFinite(res.totalItems) && res.totalItems >= 0
            ? res.totalItems
            : 0,
        );
        setEvents(res.items ?? []);
      } catch (e: unknown) {
        setEventsError(e instanceof Error ? e.message : "Failed to load events");
      } finally {
        setLoadingEvents(false);
      }
    },
    [eventsPage, eventsPageSize, eventsSort],
  );

  async function loadConfirmedTransfers(
    gid: number,
    page = confirmedTransfersPage,
    pageSize = confirmedTransfersPageSize,
    sort = confirmedTransfersSort,
  ) {
    setLoadingConfirmedTransfers(true);
    setConfirmedTransfersError(null);
    try {
      const query = new URLSearchParams({
        page: String(toApiPage(page)),
        size: String(pageSize),
        sort,
      });
      if (confirmedFilter.trim()) {
        query.set("confirmationId", confirmedFilter.trim());
      }
      const res = await api<PaginatedResponse<ConfirmedTransfer>>(
        `/groups/${gid}/confirmed-transfers?${query.toString()}`,
      );
      setConfirmedTransfers(res.items ?? []);
      setConfirmedTransfersPage(
        Number.isFinite(res.currentPage) && res.currentPage >= 0
          ? toUiPage(res.currentPage)
          : page,
      );
      setConfirmedTransfersTotalPages(
        Number.isFinite(res.totalPages) && res.totalPages > 0
          ? res.totalPages
          : 1,
      );
      setConfirmedTransfersTotalItems(
        Number.isFinite(res.totalItems) && res.totalItems >= 0
          ? res.totalItems
          : 0,
      );
    } catch (e: unknown) {
      setConfirmedTransfersError(
        e instanceof Error ? e.message : "Failed to load confirmed transfers",
      );
    } finally {
      setLoadingConfirmedTransfers(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    loadGroup(groupId);
    loadExpenses(groupId, 1);
    loadSettlements(groupId);
    loadLedger(groupId);
    loadEvents(groupId, 1);

    setLoadingLedgerExplanation(true);
    setLedgerExplanationError(null);
    void api<LedgerExplanationResponse>(
      `/groups/${groupId}/explanations/ledger`,
    )
      .then((res) => {
        setLedgerExplanation(res);
      })
      .catch((e: unknown) => {
        setLedgerExplanationError(
          e instanceof Error ? e.message : "Failed to load ledger explanation",
        );
      })
      .finally(() => {
        setLoadingLedgerExplanation(false);
      });

    setLoadingConfirmedTransfers(true);
    setConfirmedTransfersError(null);
    void api<PaginatedResponse<ConfirmedTransfer>>(
      `/groups/${groupId}/confirmed-transfers?page=0&size=${defaultPageSize}&sort=${encodeURIComponent(defaultListSort)}`,
    )
      .then((res) => {
        setConfirmedTransfers(res.items ?? []);
        setConfirmedTransfersPage(
          Number.isFinite(res.currentPage) && res.currentPage > 0
            ? res.currentPage
            : 1,
        );
        setConfirmedTransfersTotalPages(
          Number.isFinite(res.totalPages) && res.totalPages > 0
            ? res.totalPages
            : 1,
        );
        setConfirmedTransfersTotalItems(
          Number.isFinite(res.totalItems) && res.totalItems >= 0
            ? res.totalItems
            : 0,
        );
      })
      .catch((e: unknown) => {
        setConfirmedTransfersError(
          e instanceof Error ? e.message : "Failed to load confirmed transfers",
        );
      })
      .finally(() => {
        setLoadingConfirmedTransfers(false);
      });
  }, [groupId, loadEvents, loadExpenses]);

  async function loadOwes(gid: number) {
    if (
      owesFromUserId === "" ||
      owesToUserId === "" ||
      owesFromUserId === owesToUserId
    ) {
      return;
    }
    setOwesView("current");
    setLoadingOwes(true);
    setOwesError(null);
    try {
      const res = await api<{ amount: string }>(
        `/groups/${gid}/owes?fromUserId=${owesFromUserId}&toUserId=${owesToUserId}`,
      );
      const value = Number(res.amount);
      setOwesAmount(Number.isFinite(value) ? value : 0);
    } catch (e: unknown) {
      setOwesError(e instanceof Error ? e.message : "Failed to load owes");
    } finally {
      setLoadingOwes(false);
    }
  }

  async function loadOwesHistorical(gid: number) {
    if (
      owesFromUserId === "" ||
      owesToUserId === "" ||
      owesFromUserId === owesToUserId
    ) {
      return;
    }
    setOwesView("historical");
    setLoadingOwes(true);
    setOwesError(null);
    try {
      const res = await api<{ amount: string }>(
        `/groups/${gid}/owes/historical?fromUserId=${owesFromUserId}&toUserId=${owesToUserId}`,
      );
      const value = Number(res.amount);
      setOwesHistoricalAmount(Number.isFinite(value) ? value : 0);
    } catch (e: unknown) {
      setOwesError(
        e instanceof Error ? e.message : "Failed to load historical owes",
      );
    } finally {
      setLoadingOwes(false);
    }
  }

  async function addExpense() {
    if (!Number.isFinite(groupId)) return;
    if (!desc.trim()) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (paidByUserId === "") return;

    setAddExpenseError(null);
    setAddingExpense(true);
    const participantUserIds = members.map((m) => m.id);
    if (participantUserIds.length === 0) {
      setAddingExpense(false);
      return;
    }
    const sharesList =
      splitMode === "shares"
        ? participantUserIds.map((id) => Number(shares[id] ?? ""))
        : [];
    const exactAmountNumbers =
      splitMode === "exact"
        ? participantUserIds.map((id) => Number(exactAmounts[id] ?? ""))
        : [];
    const percentageNumbers =
      splitMode === "percentage"
        ? participantUserIds.map((id) => Number(percentages[id] ?? ""))
        : [];

    if (
      splitMode === "exact" &&
      exactAmountNumbers.some((val) => !Number.isFinite(val))
    ) {
      setAddExpenseError("Enter an exact amount for each member.");
      setAddingExpense(false);
      return;
    }
    if (
      splitMode === "percentage" &&
      percentageNumbers.some((val) => !Number.isFinite(val))
    ) {
      setAddExpenseError("Enter a percentage for each member.");
      setAddingExpense(false);
      return;
    }
    if (
      splitMode === "shares" &&
      sharesList.some((val) => !Number.isFinite(val) || val < 1)
    ) {
      setAddExpenseError("Enter a share count (>= 1) for each member.");
      setAddingExpense(false);
      return;
    }
    if (splitMode === "exact") {
      const exactSum = exactAmountNumbers.reduce((sum, val) => sum + val, 0);
      if (Math.abs(exactSum - amt) > 0.01) {
        setAddExpenseError("Exact amounts must add up to the total.");
        setAddingExpense(false);
        return;
      }
    }
    if (splitMode === "percentage") {
      const percentageSum = percentageNumbers.reduce(
        (sum, val) => sum + val,
        0,
      );
      if (Math.abs(percentageSum - 100) > 0.01) {
        setAddExpenseError("Percentages must add up to 100%.");
        setAddingExpense(false);
        return;
      }
    }

    try {
      const payload: Record<string, unknown> = {
        description: desc,
        amount: formatAmount(amt),
        payerUserId: paidByUserId,
        participantUserIds,
      };
      if (splitMode === "shares") payload.shares = sharesList;
      if (splitMode === "exact") {
        payload.exactAmounts = exactAmountNumbers.map(formatAmount);
      }
      if (splitMode === "percentage") {
        payload.percentages = percentageNumbers.map(formatAmount);
      }

      await api<void>(`/groups/${groupId}/expenses`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setDesc("");
      setAmount("");
      setPaidByUserId("");
      setExactAmounts({});
      setPercentages({});
      setShares({});
      setSplitMode("equal");

      await Promise.all([
        loadExpenses(groupId),
        loadSettlements(groupId),
        loadEvents(groupId),
      ]);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setAddExpenseError(e.message ?? "Failed to add expense");
      } else {
        setAddExpenseError(String(e) || "Failed to add expense");
      }
    } finally {
      setAddingExpense(false);
    }
  }

  function startEditExpense(expense: Expense) {
    setEditingExpenseId(expense.expenseId);
    setEditDesc(expense.description ?? "");
    setEditAmount(String(expense.amount ?? ""));
    setEditPaidByUserId(expense.payerUserId ?? "");
    setEditSplitMode("equal");
    const splitSeed = (expense.splits ?? []).reduce<Record<number, string>>(
      (acc, split) => {
        acc[split.userId] = String(split.shareAmount);
        return acc;
      },
      {},
    );
    setEditExactAmounts(buildMemberValueMap(members, splitSeed));
    setEditPercentages(buildMemberValueMap(members));
    setEditShares(buildMemberValueMap(members, splitSeed));
  }

  function resetEditExpense() {
    setEditingExpenseId(null);
    setEditDesc("");
    setEditAmount("");
    setEditPaidByUserId("");
    setEditSplitMode("equal");
    setEditExactAmounts({});
    setEditPercentages({});
    setEditShares({});
  }

  async function updateExpense() {
    if (!Number.isFinite(groupId) || editingExpenseId === null) return;
    if (!editDesc.trim()) return;
    const amt = Number(editAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (editPaidByUserId === "") return;

    setUpdateExpenseError(null);
    setUpdatingExpense(true);
    const participantUserIds = members.map((m) => m.id);
    if (participantUserIds.length === 0) {
      setUpdatingExpense(false);
      return;
    }
    const sharesList =
      editSplitMode === "shares"
        ? participantUserIds.map((id) => Number(editShares[id] ?? ""))
        : [];
    const exactAmountNumbers =
      editSplitMode === "exact"
        ? participantUserIds.map((id) => Number(editExactAmounts[id] ?? ""))
        : [];
    const percentageNumbers =
      editSplitMode === "percentage"
        ? participantUserIds.map((id) => Number(editPercentages[id] ?? ""))
        : [];

    if (
      editSplitMode === "exact" &&
      exactAmountNumbers.some((val) => !Number.isFinite(val))
    ) {
      setUpdateExpenseError("Enter an exact amount for each member.");
      setUpdatingExpense(false);
      return;
    }
    if (
      editSplitMode === "percentage" &&
      percentageNumbers.some((val) => !Number.isFinite(val))
    ) {
      setUpdateExpenseError("Enter a percentage for each member.");
      setUpdatingExpense(false);
      return;
    }
    if (
      editSplitMode === "shares" &&
      sharesList.some((val) => !Number.isFinite(val) || val < 1)
    ) {
      setUpdateExpenseError("Enter a share count (>= 1) for each member.");
      setUpdatingExpense(false);
      return;
    }
    if (editSplitMode === "exact") {
      const exactSum = exactAmountNumbers.reduce((sum, val) => sum + val, 0);
      if (Math.abs(exactSum - amt) > 0.01) {
        setUpdateExpenseError("Exact amounts must add up to the total.");
        setUpdatingExpense(false);
        return;
      }
    }
    if (editSplitMode === "percentage") {
      const percentageSum = percentageNumbers.reduce(
        (sum, val) => sum + val,
        0,
      );
      if (Math.abs(percentageSum - 100) > 0.01) {
        setUpdateExpenseError("Percentages must add up to 100%.");
        setUpdatingExpense(false);
        return;
      }
    }

    try {
      const payload: Record<string, unknown> = {
        description: editDesc,
        amount: formatAmount(amt),
        payerUserId: editPaidByUserId,
        participantUserIds,
      };
      if (editSplitMode === "shares") payload.shares = sharesList;
      if (editSplitMode === "exact") {
        payload.exactAmounts = exactAmountNumbers.map(formatAmount);
      }
      if (editSplitMode === "percentage") {
        payload.percentages = percentageNumbers.map(formatAmount);
      }

      await api<void>(`/groups/${groupId}/expenses/${editingExpenseId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await Promise.all([
        loadExpenses(groupId),
        loadSettlements(groupId),
        loadEvents(groupId),
      ]);
      resetEditExpense();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setUpdateExpenseError(e.message ?? "Failed to update expense");
      } else {
        setUpdateExpenseError(String(e) || "Failed to update expense");
      }
    } finally {
      setUpdatingExpense(false);
    }
  }

  async function deleteExpense(expenseId: number) {
    if (!Number.isFinite(groupId)) return;
    setDeletingExpenseId(expenseId);
    setDeleteExpenseError(null);
    try {
      await api<void>(`/groups/${groupId}/expenses/${expenseId}`, {
        method: "DELETE",
      });
      await Promise.all([
        loadExpenses(groupId),
        loadSettlements(groupId),
        loadEvents(groupId),
      ]);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setDeleteExpenseError(e.message ?? "Failed to delete expense");
      } else {
        setDeleteExpenseError(String(e) || "Failed to delete expense");
      }
    } finally {
      setDeletingExpenseId(null);
    }
  }

  return {
    groupName,
    groupId,
    groupError,
    loadGroup,
    tabs,
    activeTab,
    setActiveTab,
    getSectionClass,
    editingGroupName,
    savingGroupName,
    renameGroupError,
    userName,
    addingMember,
    addMemberError,
    loadingMembers,
    membersError,
    members,
    setEditingGroupName,
    saveGroupName,
    setUserName,
    addMember,
    getMemberName,
    editingExpenseId,
    desc,
    amount,
    paidByUserId,
    splitMode,
    exactAmounts,
    percentages,
    shares,
    addingExpense,
    addExpenseError,
    expenses,
    expensesSort,
    expensesPage,
    expensesPageSize,
    expensesTotalPages,
    expensesTotalItems,
    loadingExpenses,
    expensesError,
    deletingExpenseId,
    deleteExpenseError,
    editDesc,
    editAmount,
    editPaidByUserId,
    editSplitMode,
    editExactAmounts,
    editPercentages,
    editShares,
    updatingExpense,
    updateExpenseError,
    setDesc,
    setAmount,
    setPaidByUserId,
    setSplitMode,
    setExactAmounts,
    setPercentages,
    setShares,
    addExpense,
    setExpensesSort,
    loadExpenses,
    startEditExpense,
    deleteExpense,
    setExpensesPageSize,
    setEditDesc,
    setEditAmount,
    setEditPaidByUserId,
    updateExpense,
    resetEditExpense,
    setEditSplitMode,
    setEditExactAmounts,
    setEditPercentages,
    setEditShares,
    settlements,
    loadingSettlements,
    settlementsError,
    confirmationId,
    confirmationIdError,
    confirmTransferError,
    paidTransfers,
    confirmingTransfers,
    ledgerEntries,
    loadingLedger,
    ledgerError,
    ledgerExplanationByUserId,
    loadingLedgerExplanation,
    owesFromUserId,
    owesToUserId,
    owesAmount,
    owesHistoricalAmount,
    owesView,
    loadingOwes,
    owesError,
    setConfirmationId,
    generateConfirmationIdFromApi,
    loadSettlements,
    confirmPaidTransfer,
    loadLedger,
    setOwesFromUserId,
    setOwesToUserId,
    loadOwes,
    loadOwesHistorical,
    ledgerExplanationError,
    loadLedgerExplanation,
    currentUserId,
    setCurrentUserId,
    selectedLedgerExplanationUserId,
    setSelectedLedgerExplanationUserId,
    ledgerExplanationEntries,
    formatMoney,
    formatContributionDescription,
    getShortTimeZoneLabel,
    memberNameById,
    confirmedTransfers,
    confirmedTransfersSort,
    confirmedTransfersPage,
    confirmedTransfersPageSize,
    confirmedTransfersTotalPages,
    confirmedTransfersTotalItems,
    loadingConfirmedTransfers,
    confirmedTransfersError,
    confirmedFilter,
    events,
    eventsSort,
    eventsPage,
    eventsPageSize,
    eventsTotalPages,
    eventsTotalItems,
    loadingEvents,
    eventsError,
    setConfirmedTransfersSort,
    loadConfirmedTransfers,
    setConfirmedFilter,
    setConfirmedTransfersPageSize,
    setEventsSort,
    loadEvents,
    setEventsPageSize,
  };
}
