import { StatusBanner } from "../../../../components/ui/StatusBanner";
import type { Member } from "../types";

export function MembersTab({
  sectionClass,
  editingGroupName,
  savingGroupName,
  renameGroupError,
  userName,
  addingMember,
  groupId,
  addMemberError,
  loadingMembers,
  membersError,
  members,
  setEditingGroupName,
  saveGroupName,
  setUserName,
  addMember,
  reloadGroup,
  getMemberName,
}: {
  sectionClass: string;
  editingGroupName: string;
  savingGroupName: boolean;
  renameGroupError: string | null;
  userName: string;
  addingMember: boolean;
  groupId: number;
  addMemberError: string | null;
  loadingMembers: boolean;
  membersError: string | null;
  members: Member[];
  setEditingGroupName: (value: string) => void;
  saveGroupName: () => void;
  setUserName: (value: string) => void;
  addMember: () => void;
  reloadGroup: () => void;
  getMemberName: (member: Member) => string;
}) {
  return (
    <>
      <div className={sectionClass}>
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
        {savingGroupName && (
          <StatusBanner variant="loading" message="Saving group name..." />
        )}
        {renameGroupError && (
          <StatusBanner
            variant="error"
            message={renameGroupError}
            onRetry={saveGroupName}
          />
        )}
      </div>

      <div className={sectionClass}>
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
            disabled={!userName.trim() || addingMember || !Number.isFinite(groupId)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addingMember ? "Adding..." : "Add"}
          </button>
        </div>
        {addingMember && (
          <StatusBanner variant="loading" message="Adding member..." />
        )}
        {addMemberError && (
          <StatusBanner
            variant="error"
            message={addMemberError}
            onRetry={addMember}
          />
        )}
      </div>

      <div className={sectionClass}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Members
        </h2>

        {loadingMembers && (
          <StatusBanner variant="loading" message="Loading members..." />
        )}
        {membersError && (
          <StatusBanner
            variant="error"
            message={membersError}
            onRetry={reloadGroup}
          />
        )}
        {!loadingMembers && !membersError && members.length === 0 && (
          <StatusBanner
            variant="empty"
            message="No members yet. Add someone to get started."
          />
        )}
        {!loadingMembers && !membersError && members.length > 0 && (
          <div className="mt-4 max-h-56 overflow-y-auto pr-1">
            <ul className="space-y-2">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="text-sm font-medium text-slate-900">
                    {getMemberName(member)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
