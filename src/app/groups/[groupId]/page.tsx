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
  const [splitMode, setSplitMode] = useState<"equal" | "exact" | "percentage">(
    "equal",
  );
  const [exactAmounts, setExactAmounts] = useState<Record<number, string>>({});
  const [percentages, setPercentages] = useState<Record<number, string>>({});

  const [settlements, setSettlements] = useState<SettlementTransfer[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [paidTransfers, setPaidTransfers] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmingTransfers, setConfirmingTransfers] = useState<Set<string>>(
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

  async function confirmPaidTransfer(transfer: SettlementTransfer) {
    const key = getTransferKey(transfer);
    if (confirmingTransfers.has(key)) return;
    const isPaid = paidTransfers.has(key);
    if (isPaid) return;

    setConfirmingTransfers((prev) => new Set(prev).add(key));
    try {
      await api<void>(`/groups/${groupId}/settlements/confirm`, {
        method: "POST",
        body: JSON.stringify({
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
    const shares = splitMode === "equal" ? participantUserIds.map(() => 1) : [];
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
      await api<void>(`/groups/${groupId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          description: desc,
          amount: amt,
          payerUserId: paidByUserId,
          participantUserIds,
          shares,
          exactAmounts: exactAmountList,
          percentages: percentageList,
        }),
      });

      setDesc("");
      setAmount("");
      setExactAmounts({});
      setPercentages({});
      setSplitMode("equal");

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
                setSplitMode(e.target.value as "equal" | "exact" | "percentage")
              }
            >
              <option value="equal">Equal split</option>
              <option value="exact">Exact amounts</option>
              <option value="percentage">Percentages</option>
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
                          return member
                            ? getMemberName(member)
                            : "Unknown member";
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
          </div>
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
      </div>
    </main>
  );
}
