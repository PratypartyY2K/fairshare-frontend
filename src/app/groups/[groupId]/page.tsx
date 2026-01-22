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

type Expense = {
  id: number;
  description: string;
  amount: number;
  payerUserId: number;
  createdAt?: string;
};

type SettlementTransfer = {
  fromUserId: number;
  toUserId: number;
  amount: number;
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

  const [settlements, setSettlements] = useState<SettlementTransfer[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [paidTransfers, setPaidTransfers] = useState<Set<string>>(
    () => new Set(),
  );

  const cardClassName =
    "rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur";

  function getMemberName(member: Member) {
    return member.name?.trim() || member.userName?.trim() || "Member";
  }

  function getTransferKey(transfer: SettlementTransfer) {
    return `${transfer.fromUserId}-${transfer.toUserId}-${transfer.amount.toFixed(2)}`;
  }

  function togglePaidTransfer(transfer: SettlementTransfer) {
    const key = getTransferKey(transfer);
    setPaidTransfers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
      await api<void>(`/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmedName }),
      });
      setGroupName(trimmedName);
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

  async function addExpense() {
    if (!Number.isFinite(groupId)) return;
    if (!desc.trim()) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (paidByUserId === "") return;

    setError(null);
    setLoading(true);
    const participantUserIds = members.map((m) => m.id);
    if (participantUserIds.length === 0) return;
    const shares = participantUserIds.map(() => 1);

    try {
      await api<void>(`/groups/${groupId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          description: desc,
          amount: amt,
          payerUserId: paidByUserId,
          participantUserIds,
          shares,
          exactAmounts: [],
          percentages: [],
        }),
      });

      setDesc("");
      setAmount("");

      await Promise.all([loadExpenses(groupId), loadSettlements(groupId)]);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message ?? "Failed to add expense");
      else setError(String(e) || "Failed to add expense");
    } finally {
      setLoading(false);
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
          <ul className="mt-4 space-y-2">
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

          <p className="text-xs text-slate-500">
            MVP: backend splits equally among all members (we’ll add
            item/percentage splits later).
          </p>
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
          <ul className="mt-4 space-y-3">
            {expenses.map((ex, index) => (
              <li
                key={`${ex.id ?? "new"}-${ex.payerUserId}-${ex.amount}-${ex.createdAt ?? index}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
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
                        return member ? getMemberName(member) : "Unknown member";
                      })()}
                    </div>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold">
                    ${Number(ex.amount).toFixed(2)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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
          <ul className="mt-4 space-y-3">
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
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-xs uppercase tracking-wide text-slate-500">
                        Transfer
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isPaid
                            ? "text-slate-400 line-through"
                            : "text-slate-900"
                        }`}
                      >
                        <span
                          className={isPaid ? "text-slate-400" : "text-rose-700"}
                        >
                          {fromLabel}
                        </span>{" "}
                        pays{" "}
                        <span
                          className={
                            isPaid ? "text-slate-400" : "text-emerald-700"
                          }
                        >
                          {toLabel}
                        </span>
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
                        onClick={() => togglePaidTransfer(s)}
                      >
                        {isPaid ? "Paid" : "Mark paid"}
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
            );
          })()
        )}
      </div>
      </div>
    </main>
  );
}
