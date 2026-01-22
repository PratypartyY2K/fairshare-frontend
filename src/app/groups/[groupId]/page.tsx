"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";

type Member = {
  id: number;
  userName: string;
};

export default function GroupPage({
  params,
}: {
  params: { groupId: string };
}) {
  const groupId = Number(params.groupId);

  const [members, setMembers] = useState<Member[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMembers() {
    setError(null);
    setLoadingMembers(true);
    try {
      // Must match your backend endpoint
      const res = await api<Member[]>(`/groups/${groupId}/members`);
      setMembers(res);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message ?? "Failed to load members");
      } else {
        setError(String(e) || "Failed to load members");
      }
    } finally {
      setLoadingMembers(false);
    }
  }

  useEffect(() => {
    if (Number.isFinite(groupId)) loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function addMember() {
    setError(null);
    setLoading(true);
    try {
      // Must match your backend endpoint
      await api<void>(`/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify({ userName }),
      });
      setUserName("");
      await loadMembers();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message ?? "Failed to add member");
      } else {
        setError(String(e) || "Failed to add member");
      }
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
        <h1 className="text-2xl font-semibold">Group #{groupId}</h1>
        <h1 className="text-2xl font-semibold">Group #{groupId}</h1>
        <p className="text-sm text-gray-500">
          Add members first (then we’ll do expenses & settlements).
        </p>
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
            disabled={!userName.trim() || loading}
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
                <div className="font-medium">{m.userName}</div>
                <div className="text-xs text-gray-500">id: {m.id}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
