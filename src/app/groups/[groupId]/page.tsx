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

  function getMemberName(member: Member) {
    return member.name?.trim() || member.userName?.trim() || "Member";
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

    try {
      await api<void>(`/groups/${groupId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          description: desc,
          amount: amt,
          payerUserId: paidByUserId,
          participantUserIds,
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
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link href="/" className="text-sm underline">
        ← Back
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold">
          {groupName?.trim()
            ? groupName
            : `Group ${Number.isFinite(groupId) ? `#${groupId}` : ""}`}
        </h1>
        <p className="text-sm text-gray-500">
          Add members first (then we’ll do expenses & settlements).
        </p>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <h2 className="font-medium">Rename group</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-xl border px-3 py-2 outline-none"
            placeholder="Group name"
            value={editingGroupName}
            onChange={(e) => setEditingGroupName(e.target.value)}
          />
          <button
            onClick={saveGroupName}
            disabled={savingGroupName || !editingGroupName.trim()}
            className="rounded-xl border px-4 py-2 disabled:opacity-50"
          >
            {savingGroupName ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <h2 className="font-medium">Add a member</h2>

        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-xl border px-3 py-2 outline-none"
            placeholder="e.g., Alice"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button
            onClick={addMember}
            disabled={!userName.trim() || loading || !Number.isFinite(groupId)}
            className="rounded-xl border px-4 py-2 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <h2 className="font-medium">Members</h2>

        {loadingMembers ? (
          <p className="mt-3 text-sm text-gray-500">Loading...</p>
        ) : members.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No members yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {members.map((m) => (
              <li key={m.id} className="rounded-xl border px-3 py-2">
                <div className="font-medium">{getMemberName(m)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-6 rounded-2xl border p-4">
        <h2 className="font-medium">Add expense</h2>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <input
            className="rounded-xl border px-3 py-2 outline-none"
            placeholder="Description (e.g., Groceries)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border px-3 py-2 outline-none"
              placeholder="Amount (e.g., 42.50)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
            />

            <select
              className="flex-1 rounded-xl border px-3 py-2"
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
              className="rounded-xl border px-4 py-2 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Add"}
            </button>
          </div>

          <p className="text-xs text-gray-500">
            MVP: backend splits equally among all members (we’ll add
            item/percentage splits later).
          </p>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border p-4">
        <h2 className="font-medium">Expenses</h2>

        {loadingExpenses ? (
          <p className="mt-3 text-sm text-gray-500">Loading...</p>
        ) : expenses.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No expenses yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {expenses.map((ex, index) => (
              <li
                key={`${ex.id ?? "new"}-${ex.payerUserId}-${ex.amount}-${ex.createdAt ?? index}`}
                className="rounded-xl border px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{ex.description}</div>
                    <div className="text-xs text-gray-500">
                      paid by{" "}
                      {(() => {
                        const member = members.find(
                          (m) => m.id === ex.payerUserId,
                        );
                        return member ? getMemberName(member) : "Unknown member";
                      })()}
                    </div>
                  </div>
                  <div className="font-semibold">
                    ${Number(ex.amount).toFixed(2)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-6 rounded-2xl border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Net balances</h2>
          <button
            className="text-sm underline"
            onClick={() => Number.isFinite(groupId) && loadSettlements(groupId)}
            disabled={loadingSettlements}
          >
            {loadingSettlements ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loadingSettlements ? (
          <p className="mt-3 text-sm text-gray-500">Loading...</p>
        ) : settlements.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No balances yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {settlements.map((s) => {
              const fromMember = members.find((m) => m.id === s.fromUserId);
              const toMember = members.find((m) => m.id === s.toUserId);
              return (
                <li
                  key={`${s.fromUserId}-${s.toUserId}-${s.amount}`}
                  className="rounded-xl border px-3 py-2 flex items-center justify-between gap-3"
                >
                  <span className="font-medium">
                    {fromMember ? getMemberName(fromMember) : `User ${s.fromUserId}`}
                    {" → "}
                    {toMember ? getMemberName(toMember) : `User ${s.toUserId}`}
                  </span>
                  <span className="font-semibold">
                    ${Number(s.amount).toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
