import Link from "next/link";
import { StatusBanner } from "../../../components/ui/StatusBanner";
import type { Group } from "../types";

export function CreateGroupSection({
  groupName,
  loading,
  createGroupError,
  createdGroup,
  setGroupName,
  onCreateGroup,
}: {
  groupName: string;
  loading: boolean;
  createGroupError: string | null;
  createdGroup: Group | null;
  setGroupName: (value: string) => void;
  onCreateGroup: () => void;
}) {
  return (
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

      {loading && <StatusBanner variant="loading" message="Creating group..." />}
      {createGroupError && (
        <StatusBanner
          variant="error"
          message={createGroupError}
          onRetry={onCreateGroup}
        />
      )}

      {createdGroup !== null && (
        <div className="mt-4 text-sm">
          Created group:{" "}
          <Link className="underline" href={`/groups/${createdGroup.id}`}>
            {createdGroup.name}
          </Link>
        </div>
      )}
    </div>
  );
}
