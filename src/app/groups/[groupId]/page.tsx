"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";

type Member = {
  id: number;
  name?: string;
  userName?: string;
};

type GroupResponse = {
  id: number;
  name?: string;
  members: Member[];
};

type Split = {
  userId: number;
  shareAmount: number;
};

type Expense = {
  expenseId: number;
  groupId: number;
  description: string;
  amount: number;
  payerUserId: number;
  createdAt?: string;
  splits?: Split[];
};

type SettlementTransfer = {
  fromUserId: number;
  toUserId: number;
  amount: number;
};

type LedgerEntry = {
  userId: number;
  netBalance: number;
};

type EventResponse = {
  eventId: number;
  groupId: number;
  expenseId?: number;
  eventType: string;
  payload: string;
  createdAt: string;
};

type ConfirmedTransfer = {
  id: number;
  groupId: number;
  fromUserId: number;
  toUserId: number;
  amount: number;
  confirmationId?: string;
  createdAt: string;
};

export default function GroupPage() {
  const pathname = usePathname();
  const groupId = useMemo(() => {
    if (!pathname) return NaN;
    const parts = pathname.split("/").filter(Boolean);
    return Number(parts[1]);
  }, [pathname]);

  const [members, setMembers] = useState<Member[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [savingGroupName, setSavingGroupName] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [paidByUserId, setPaidByUserId] = useState<number | "">("");
  const [splitMode, setSplitMode] = useState<
    "equal" | "exact" | "percentage" | "shares"
  >("equal");
  const [exactAmounts, setExactAmounts] = useState<Record<number, string>>({});
  const [percentages, setPercentages] = useState<Record<number, string>>({});
  const [shares, setShares] = useState<Record<number, string>>({});
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const [settlements, setSettlements] = useState<SettlementTransfer[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [confirmationId, setConfirmationId] = useState("");
  const [paidTransfers, setPaidTransfers] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmingTransfers, setConfirmingTransfers] = useState<Set<string>>(
    () => new Set(),
  );

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
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(
    null,
  );

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [confirmedTransfers, setConfirmedTransfers] = useState<
    ConfirmedTransfer[]
  >([]);
  const [loadingConfirmedTransfers, setLoadingConfirmedTransfers] =
    useState(false);
  const [confirmedFilter, setConfirmedFilter] = useState("");

  const [owesFromUserId, setOwesFromUserId] = useState<number | "">("");
  const [owesToUserId, setOwesToUserId] = useState<number | "">("");
  const [owesAmount, setOwesAmount] = useState<number | null>(null);
  const [owesHistoricalAmount, setOwesHistoricalAmount] = useState<
    number | null
  >(null);
  const [loadingOwes, setLoadingOwes] = useState(false);

  const cardClassName =
    "rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur";

  function getMemberName(member: Member) {
    return member.name?.trim() || member.userName?.trim() || "Member";
  }

  function getTransferKey(transfer: SettlementTransfer) {
    return `${transfer.fromUserId}-${transfer.toUserId}-${transfer.amount.toFixed(2)}`;
  }

  function generateUuid() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    const bytes = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256),
    );
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return bytes
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .replace(
        /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
        "$1-$2-$3-$4-$5",
      );
  }

  function buildMemberValueMap(
    membersList: Member[],
    seed: Record<number, string> = {},
  ) {
    return membersList.reduce<Record<number, string>>((acc, member) => {
      acc[member.id] = seed[member.id] ?? "";
      return acc;
    }, {});
  }

  async function confirmPaidTransfer(transfer: SettlementTransfer) {
    const key = getTransferKey(transfer);
    if (confirmingTransfers.has(key)) return;
    const isPaid = paidTransfers.has(key);
    if (isPaid) return;

    setConfirmingTransfers((prev) => new Set(prev).add(key));
    try {
      const confirmationHeader = confirmationId.trim();
      await api<void>(`/groups/${groupId}/settlements/confirm`, {
        method: "POST",
        headers: confirmationHeader
          ? { "Confirmation-Id": confirmationHeader }
          : undefined,
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
      setError(e instanceof Error ? e.message : "Failed to confirm transfer");
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
      const res = await api<Record<string, string>>(
        `/groups/${groupId}/confirmation-id`,
      );
      const value = Object.values(res ?? {}).find((val) => val?.trim());
      setConfirmationId(value ?? "");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to generate confirmation ID",
      );
    }
  }

  async function loadGroup(gid: number) {
    setError(null);
    setLoadingMembers(true);
    try {
      const group = await api<GroupResponse>(`/groups/${gid}`);
      setMembers(group.members ?? []);
      setGroupName(group.name ?? null);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message ?? "Failed to load group");
      else setError(String(e) || "Failed to load group");
    } finally {
      setLoadingMembers(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    loadGroup(groupId);
    loadExpenses(groupId);
    loadSettlements(groupId);
  }, [groupId]);

  useEffect(() => {
    setExactAmounts((prev) => buildMemberValueMap(members, prev));
    setPercentages((prev) => buildMemberValueMap(members, prev));
    setShares((prev) => buildMemberValueMap(members, prev));
    setEditExactAmounts((prev) => buildMemberValueMap(members, prev));
    setEditPercentages((prev) => buildMemberValueMap(members, prev));
    setEditShares((prev) => buildMemberValueMap(members, prev));
  }, [members]);

  async function addMember() {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    setError(null);
    setLoading(true);
    try {
      await api<{ userId: number; name: string }>(
        `/groups/${groupId}/members`,
        {
          method: "POST",
          body: JSON.stringify({ userName }),
        },
      );
      setUserName("");
      await loadGroup(groupId);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message ?? "Failed to add member");
      else setError(String(e) || "Failed to add member");
    } finally {
      setLoading(false);
    }
  }

  async function saveGroupName() {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    const trimmedName = editingGroupName.trim();
    if (!trimmedName) {
      setError("Group name cannot be empty");
      return;
    }

    setError(null);
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
      if (e instanceof Error) setError(e.message ?? "Failed to update group");
      else setError(String(e) || "Failed to update group");
    } finally {
      setSavingGroupName(false);
    }
  }

  async function loadExpenses(gid: number) {
    setLoadingExpenses(true);
    try {
      const res = await api<Expense[]>(`/groups/${gid}/expenses`);
      setExpenses(res);
    } finally {
      setLoadingExpenses(false);
    }
  }

  async function loadSettlements(gid: number) {
    setLoadingSettlements(true);
    try {
      const res = await api<{ transfers: SettlementTransfer[] }>(
        `/groups/${gid}/settlements`,
      );
      setSettlements(res.transfers ?? []);
    } finally {
      setLoadingSettlements(false);
    }
  }

  async function loadLedger(gid: number) {
    setLoadingLedger(true);
    try {
      const res = await api<{ entries: LedgerEntry[] }>(
        `/groups/${gid}/ledger`,
      );
      setLedgerEntries(res.entries ?? []);
    } finally {
      setLoadingLedger(false);
    }
  }

  async function loadEvents(gid: number) {
    setLoadingEvents(true);
    try {
      const res = await api<EventResponse[]>(`/groups/${gid}/events`);
      setEvents(res ?? []);
    } finally {
      setLoadingEvents(false);
    }
  }

  async function loadConfirmedTransfers(gid: number) {
    setLoadingConfirmedTransfers(true);
    try {
      const query = confirmedFilter.trim()
        ? `?confirmationId=${encodeURIComponent(confirmedFilter.trim())}`
        : "";
      const res = await api<ConfirmedTransfer[]>(
        `/groups/${gid}/confirmed-transfers${query}`,
      );
      setConfirmedTransfers(res ?? []);
    } finally {
      setLoadingConfirmedTransfers(false);
    }
  }

  async function loadOwes(gid: number) {
    if (owesFromUserId === "" || owesToUserId === "") return;
    setLoadingOwes(true);
    try {
      const res = await api<{ amount: number }>(
        `/groups/${gid}/owes?fromUserId=${owesFromUserId}&toUserId=${owesToUserId}`,
      );
      setOwesAmount(res.amount);
    } finally {
      setLoadingOwes(false);
    }
  }

  async function loadOwesHistorical(gid: number) {
    if (owesFromUserId === "" || owesToUserId === "") return;
    setLoadingOwes(true);
    try {
      const res = await api<{ amount: number }>(
        `/groups/${gid}/owes/historical?fromUserId=${owesFromUserId}&toUserId=${owesToUserId}`,
      );
      setOwesHistoricalAmount(res.amount);
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

    setError(null);
    setLoading(true);
    const participantUserIds = members.map((m) => m.id);
    if (participantUserIds.length === 0) {
      setLoading(false);
      return;
    }
    const sharesList =
      splitMode === "shares"
        ? participantUserIds.map((id) => Number(shares[id] ?? ""))
        : [];
    const exactAmountList =
      splitMode === "exact"
        ? participantUserIds.map((id) => Number(exactAmounts[id] ?? ""))
        : [];
    const percentageList =
      splitMode === "percentage"
        ? participantUserIds.map((id) => Number(percentages[id] ?? ""))
        : [];

    if (
      splitMode === "exact" &&
      exactAmountList.some((val) => !Number.isFinite(val))
    ) {
      setError("Enter an exact amount for each member.");
      setLoading(false);
      return;
    }
    if (
      splitMode === "percentage" &&
      percentageList.some((val) => !Number.isFinite(val))
    ) {
      setError("Enter a percentage for each member.");
      setLoading(false);
      return;
    }
    if (
      splitMode === "shares" &&
      sharesList.some((val) => !Number.isFinite(val) || val < 1)
    ) {
      setError("Enter a share count (>= 1) for each member.");
      setLoading(false);
      return;
    }
    if (splitMode === "exact") {
      const exactSum = exactAmountList.reduce((sum, val) => sum + val, 0);
      if (Math.abs(exactSum - amt) > 0.01) {
        setError("Exact amounts must add up to the total.");
        setLoading(false);
        return;
      }
    }
    if (splitMode === "percentage") {
      const percentageSum = percentageList.reduce((sum, val) => sum + val, 0);
      if (Math.abs(percentageSum - 100) > 0.01) {
        setError("Percentages must add up to 100%.");
        setLoading(false);
        return;
      }
    }

    try {
      const payload: Record<string, unknown> = {
        description: desc,
        amount: amt,
        payerUserId: paidByUserId,
        participantUserIds,
      };
      if (splitMode === "shares") payload.shares = sharesList;
      if (splitMode === "exact") payload.exactAmounts = exactAmountList;
      if (splitMode === "percentage") payload.percentages = percentageList;

      await api<void>(`/groups/${groupId}/expenses`, {
        method: "POST",
        headers: idempotencyKey.trim()
          ? { "Idempotency-Key": idempotencyKey.trim() }
          : undefined,
        body: JSON.stringify(payload),
      });

      setDesc("");
      setAmount("");
      setExactAmounts({});
      setPercentages({});
      setShares({});
      setSplitMode("equal");
      setIdempotencyKey("");

      await Promise.all([loadExpenses(groupId), loadSettlements(groupId)]);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message ?? "Failed to add expense");
      else setError(String(e) || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  }

  function startEditExpense(expense: Expense) {
    setEditingExpenseId(expense.expenseId);
    setEditDesc(expense.description ?? "");
    setEditAmount(String(expense.amount ?? ""));
    setEditPaidByUserId(expense.payerUserId ?? "");
    setEditSplitMode("exact");
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

    setError(null);
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
    const exactAmountList =
      editSplitMode === "exact"
        ? participantUserIds.map((id) => Number(editExactAmounts[id] ?? ""))
        : [];
    const percentageList =
      editSplitMode === "percentage"
        ? participantUserIds.map((id) => Number(editPercentages[id] ?? ""))
        : [];

    if (
      editSplitMode === "exact" &&
      exactAmountList.some((val) => !Number.isFinite(val))
    ) {
      setError("Enter an exact amount for each member.");
      setUpdatingExpense(false);
      return;
    }
    if (
      editSplitMode === "percentage" &&
      percentageList.some((val) => !Number.isFinite(val))
    ) {
      setError("Enter a percentage for each member.");
      setUpdatingExpense(false);
      return;
    }
    if (
      editSplitMode === "shares" &&
      sharesList.some((val) => !Number.isFinite(val) || val < 1)
    ) {
      setError("Enter a share count (>= 1) for each member.");
      setUpdatingExpense(false);
      return;
    }
    if (editSplitMode === "exact") {
      const exactSum = exactAmountList.reduce((sum, val) => sum + val, 0);
      if (Math.abs(exactSum - amt) > 0.01) {
        setError("Exact amounts must add up to the total.");
        setUpdatingExpense(false);
        return;
      }
    }
    if (editSplitMode === "percentage") {
      const percentageSum = percentageList.reduce((sum, val) => sum + val, 0);
      if (Math.abs(percentageSum - 100) > 0.01) {
        setError("Percentages must add up to 100%.");
        setUpdatingExpense(false);
        return;
      }
    }

    try {
      const payload: Record<string, unknown> = {
        description: editDesc,
        amount: amt,
        payerUserId: editPaidByUserId,
        participantUserIds,
      };
      if (editSplitMode === "shares") payload.shares = sharesList;
      if (editSplitMode === "exact") payload.exactAmounts = exactAmountList;
      if (editSplitMode === "percentage") payload.percentages = percentageList;

      await api<void>(
        `/groups/${groupId}/expenses/${editingExpenseId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
      await Promise.all([loadExpenses(groupId), loadSettlements(groupId)]);
      resetEditExpense();
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message ?? "Failed to update expense");
      else setError(String(e) || "Failed to update expense");
    } finally {
      setUpdatingExpense(false);
    }
  }

  async function deleteExpense(expenseId: number) {
    if (!Number.isFinite(groupId)) return;
    setDeletingExpenseId(expenseId);
    try {
      await api<void>(`/groups/${groupId}/expenses/${expenseId}`, {
        method: "DELETE",
      });
      await Promise.all([loadExpenses(groupId), loadSettlements(groupId)]);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message ?? "Failed to delete expense");
      else setError(String(e) || "Failed to delete expense");
    } finally {
      setDeletingExpenseId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-orange-50 p-6 text-slate-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/" className="text-sm font-medium text-slate-600 underline">
        ← Back
      </Link>

      <div className="mt-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {groupName?.trim()
            ? groupName
            : `Group ${Number.isFinite(groupId) ? `#${groupId}` : ""}`}
        </h1>
        <p className="text-sm text-slate-600">
          Add members first (then we’ll do expenses & settlements).
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className={cardClassName}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Rename group
        </h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
            placeholder="Group name"
            value={editingGroupName}
            onChange={(e) => setEditingGroupName(e.target.value)}
          />
          <button
            onClick={saveGroupName}
            disabled={savingGroupName || !editingGroupName.trim()}
            className="rounded-xl border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingGroupName ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className={cardClassName}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Add a member
        </h2>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
            placeholder="e.g., Alice"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button
            onClick={addMember}
            disabled={!userName.trim() || loading || !Number.isFinite(groupId)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      <div className={cardClassName}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Members
        </h2>

        {loadingMembers ? (
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        ) : members.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No members yet. Add someone to get started.
          </p>
        ) : (
          <div className="mt-4 max-h-56 overflow-y-auto pr-1">
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="text-sm font-medium text-slate-900">
                    {getMemberName(m)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={cardClassName}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Add expense
        </h2>

        <div className="mt-3 grid grid-cols-1 gap-3">
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
            placeholder="Description (e.g., Groceries)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            placeholder="Idempotency key (optional)"
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
              placeholder="Amount (e.g., 42.50)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
            />

            <select
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={paidByUserId}
              onChange={(e) =>
                setPaidByUserId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Paid by...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {getMemberName(m)}
                </option>
              ))}
            </select>

            <button
              onClick={addExpense}
              disabled={
                loading ||
                !desc.trim() ||
                !amount ||
                paidByUserId === "" ||
                members.length === 0
              }
              className="rounded-xl border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving..." : "Add"}
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={splitMode}
              onChange={(e) =>
                setSplitMode(
                  e.target.value as "equal" | "exact" | "percentage" | "shares",
                )
              }
            >
              <option value="equal">Equal split</option>
              <option value="exact">Exact amounts</option>
              <option value="percentage">Percentages</option>
              <option value="shares">Shares</option>
            </select>
          </div>

          {splitMode === "exact" && (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Exact amounts
              </p>
              <div className="mt-3 space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    <span className="text-sm font-medium text-slate-900 sm:w-48">
                      {getMemberName(member)}
                    </span>
                    <input
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                      placeholder="0.00"
                      inputMode="decimal"
                      value={exactAmounts[member.id] ?? ""}
                      onChange={(e) =>
                        setExactAmounts((prev) => ({
                          ...prev,
                          [member.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {splitMode === "percentage" && (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Percentages
              </p>
              <div className="mt-3 space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    <span className="text-sm font-medium text-slate-900 sm:w-48">
                      {getMemberName(member)}
                    </span>
                    <input
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                      placeholder="0"
                      inputMode="decimal"
                      value={percentages[member.id] ?? ""}
                      onChange={(e) =>
                        setPercentages((prev) => ({
                          ...prev,
                          [member.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {splitMode === "shares" && (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Shares
              </p>
              <div className="mt-3 space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    <span className="text-sm font-medium text-slate-900 sm:w-48">
                      {getMemberName(member)}
                    </span>
                    <input
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                      placeholder="1"
                      inputMode="numeric"
                      value={shares[member.id] ?? ""}
                      onChange={(e) =>
                        setShares((prev) => ({
                          ...prev,
                          [member.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={cardClassName}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Expenses
        </h2>

        {loadingExpenses ? (
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        ) : expenses.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No expenses yet. Add the first one above.
          </p>
        ) : (
          <div className="mt-4 max-h-72 overflow-y-auto pr-1">
            <ul className="space-y-3">
              {expenses.map((ex, index) => (
                <li
                  key={`${ex.expenseId ?? "new"}-${ex.payerUserId}-${ex.amount}-${ex.createdAt ?? index}`}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {ex.description}
                      </div>
                      <div className="text-xs text-slate-500">
                        Paid by{" "}
                        {(() => {
                          const member = members.find(
                            (m) => m.id === ex.payerUserId,
                          );
                          return member
                            ? getMemberName(member)
                            : "Unknown member";
                        })()}
                      </div>
                      {ex.splits && ex.splits.length > 0 && (
                        <div className="mt-2 space-y-1 text-xs text-slate-500">
                          {ex.splits.map((split) => {
                            const member = members.find(
                              (m) => m.id === split.userId,
                            );
                            const label = member
                              ? getMemberName(member)
                              : `User #${split.userId}`;
                            return (
                              <div key={`${ex.expenseId}-${split.userId}`}>
                                {label}: ${Number(split.shareAmount).toFixed(2)}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold">
                        ${Number(ex.amount).toFixed(2)}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          className="underline"
                          onClick={() => startEditExpense(ex)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-rose-600 underline"
                          disabled={deletingExpenseId === ex.expenseId}
                          onClick={() => deleteExpense(ex.expenseId)}
                        >
                          {deletingExpenseId === ex.expenseId
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {editingExpenseId !== null && (
        <div className={cardClassName}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Update expense #{editingExpenseId}
          </h2>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
              placeholder="Description"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
                placeholder="Amount (e.g., 42.50)"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                inputMode="decimal"
              />

              <select
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
                value={editPaidByUserId}
                onChange={(e) =>
                  setEditPaidByUserId(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
              >
                <option value="">Paid by...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {getMemberName(m)}
                  </option>
                ))}
              </select>

              <button
                onClick={updateExpense}
                disabled={
                  updatingExpense ||
                  !editDesc.trim() ||
                  !editAmount ||
                  editPaidByUserId === "" ||
                  members.length === 0
                }
                className="rounded-xl border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatingExpense ? "Updating..." : "Save"}
              </button>
              <button
                onClick={resetEditExpense}
                disabled={updatingExpense}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
                value={editSplitMode}
                onChange={(e) =>
                  setEditSplitMode(
                    e.target.value as
                      | "equal"
                      | "exact"
                      | "percentage"
                      | "shares",
                  )
                }
              >
                <option value="equal">Equal split</option>
                <option value="exact">Exact amounts</option>
                <option value="percentage">Percentages</option>
                <option value="shares">Shares</option>
              </select>
            </div>

            {editSplitMode === "exact" && (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Exact amounts
                </p>
                <div className="mt-3 space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <span className="text-sm font-medium text-slate-900 sm:w-48">
                        {getMemberName(member)}
                      </span>
                      <input
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                        placeholder="0.00"
                        inputMode="decimal"
                        value={editExactAmounts[member.id] ?? ""}
                        onChange={(e) =>
                          setEditExactAmounts((prev) => ({
                            ...prev,
                            [member.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editSplitMode === "percentage" && (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Percentages
                </p>
                <div className="mt-3 space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <span className="text-sm font-medium text-slate-900 sm:w-48">
                        {getMemberName(member)}
                      </span>
                      <input
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                        placeholder="0"
                        inputMode="decimal"
                        value={editPercentages[member.id] ?? ""}
                        onChange={(e) =>
                          setEditPercentages((prev) => ({
                            ...prev,
                            [member.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editSplitMode === "shares" && (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Shares
                </p>
                <div className="mt-3 space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <span className="text-sm font-medium text-slate-900 sm:w-48">
                        {getMemberName(member)}
                      </span>
                      <input
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                        placeholder="1"
                        inputMode="numeric"
                        value={editShares[member.id] ?? ""}
                        onChange={(e) =>
                          setEditShares((prev) => ({
                            ...prev,
                            [member.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={cardClassName}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Settle up
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Suggested transfers to square everyone up.
            </p>
          </div>
          <button
            className="text-xs font-medium text-slate-600 underline"
            onClick={() => Number.isFinite(groupId) && loadSettlements(groupId)}
            disabled={loadingSettlements}
          >
            {loadingSettlements ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              placeholder="Confirmation ID (optional)"
              value={confirmationId}
              onChange={(e) => setConfirmationId(e.target.value)}
            />
            <button
              type="button"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              onClick={generateConfirmationIdFromApi}
            >
              Generate ID
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Use a confirmation ID to make transfer confirmations idempotent.
          </p>
        </div>

        {loadingSettlements ? (
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        ) : settlements.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No transfers needed right now.
          </p>
        ) : (
          (() => {
            const sortedTransfers = [...settlements].sort((a, b) => {
              if (a.fromUserId !== b.fromUserId) {
                return a.fromUserId - b.fromUserId;
              }
              if (a.toUserId !== b.toUserId) {
                return a.toUserId - b.toUserId;
              }
              return a.amount - b.amount;
            });

            return (
          <div className="mt-4 max-h-80 overflow-y-auto pr-1">
            <ul className="space-y-3">
              {sortedTransfers.map((s) => {
                const fromMember = members.find((m) => m.id === s.fromUserId);
                const toMember = members.find((m) => m.id === s.toUserId);
                const fromLabel = fromMember
                  ? getMemberName(fromMember)
                  : "Unknown member";
                const toLabel = toMember
                  ? getMemberName(toMember)
                  : "Unknown member";
                const transferKey = getTransferKey(s);
                const isPaid = paidTransfers.has(transferKey);
                return (
                  <li
                    key={transferKey}
                    className={`rounded-xl border px-3 py-3 ${
                      isPaid
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wide text-slate-500">
                            Transfer
                          </span>
                          {isPaid && (
                            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                              Confirmed
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                          <span className="text-rose-700">{fromLabel}</span>{" "}
                          pays{" "}
                          <span className="text-emerald-700">{toLabel}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold">
                          ${Number(s.amount).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            isPaid
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                          onClick={() => confirmPaidTransfer(s)}
                          disabled={
                            isPaid || confirmingTransfers.has(transferKey)
                          }
                        >
                          {confirmingTransfers.has(transferKey)
                            ? "Confirming..."
                            : isPaid
                              ? "Confirmed"
                              : "Mark paid"}
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-slate-600 underline"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              `${fromLabel} pays ${toLabel} $${Number(s.amount).toFixed(2)}`
                            )
                          }
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
            );
          })()
        )}
      </div>

      <div className={cardClassName}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Ledger
          </h2>
          <button
            className="text-xs font-medium text-slate-600 underline"
            onClick={() => Number.isFinite(groupId) && loadLedger(groupId)}
            disabled={loadingLedger}
          >
            {loadingLedger ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loadingLedger ? (
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        ) : ledgerEntries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No ledger entries yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {ledgerEntries.map((entry) => {
              const member = members.find((m) => m.id === entry.userId);
              const label = member
                ? getMemberName(member)
                : `User #${entry.userId}`;
              return (
                <div
                  key={entry.userId}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-900">{label}</span>
                  <span
                    className={
                      entry.netBalance >= 0
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }
                  >
                    {entry.netBalance >= 0 ? "+" : "-"}$
                    {Math.abs(entry.netBalance).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={cardClassName}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Owes lookup
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={owesFromUserId}
            onChange={(e) =>
              setOwesFromUserId(
                e.target.value ? Number(e.target.value) : "",
              )
            }
          >
            <option value="">From user...</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {getMemberName(m)}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={owesToUserId}
            onChange={(e) =>
              setOwesToUserId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">To user...</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {getMemberName(m)}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl border border-slate-300 bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                loadingOwes || owesFromUserId === "" || owesToUserId === ""
              }
              onClick={() => Number.isFinite(groupId) && loadOwes(groupId)}
            >
              Current
            </button>
            <button
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                loadingOwes || owesFromUserId === "" || owesToUserId === ""
              }
              onClick={() =>
                Number.isFinite(groupId) && loadOwesHistorical(groupId)
              }
            >
              Historical
            </button>
          </div>
        </div>
        <div className="mt-3 text-sm text-slate-600">
          {loadingOwes && "Loading..."}
          {!loadingOwes && owesAmount !== null && (
            <div>Current owes: ${owesAmount.toFixed(2)}</div>
          )}
          {!loadingOwes && owesHistoricalAmount !== null && (
            <div>Historical owes: ${owesHistoricalAmount.toFixed(2)}</div>
          )}
        </div>
      </div>

      <div className={cardClassName}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Confirmed transfers
          </h2>
          <button
            className="text-xs font-medium text-slate-600 underline"
            onClick={() =>
              Number.isFinite(groupId) && loadConfirmedTransfers(groupId)
            }
            disabled={loadingConfirmedTransfers}
          >
            {loadingConfirmedTransfers ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <input
          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          placeholder="Filter by confirmation ID (optional)"
          value={confirmedFilter}
          onChange={(e) => setConfirmedFilter(e.target.value)}
        />

        {loadingConfirmedTransfers ? (
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        ) : confirmedTransfers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No confirmed transfers yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {confirmedTransfers.map((transfer) => {
              const fromMember = members.find(
                (m) => m.id === transfer.fromUserId,
              );
              const toMember = members.find(
                (m) => m.id === transfer.toUserId,
              );
              const fromLabel = fromMember
                ? getMemberName(fromMember)
                : `User #${transfer.fromUserId}`;
              const toLabel = toMember
                ? getMemberName(toMember)
                : `User #${transfer.toUserId}`;
              return (
                <div
                  key={transfer.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                >
                  <div className="text-sm font-medium text-slate-900">
                    {fromLabel} → {toLabel}: $
                    {Number(transfer.amount).toFixed(2)}
                  </div>
                  <div className="mt-1">
                    Confirmation: {transfer.confirmationId ?? "—"} ·{" "}
                    {new Date(transfer.createdAt).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={cardClassName}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Expense events
          </h2>
          <button
            className="text-xs font-medium text-slate-600 underline"
            onClick={() => Number.isFinite(groupId) && loadEvents(groupId)}
            disabled={loadingEvents}
          >
            {loadingEvents ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loadingEvents ? (
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        ) : events.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No events yet.
          </p>
        ) : (
          <div className="mt-4 max-h-64 overflow-y-auto pr-1">
            <ul className="space-y-2">
              {events.map((event) => (
                <li
                  key={event.eventId}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                >
                  <div className="text-sm font-medium text-slate-900">
                    {event.eventType}
                  </div>
                  <div className="mt-1">
                    Expense #{event.expenseId ?? "—"} ·{" "}
                    {new Date(event.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap break-words text-[11px] text-slate-500">
                    {event.payload}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      </div>
    </main>
  );
}
