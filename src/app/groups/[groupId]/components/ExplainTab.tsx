import { StatusBanner } from "../../../../components/ui/StatusBanner";
import type { LedgerExplanationEntry, Member } from "../types";

export function ExplainTab({
  sectionClass,
  groupId,
  loadingLedgerExplanation,
  ledgerExplanationError,
  loadLedgerExplanation,
  currentUserId,
  setCurrentUserId,
  members,
  getMemberName,
  selectedLedgerExplanationUserId,
  setSelectedLedgerExplanationUserId,
  ledgerExplanationEntries,
  formatMoney,
  formatContributionDescription,
  getShortTimeZoneLabel,
  memberNameById,
}: {
  sectionClass: string;
  groupId: number;
  loadingLedgerExplanation: boolean;
  ledgerExplanationError: string | null;
  loadLedgerExplanation: (gid: number) => Promise<void>;
  currentUserId: number | "";
  setCurrentUserId: (value: number | "") => void;
  members: Member[];
  getMemberName: (member: Member) => string;
  selectedLedgerExplanationUserId: number | "";
  setSelectedLedgerExplanationUserId: (value: number | "") => void;
  ledgerExplanationEntries: LedgerExplanationEntry[];
  formatMoney: (value?: string | number) => string;
  formatContributionDescription: (
    description: string | undefined,
    memberNameById: Map<number, string>,
  ) => string;
  getShortTimeZoneLabel: (dateInput: string) => string;
  memberNameById: Map<number, string>;
}) {
  return (
    <div className={sectionClass}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Ledger explanation
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            See which expenses and transfers drive each member&apos;s balance.
          </p>
        </div>
        <button
          className="text-xs font-medium text-slate-600 underline"
          onClick={() => Number.isFinite(groupId) && void loadLedgerExplanation(groupId)}
          disabled={loadingLedgerExplanation}
        >
          {loadingLedgerExplanation ? "Explaining..." : "Explain"}
        </button>
      </div>

      {loadingLedgerExplanation && (
        <StatusBanner variant="loading" message="Loading ledger explanation..." />
      )}
      {ledgerExplanationError && (
        <StatusBanner
          variant="error"
          message={ledgerExplanationError}
          onRetry={() => Number.isFinite(groupId) && void loadLedgerExplanation(groupId)}
        />
      )}
      {!loadingLedgerExplanation && !ledgerExplanationError && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Current user
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={currentUserId}
              onChange={(e) => setCurrentUserId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Select current user</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {getMemberName(member)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">Explain defaults to this member.</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Explain member
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={selectedLedgerExplanationUserId}
              onChange={(e) =>
                setSelectedLedgerExplanationUserId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Select group member</option>
              {ledgerExplanationEntries.map((entry) => {
                const member = members.find((m) => m.id === entry.userId);
                const label = member ? getMemberName(member) : `User #${entry.userId}`;
                return (
                  <option key={entry.userId} value={entry.userId}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}
      {!loadingLedgerExplanation && !ledgerExplanationError && ledgerExplanationEntries.length === 0 && (
        <StatusBanner variant="empty" message="No explanation data yet." />
      )}
      {!loadingLedgerExplanation &&
        !ledgerExplanationError &&
        ledgerExplanationEntries.length > 0 &&
        selectedLedgerExplanationUserId === "" && (
          <StatusBanner variant="info" message="Select group member to view explanation." />
        )}
      {!loadingLedgerExplanation &&
        !ledgerExplanationError &&
        ledgerExplanationEntries.length > 0 &&
        selectedLedgerExplanationUserId !== "" && (
          <div className="mt-4 space-y-4">
            {ledgerExplanationEntries
              .filter((entry) => entry.userId === selectedLedgerExplanationUserId)
              .map((entry) => {
                const member = members.find((m) => m.id === entry.userId);
                const label = member ? getMemberName(member) : `User #${entry.userId}`;
                const netValue = Number(entry.netBalance ?? "");
                const netLabel = Number.isFinite(netValue)
                  ? `${netValue >= 0 ? "+" : "-"}$${Math.abs(netValue).toFixed(2)}`
                  : (entry.netBalance ?? "—");
                const netClass = Number.isFinite(netValue)
                  ? netValue >= 0
                    ? "text-emerald-700"
                    : "text-rose-700"
                  : "text-slate-600";
                const expenses = entry.expenses ?? entry.contributingExpenses ?? [];
                const transfersIn = entry.transfersIn ?? [];
                const transfersOut = entry.transfersOut ?? [];
                const transfers = entry.transfers ?? entry.contributingTransfers ?? [];
                const contributions = entry.contributions ?? [];
                const showDirectionalTransfers =
                  transfersIn.length > 0 || transfersOut.length > 0;

                return (
                  <div
                    key={entry.userId}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{label}</div>
                        <div className="text-xs text-slate-500">Net balance</div>
                      </div>
                      <span className={netClass}>{netLabel}</span>
                    </div>

                    {expenses.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Expenses
                        </div>
                        <div className="mt-2 space-y-2">
                          {expenses.map((expense) => {
                            const payer = members.find((m) => m.id === expense.payerUserId);
                            const payerLabel = payer
                              ? getMemberName(payer)
                              : expense.payerUserId
                                ? `User #${expense.payerUserId}`
                                : "Unknown payer";
                            return (
                              <div
                                key={`${entry.userId}-${expense.expenseId ?? expense.description}`}
                                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-medium text-slate-900">
                                      {expense.description ?? "Expense"}
                                    </div>
                                    <div className="text-xs text-slate-500">Paid by {payerLabel}</div>
                                  </div>
                                  <span className="text-xs font-semibold text-slate-700">
                                    {formatMoney(expense.amount)}
                                  </span>
                                </div>
                                {expense.splits && expense.splits.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                                    {expense.splits.map((split) => {
                                      const splitMember = members.find((m) => m.id === split.userId);
                                      const splitLabel = splitMember
                                        ? getMemberName(splitMember)
                                        : `User #${split.userId}`;
                                      return (
                                        <span
                                          key={`${entry.userId}-${expense.expenseId}-${split.userId}`}
                                          className="rounded-full border border-slate-200 bg-white px-2 py-1"
                                        >
                                          {splitLabel} {formatMoney(split.shareAmount)}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(showDirectionalTransfers || transfers.length > 0) && (
                      <div className="mt-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Transfers
                        </div>
                        {showDirectionalTransfers ? (
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {transfersIn.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-[11px] font-medium text-emerald-700">Incoming</div>
                                {transfersIn.map((transfer) => {
                                  const fromMember = members.find((m) => m.id === transfer.fromUserId);
                                  const fromLabel = fromMember
                                    ? getMemberName(fromMember)
                                    : `User #${transfer.fromUserId}`;
                                  return (
                                    <div
                                      key={`${entry.userId}-in-${transfer.fromUserId}-${transfer.toUserId}-${transfer.amount}`}
                                      className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-slate-600">
                                          {fromLabel} → {label}
                                        </span>
                                        <span className="text-xs font-semibold text-emerald-700">
                                          {formatMoney(transfer.amount)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {transfersOut.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-[11px] font-medium text-rose-700">Outgoing</div>
                                {transfersOut.map((transfer) => {
                                  const toMember = members.find((m) => m.id === transfer.toUserId);
                                  const toLabel = toMember
                                    ? getMemberName(toMember)
                                    : `User #${transfer.toUserId}`;
                                  return (
                                    <div
                                      key={`${entry.userId}-out-${transfer.fromUserId}-${transfer.toUserId}-${transfer.amount}`}
                                      className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-slate-600">
                                          {label} → {toLabel}
                                        </span>
                                        <span className="text-xs font-semibold text-rose-700">
                                          {formatMoney(transfer.amount)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {transfers.map((transfer) => {
                              const fromMember = members.find((m) => m.id === transfer.fromUserId);
                              const toMember = members.find((m) => m.id === transfer.toUserId);
                              const fromLabel = fromMember
                                ? getMemberName(fromMember)
                                : `User #${transfer.fromUserId}`;
                              const toLabel = toMember
                                ? getMemberName(toMember)
                                : `User #${transfer.toUserId}`;
                              return (
                                <div
                                  key={`${entry.userId}-${transfer.fromUserId}-${transfer.toUserId}-${transfer.amount}`}
                                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-600">
                                      {fromLabel} → {toLabel}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700">
                                      {formatMoney(transfer.amount)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {contributions.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Contributions
                        </div>
                        <div className="mt-2 space-y-2">
                          {contributions.map((contribution, index) => (
                            <div
                              key={`${entry.userId}-${contribution.referenceId ?? index}-${contribution.type ?? "contribution"}`}
                              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-xs font-medium text-slate-900">
                                    {contribution.type
                                      ? contribution.type
                                          .toLowerCase()
                                          .replace(/_/g, " ")
                                          .replace(/\b\w/g, (char) => char.toUpperCase())
                                      : "Contribution"}
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    {formatContributionDescription(contribution.description, memberNameById)}
                                  </div>
                                </div>
                                <span className="text-xs font-semibold text-slate-700">
                                  {formatMoney(contribution.amount)}
                                </span>
                              </div>
                              {contribution.timestamp && (
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {new Date(contribution.timestamp).toLocaleString()} ({getShortTimeZoneLabel(contribution.timestamp)})
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
    </div>
  );
}
