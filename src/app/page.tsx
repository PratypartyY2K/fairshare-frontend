"use client";

import { useState } from "react";
import { api } from "../lib/api";

type CreateGroupResponse = {
  id: number;
  name?: string;
};

export default function HomePage() {
  const [groupName, setGroupName] = useState("");
  const [createdGroupId, setCreatedGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreateGroup() {
    setError(null);
    setLoading(true);
    try {
      const res = await api<CreateGroupResponse>("/groups", {
        method: "POST",
        body: JSON.stringify({ name: groupName }),
      });
      setCreatedGroupId(res.id);
      setGroupName("");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else if (typeof e === "string") {
        setError(e);
      } else {
        setError("Failed to create group");
      }
    } finally {
      setLoading(false);
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

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {createdGroupId !== null && (
          <div className="mt-4 text-sm">
            Created group:{" "}
            <a className="underline" href={`/groups/${createdGroupId}`}>
              Open group #{createdGroupId}
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
