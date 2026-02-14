import { StatusBanner } from "../../../../components/ui/StatusBanner";
import { getLedgerWhyParts, getTransferKey } from "../groupPageUtils";
import type { LedgerEntry, LedgerExplanationEntry, Member, SettlementTransfer } from "../types";

export function SettleTab({
  sectionClass,
  groupId,
  members,
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
  getMemberName,
  setConfirmationId,
  generateConfirmationIdFromApi,
  loadSettlements,
  confirmPaidTransfer,
  loadLedger,
  setOwesFromUserId,
  setOwesToUserId,
  loadOwes,
  loadOwesHistorical,
}: {
  sectionClass: string;
  groupId: number;
  members: Member[];
  settlements: SettlementTransfer[];
  loadingSettlements: boolean;
  settlementsError: string | null;
  confirmationId: string;
  confirmationIdError: string | null;
  confirmTransferError: string | null;
  paidTransfers: Set<string>;
  confirmingTransfers: Set<string>;
  ledgerEntries: LedgerEntry[];
  loadingLedger: boolean;
  ledgerError: string | null;
  ledgerExplanationByUserId: Map<number, LedgerExplanationEntry>;
  loadingLedgerExplanation: boolean;
  owesFromUserId: number | "";
  owesToUserId: number | "";
  owesAmount: number | null;
  owesHistoricalAmount: number | null;
  owesView: "current" | "historical" | null;
  loadingOwes: boolean;
  owesError: string | null;
  getMemberName: (member: Member) => string;
  setConfirmationId: (value: string) => void;
  generateConfirmationIdFromApi: () => void;
  loadSettlements: (gid: number) => Promise<void>;
  confirmPaidTransfer: (transfer: SettlementTransfer) => Promise<void>;
  loadLedger: (gid: number) => Promise<void>;
  setOwesFromUserId: (value: number | "") => void;
  setOwesToUserId: (value: number | "") => void;
  loadOwes: (gid: number) => Promise<void>;
  loadOwesHistorical: (gid: number) => Promise<void>;
}) {
  return (
    <>
      <div className={sectionClass}>
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

        {confirmationIdError && (
          <StatusBanner
            variant="error"
            message={confirmationIdError}
            onRetry={generateConfirmationIdFromApi}
          />
        )}
        {confirmTransferError && (
          <StatusBanner variant="error" message={confirmTransferError} />
        )}
        {loadingSettlements && (
          <StatusBanner variant="loading" message="Loading settlements..." />
        )}
        {settlementsError && (
          <StatusBanner
            variant="error"
            message={settlementsError}
            onRetry={() => Number.isFinite(groupId) && loadSettlements(groupId)}
          />
        )}
        {!loadingSettlements && !settlementsError && settlements.length === 0 && (
          <StatusBanner variant="empty" message="No transfers needed right now." />
        )}
        {!loadingSettlements && !settlementsError && settlements.length > 0 && (
          <div className="mt-4 max-h-80 overflow-y-auto pr-1">
            <ul className="space-y-3">
              {[...settlements]
                .sort((a, b) => {
                  if (a.fromUserId !== b.fromUserId) return a.fromUserId - b.fromUserId;
                  if (a.toUserId !== b.toUserId) return a.toUserId - b.toUserId;
                  return Number(a.amount) - Number(b.amount);
                })
                .map((settlement) => {
                  const fromMember = members.find((m) => m.id === settlement.fromUserId);
                  const toMember = members.find((m) => m.id === settlement.toUserId);
                  const fromLabel = fromMember ? getMemberName(fromMember) : "Unknown member";
                  const toLabel = toMember ? getMemberName(toMember) : "Unknown member";
                  const transferKey = getTransferKey(settlement);
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
                            <span className="text-rose-700">{fromLabel}</span> pays{" "}
                            <span className="text-emerald-700">{toLabel}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold">
                            ${Number(settlement.amount).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              isPaid
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                            onClick={() => void confirmPaidTransfer(settlement)}
                            disabled={isPaid || confirmingTransfers.has(transferKey)}
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
                                `${fromLabel} pays ${toLabel} $${Number(settlement.amount).toFixed(2)}`,
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
        )}
      </div>

      <div className={sectionClass}>
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

        {loadingLedger && <StatusBanner variant="loading" message="Loading ledger..." />}
        {ledgerError && (
          <StatusBanner
            variant="error"
            message={ledgerError}
            onRetry={() => Number.isFinite(groupId) && loadLedger(groupId)}
          />
        )}
        {!loadingLedger && !ledgerError && ledgerEntries.length === 0 && (
          <StatusBanner variant="empty" message="No ledger entries yet." />
        )}
        {!loadingLedger && !ledgerError && ledgerEntries.length > 0 && (
          <div className="mt-4 space-y-2">
            {ledgerEntries.map((entry) => {
              const member = members.find((m) => m.id === entry.userId);
              const label = member ? getMemberName(member) : `User #${entry.userId}`;
              const explanation = ledgerExplanationByUserId.get(entry.userId);
              const whyParts = explanation ? getLedgerWhyParts(explanation, new Map(members.map((m) => [m.id, getMemberName(m)] as const))) : [];
              const whyText = explanation
                ? whyParts.length > 0
                  ? `Why: ${whyParts.join(" · ")}`
                  : "Why: no detailed explanation breakdown."
                : loadingLedgerExplanation
                  ? "Why: loading explanation..."
                  : "Why: explanation not available yet.";

              return (
                <div
                  key={entry.userId}
                  className="flex items-start justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div className="min-w-0 pr-3">
                    <div className="font-medium text-slate-900">{label}</div>
                    <div className="mt-1 text-xs text-slate-500">{whyText}</div>
                  </div>
                  <span
                    title={whyText}
                    className={Number(entry.netBalance) >= 0 ? "text-emerald-700" : "text-rose-700"}
                  >
                    {Number(entry.netBalance) >= 0 ? "+" : "-"}${Math.abs(Number(entry.netBalance)).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={sectionClass}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Owes lookup
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={owesFromUserId}
            onChange={(e) => setOwesFromUserId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">From user...</option>
            {members
              .filter((member) => member.id !== owesToUserId)
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {getMemberName(member)}
                </option>
              ))}
          </select>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={owesToUserId}
            onChange={(e) => setOwesToUserId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">To user...</option>
            {members
              .filter((member) => member.id !== owesFromUserId)
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {getMemberName(member)}
                </option>
              ))}
          </select>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl border border-slate-300 bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                loadingOwes ||
                owesFromUserId === "" ||
                owesToUserId === "" ||
                owesFromUserId === owesToUserId
              }
              onClick={() => Number.isFinite(groupId) && void loadOwes(groupId)}
            >
              Current
            </button>
            <button
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                loadingOwes ||
                owesFromUserId === "" ||
                owesToUserId === "" ||
                owesFromUserId === owesToUserId
              }
              onClick={() => Number.isFinite(groupId) && void loadOwesHistorical(groupId)}
            >
              Historical
            </button>
          </div>
        </div>
        <div className="mt-3 text-sm text-slate-600">
          {loadingOwes && <StatusBanner variant="loading" message="Loading owes..." />}
          {owesError && (
            <StatusBanner
              variant="error"
              message={owesError}
              onRetry={() =>
                Number.isFinite(groupId) &&
                (owesView === "historical" ? loadOwesHistorical(groupId) : loadOwes(groupId))
              }
            />
          )}
          {!loadingOwes && !owesError && owesAmount === null && owesHistoricalAmount === null && (
            <StatusBanner
              variant="empty"
              message="Select two members to see what’s owed."
            />
          )}
          {!loadingOwes && !owesError && owesView === "current" && owesAmount !== null && (
            <div>Current owes: ${owesAmount.toFixed(2)}</div>
          )}
          {!loadingOwes && !owesError && owesView === "historical" && owesHistoricalAmount !== null && (
            <div>Historical owes: ${owesHistoricalAmount.toFixed(2)}</div>
          )}
        </div>
      </div>
    </>
  );
}
