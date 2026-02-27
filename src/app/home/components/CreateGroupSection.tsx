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
    <section className="panel fade-rise">
      <h2 className="section-title">Create a group</h2>

      <div className="mt-4 flex gap-2">
        <input
          className="field flex-1"
          placeholder="e.g., Roommates"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <button
          onClick={onCreateGroup}
          disabled={!groupName.trim() || loading}
          className="btn btn-primary disabled:opacity-50"
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
        <div className="mt-4 text-sm text-[var(--text-muted)]">
          Created group:{" "}
          <Link className="link-accent" href={`/groups/${createdGroup.id}`}>
            {createdGroup.name}
          </Link>
        </div>
      )}
    </section>
  );
}
