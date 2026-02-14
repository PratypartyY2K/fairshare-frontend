import { PaginationControls } from "../../../../components/ui/PaginationControls";
import { StatusBanner } from "../../../../components/ui/StatusBanner";
import { getRemainingAmount } from "../groupPageUtils";
import type { Expense, Member } from "../types";

type SplitMode = "equal" | "exact" | "percentage" | "shares";

export function ExpensesTab({
  sectionClass,
  activeTab,
  editingExpenseId,
  groupId,
  members,
  getMemberName,
  desc,
  amount,
  paidByUserId,
  splitMode,
  exactAmounts,
  percentages,
  shares,
  addingExpense,
  addExpenseError,
  expenses,
  expensesSort,
  expensesPage,
  expensesPageSize,
  expensesTotalPages,
  expensesTotalItems,
  loadingExpenses,
  expensesError,
  deletingExpenseId,
  deleteExpenseError,
  editDesc,
  editAmount,
  editPaidByUserId,
  editSplitMode,
  editExactAmounts,
  editPercentages,
  editShares,
  updatingExpense,
  updateExpenseError,
  setDesc,
  setAmount,
  setPaidByUserId,
  setSplitMode,
  setExactAmounts,
  setPercentages,
  setShares,
  addExpense,
  setExpensesSort,
  loadExpenses,
  startEditExpense,
  deleteExpense,
  setExpensesPageSize,
  setEditDesc,
  setEditAmount,
  setEditPaidByUserId,
  updateExpense,
  resetEditExpense,
  setEditSplitMode,
  setEditExactAmounts,
  setEditPercentages,
  setEditShares,
}: {
  sectionClass: string;
  activeTab: "members" | "expenses" | "settle" | "explain" | "history";
  editingExpenseId: number | null;
  groupId: number;
  members: Member[];
  getMemberName: (member: Member) => string;
  desc: string;
  amount: string;
  paidByUserId: number | "";
  splitMode: SplitMode;
  exactAmounts: Record<number, string>;
  percentages: Record<number, string>;
  shares: Record<number, string>;
  addingExpense: boolean;
  addExpenseError: string | null;
  expenses: Expense[];
  expensesSort: string;
  expensesPage: number;
  expensesPageSize: number;
  expensesTotalPages: number;
  expensesTotalItems: number;
  loadingExpenses: boolean;
  expensesError: string | null;
  deletingExpenseId: number | null;
  deleteExpenseError: string | null;
  editDesc: string;
  editAmount: string;
  editPaidByUserId: number | "";
  editSplitMode: SplitMode;
  editExactAmounts: Record<number, string>;
  editPercentages: Record<number, string>;
  editShares: Record<number, string>;
  updatingExpense: boolean;
  updateExpenseError: string | null;
  setDesc: (value: string) => void;
  setAmount: (value: string) => void;
  setPaidByUserId: (value: number | "") => void;
  setSplitMode: (value: SplitMode) => void;
  setExactAmounts: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
  setPercentages: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
  setShares: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
  addExpense: () => void;
  setExpensesSort: (value: string) => void;
  loadExpenses: (gid: number, page?: number, pageSize?: number, sort?: string) => Promise<void>;
  startEditExpense: (expense: Expense) => void;
  deleteExpense: (expenseId: number) => void;
  setExpensesPageSize: (size: number) => void;
  setEditDesc: (value: string) => void;
  setEditAmount: (value: string) => void;
  setEditPaidByUserId: (value: number | "") => void;
  updateExpense: () => void;
  resetEditExpense: () => void;
  setEditSplitMode: (value: SplitMode) => void;
  setEditExactAmounts: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
  setEditPercentages: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
  setEditShares: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
}) {
  const exactRemaining =
    splitMode === "exact"
      ? getRemainingAmount(
          amount,
          exactAmounts,
          members.map((member) => member.id),
        )
      : null;

  return (
    <>
      <div className={sectionClass}>
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
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {getMemberName(member)}
                </option>
              ))}
            </select>

            <button
              onClick={addExpense}
              disabled={
                addingExpense ||
                !desc.trim() ||
                !amount ||
                paidByUserId === "" ||
                members.length === 0 ||
                (splitMode === "exact" &&
                  exactRemaining !== null &&
                  Math.abs(exactRemaining) > 0.01)
              }
              className="rounded-xl border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingExpense ? "Saving..." : "Add"}
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
              value={splitMode}
              onChange={(e) => setSplitMode(e.target.value as SplitMode)}
            >
              <option value="equal">Equal split</option>
              <option value="exact">Exact amounts</option>
              <option value="percentage">Percentages</option>
              <option value="shares">Shares</option>
            </select>
          </div>

          {splitMode === "exact" && (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Exact amounts
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {(() => {
                  const remaining = getRemainingAmount(
                    amount,
                    exactAmounts,
                    members.map((member) => member.id),
                  );
                  if (remaining === null) return "Enter a total amount first.";
                  const label = remaining < 0 ? "Over by" : "Remaining";
                  return `${label}: $${Math.abs(remaining).toFixed(2)}`;
                })()}
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

          {splitMode === "shares" && (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Shares
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
                      placeholder="1"
                      inputMode="numeric"
                      value={shares[member.id] ?? ""}
                      onChange={(e) =>
                        setShares((prev) => ({
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
        {addingExpense && (
          <StatusBanner variant="loading" message="Adding expense..." />
        )}
        {addExpenseError && (
          <StatusBanner
            variant="error"
            message={addExpenseError}
            onRetry={addExpense}
          />
        )}
      </div>

      <div className={sectionClass}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Expenses
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <span>Date</span>
              <button
                className={`rounded border px-1 leading-none ${expensesSort === "createdAt,asc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => {
                  setExpensesSort("createdAt,asc");
                  if (Number.isFinite(groupId)) {
                    void loadExpenses(groupId, 1, expensesPageSize, "createdAt,asc");
                  }
                }}
                disabled={loadingExpenses}
                aria-label="Sort expenses by date ascending"
              >
                ▲
              </button>
              <button
                className={`rounded border px-1 leading-none ${expensesSort === "createdAt,desc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => {
                  setExpensesSort("createdAt,desc");
                  if (Number.isFinite(groupId)) {
                    void loadExpenses(groupId, 1, expensesPageSize, "createdAt,desc");
                  }
                }}
                disabled={loadingExpenses}
                aria-label="Sort expenses by date descending"
              >
                ▼
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span>Amount</span>
              <button
                className={`rounded border px-1 leading-none ${expensesSort === "amount,asc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => {
                  setExpensesSort("amount,asc");
                  if (Number.isFinite(groupId)) {
                    void loadExpenses(groupId, 1, expensesPageSize, "amount,asc");
                  }
                }}
                disabled={loadingExpenses}
                aria-label="Sort expenses by amount ascending"
              >
                ▲
              </button>
              <button
                className={`rounded border px-1 leading-none ${expensesSort === "amount,desc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                onClick={() => {
                  setExpensesSort("amount,desc");
                  if (Number.isFinite(groupId)) {
                    void loadExpenses(groupId, 1, expensesPageSize, "amount,desc");
                  }
                }}
                disabled={loadingExpenses}
                aria-label="Sort expenses by amount descending"
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        {loadingExpenses && (
          <StatusBanner variant="loading" message="Loading expenses..." />
        )}
        {expensesError && (
          <StatusBanner
            variant="error"
            message={expensesError}
            onRetry={() => Number.isFinite(groupId) && loadExpenses(groupId, expensesPage)}
          />
        )}
        {deleteExpenseError && (
          <StatusBanner variant="error" message={deleteExpenseError} />
        )}
        {!loadingExpenses && !expensesError && expenses.length === 0 && (
          <StatusBanner
            variant="empty"
            message="No expenses yet. Add the first one above."
          />
        )}
        {!loadingExpenses && !expensesError && expenses.length > 0 && (
          <div className="mt-4 max-h-72 overflow-y-auto pr-1">
            <ul className="space-y-3">
              {expenses.map((expense, index) => (
                <li
                  key={`${expense.expenseId ?? "new"}-${expense.payerUserId}-${expense.amount}-${expense.createdAt ?? index}`}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {expense.description}
                      </div>
                      <div className="text-xs text-slate-500">
                        Paid by{" "}
                        {(() => {
                          const member = members.find((m) => m.id === expense.payerUserId);
                          return member ? getMemberName(member) : "Unknown member";
                        })()}
                      </div>
                      {expense.splits && expense.splits.length > 0 && (
                        <div className="mt-2 space-y-1 text-xs text-slate-500">
                          {expense.splits.map((split) => {
                            const member = members.find((m) => m.id === split.userId);
                            const label = member ? getMemberName(member) : `User #${split.userId}`;
                            return (
                              <div key={`${expense.expenseId}-${split.userId}`}>
                                {label}: ${Number(split.shareAmount).toFixed(2)}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold">
                        ${Number(expense.amount).toFixed(2)}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          className="underline"
                          onClick={() => startEditExpense(expense)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-rose-600 underline"
                          disabled={deletingExpenseId === expense.expenseId}
                          onClick={() => deleteExpense(expense.expenseId)}
                        >
                          {deletingExpenseId === expense.expenseId ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!loadingExpenses && !expensesError && expensesTotalItems > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {expensesPage} of {expensesTotalPages} ({expensesTotalItems} expenses)
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <span>Page size</span>
                <select
                  className="rounded-xl border border-slate-300 bg-white px-2 py-1"
                  value={expensesPageSize}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    setExpensesPageSize(nextSize);
                    if (Number.isFinite(groupId)) {
                      void loadExpenses(groupId, 1, nextSize);
                    }
                  }}
                  disabled={loadingExpenses}
                >
                  {[5, 10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <PaginationControls
                currentPage={expensesPage}
                totalPages={expensesTotalPages}
                loading={loadingExpenses}
                className="mt-3 flex items-center justify-end gap-2 text-xs"
                onPageChange={(page) => Number.isFinite(groupId) && void loadExpenses(groupId, page)}
              />
            </div>
          </div>
        )}
      </div>

      {activeTab === "expenses" && editingExpenseId !== null && (
        <div className={sectionClass}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Update expense
          </h2>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
              placeholder="Description"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
                placeholder="Amount (e.g., 42.50)"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                inputMode="decimal"
              />

              <select
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
                value={editPaidByUserId}
                onChange={(e) =>
                  setEditPaidByUserId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">Paid by...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {getMemberName(member)}
                  </option>
                ))}
              </select>

              <button
                onClick={updateExpense}
                disabled={
                  updatingExpense ||
                  !editDesc.trim() ||
                  !editAmount ||
                  editPaidByUserId === "" ||
                  members.length === 0
                }
                className="rounded-xl border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatingExpense ? "Updating..." : "Save"}
              </button>
              <button
                onClick={resetEditExpense}
                disabled={updatingExpense}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
                value={editSplitMode}
                onChange={(e) => setEditSplitMode(e.target.value as SplitMode)}
              >
                <option value="equal">Equal split</option>
                <option value="exact">Exact amounts</option>
                <option value="percentage">Percentages</option>
                <option value="shares">Shares</option>
              </select>
            </div>

            {editSplitMode === "exact" && (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Exact amounts
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {(() => {
                    const remaining = getRemainingAmount(
                      editAmount,
                      editExactAmounts,
                      members.map((member) => member.id),
                    );
                    if (remaining === null) return "Enter a total amount first.";
                    const label = remaining < 0 ? "Over by" : "Remaining";
                    return `${label}: $${Math.abs(remaining).toFixed(2)}`;
                  })()}
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
                        value={editExactAmounts[member.id] ?? ""}
                        onChange={(e) =>
                          setEditExactAmounts((prev) => ({
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

            {editSplitMode === "percentage" && (
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
                        value={editPercentages[member.id] ?? ""}
                        onChange={(e) =>
                          setEditPercentages((prev) => ({
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

            {editSplitMode === "shares" && (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Shares
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
                        placeholder="1"
                        inputMode="numeric"
                        value={editShares[member.id] ?? ""}
                        onChange={(e) =>
                          setEditShares((prev) => ({
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
          {updatingExpense && (
            <StatusBanner variant="loading" message="Updating expense..." />
          )}
          {updateExpenseError && (
            <StatusBanner
              variant="error"
              message={updateExpenseError}
              onRetry={updateExpense}
            />
          )}
        </div>
      )}
    </>
  );
}
