"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import type { PaginatedResponse } from "../../../lib/pagination";

type Member = {
  id: number;
  name?: string;
};

type GroupResponse = {
  id: number;
  name?: string;
  members: Member[];
};

type Split = {
  userId: number;
  shareAmount: string;
};

type Expense = {
  expenseId: number;
  groupId: number;
  description: string;
  amount: string;
  payerUserId: number;
  createdAt?: string;
  splits?: Split[];
};

type SettlementTransfer = {
  fromUserId: number;
  toUserId: number;
  amount: string;
};

type LedgerEntry = {
  userId: number;
  netBalance: string;
};

type LedgerExplanationTransfer = {
  transferId?: number;
  fromUserId: number;
  toUserId: number;
  amount: string;
  createdAt?: string;
};

type LedgerExplanationExpense = {
  expenseId?: number;
  description?: string;
  amount?: string;
  payerUserId?: number;
  createdAt?: string;
  splits?: Split[];
};

type LedgerExplanationEntry = {
  userId: number;
  netBalance?: string;
  expenses?: LedgerExplanationExpense[];
  contributingExpenses?: LedgerExplanationExpense[];
  transfers?: LedgerExplanationTransfer[];
  contributingTransfers?: LedgerExplanationTransfer[];
  transfersIn?: LedgerExplanationTransfer[];
  transfersOut?: LedgerExplanationTransfer[];
  contributions?: Array<{
    type?: string;
    amount?: string;
    description?: string;
    timestamp?: string;
    referenceId?: number;
  }>;
};

type LedgerExplanationResponse = {
  entries?: LedgerExplanationEntry[];
  users?: LedgerExplanationEntry[];
  items?: LedgerExplanationEntry[];
  explanations?: LedgerExplanationEntry[];
  data?: LedgerExplanationResponse | LedgerExplanationEntry[];
  result?: LedgerExplanationResponse | LedgerExplanationEntry[];
  payload?: LedgerExplanationResponse | LedgerExplanationEntry[];
  [key: string]: unknown;
};

type EventResponse = {
  eventId: number;
  groupId: number;
  expenseId?: number;
  eventType: string;
  payload: string;
  createdAt: string;
};

type ConfirmedTransfer = {
  id: number;
  groupId: number;
  fromUserId: number;
  toUserId: number;
  amount: string;
  confirmationId?: string;
  createdAt: string;
};

type BannerVariant = "loading" | "empty" | "error" | "info";
type GroupTab = "members" | "expenses" | "settle" | "explain" | "history";

function StatusBanner({
  variant,
  message,
  onRetry,
}: {
  variant: BannerVariant;
  message: string;
  onRetry?: () => void;
}) {
  const styles = {
    loading: "border-slate-200 bg-slate-50 text-slate-700",
    empty: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
  }[variant];
  const icon = {
    loading: "⏳",
    empty: "🗂️",
    error: "⚠️",
    info: "ℹ️",
  }[variant];

  return (
    <div
      className={`mt-3 flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${styles}`}
    >
      <div className="flex items-start gap-2">
        <span aria-hidden="true">{icon}</span>
        <span>{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="text-xs underline">
          Retry
        </button>
      )}
    </div>
  );
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

function toApiPage(uiPage: number) {
  return Math.max(0, uiPage - 1);
}

function toUiPage(apiPage: number) {
  return Math.max(1, apiPage + 1);
}

function PaginationControls({
  currentPage,
  totalPages,
  loading,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-xs">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={loading || currentPage <= 1}
        className="rounded-xl border border-slate-300 bg-white px-3 py-1 disabled:opacity-50"
      >
        Previous
      </button>
      {visiblePages.map((page, index) => {
        const showGap = index > 0 && visiblePages[index - 1] < page - 1;
        return (
          <span key={`page-${page}`} className="flex items-center gap-2">
            {showGap && <span className="text-slate-400">…</span>}
            <button
              onClick={() => onPageChange(page)}
              disabled={loading}
              className={`rounded-xl border px-3 py-1 disabled:opacity-50 ${
                page === currentPage
                  ? "border-slate-900 bg-slate-900 font-semibold text-white ring-2 ring-slate-300"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {page}
            </button>
          </span>
        );
      })}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={loading || currentPage >= totalPages}
        className="rounded-xl border border-slate-300 bg-white px-3 py-1 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

export default function GroupPage() {
  const defaultPageSize = 10;
  const defaultListSort = "createdAt,desc";
  const pathname = usePathname();
  const groupId = useMemo(() => {
    if (!pathname) return NaN;
    const parts = pathname.split("/").filter(Boolean);
    return Number(parts[1]);
  }, [pathname]);
  const currentUserStorageKey = useMemo(
    () =>
      Number.isFinite(groupId)
        ? `fairshare:group:${groupId}:current-user-id`
        : "",
    [groupId],
  );

  const [members, setMembers] = useState<Member[]>([]);
  const [userName, setUserName] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [savingGroupName, setSavingGroupName] = useState(false);
  const [renameGroupError, setRenameGroupError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesPage, setExpensesPage] = useState(1);
  const [expensesPageSize, setExpensesPageSize] = useState(defaultPageSize);
  const [expensesTotalPages, setExpensesTotalPages] = useState(1);
  const [expensesTotalItems, setExpensesTotalItems] = useState(0);
  const [expensesSort, setExpensesSort] = useState(defaultListSort);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [paidByUserId, setPaidByUserId] = useState<number | "">("");
  const [splitMode, setSplitMode] = useState<
    "equal" | "exact" | "percentage" | "shares"
  >("equal");
  const [exactAmounts, setExactAmounts] = useState<Record<number, string>>({});
  const [percentages, setPercentages] = useState<Record<number, string>>({});
  const [shares, setShares] = useState<Record<number, string>>({});

  const [settlements, setSettlements] = useState<SettlementTransfer[]>([]);
  const [addingExpense, setAddingExpense] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [settlementsError, setSettlementsError] = useState<string | null>(null);
  const [addExpenseError, setAddExpenseError] = useState<string | null>(null);
  const [confirmationId, setConfirmationId] = useState("");
  const [confirmationIdError, setConfirmationIdError] = useState<string | null>(
    null,
  );
  const [paidTransfers, setPaidTransfers] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmingTransfers, setConfirmingTransfers] = useState<Set<string>>(
    () => new Set(),
  );
  const [confirmTransferError, setConfirmTransferError] = useState<
    string | null
  >(null);

  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState<string>("");
  const [editPaidByUserId, setEditPaidByUserId] = useState<number | "">("");
  const [editSplitMode, setEditSplitMode] = useState<
    "equal" | "exact" | "percentage" | "shares"
  >("equal");
  const [editExactAmounts, setEditExactAmounts] = useState<
    Record<number, string>
  >({});
  const [editPercentages, setEditPercentages] = useState<
    Record<number, string>
  >({});
  const [editShares, setEditShares] = useState<Record<number, string>>({});
  const [updatingExpense, setUpdatingExpense] = useState(false);
  const [updateExpenseError, setUpdateExpenseError] = useState<string | null>(
    null,
  );
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(
    null,
  );
  const [deleteExpenseError, setDeleteExpenseError] = useState<string | null>(
    null,
  );

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledgerExplanation, setLedgerExplanation] =
    useState<LedgerExplanationResponse | null>(null);
  const [loadingLedgerExplanation, setLoadingLedgerExplanation] =
    useState(false);
  const [ledgerExplanationError, setLedgerExplanationError] = useState<
    string | null
  >(null);
  const [currentUserId, setCurrentUserId] = useState<number | "">("");
  const [selectedLedgerExplanationUserId, setSelectedLedgerExplanationUserId] =
    useState<number | "">("");

  const [events, setEvents] = useState<EventResponse[]>([]);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPageSize, setEventsPageSize] = useState(defaultPageSize);
  const [eventsTotalPages, setEventsTotalPages] = useState(1);
  const [eventsTotalItems, setEventsTotalItems] = useState(0);
  const [eventsSort, setEventsSort] = useState(defaultListSort);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [confirmedTransfers, setConfirmedTransfers] = useState<
    ConfirmedTransfer[]
  >([]);
  const [confirmedTransfersPage, setConfirmedTransfersPage] = useState(1);
  const [confirmedTransfersPageSize, setConfirmedTransfersPageSize] =
    useState(defaultPageSize);
  const [confirmedTransfersTotalPages, setConfirmedTransfersTotalPages] =
    useState(1);
  const [confirmedTransfersTotalItems, setConfirmedTransfersTotalItems] =
    useState(0);
  const [confirmedTransfersSort, setConfirmedTransfersSort] =
    useState(defaultListSort);
  const [loadingConfirmedTransfers, setLoadingConfirmedTransfers] =
    useState(false);
  const [confirmedTransfersError, setConfirmedTransfersError] = useState<
    string | null
  >(null);
  const [confirmedFilter, setConfirmedFilter] = useState("");

  const [owesFromUserId, setOwesFromUserId] = useState<number | "">("");
  const [owesToUserId, setOwesToUserId] = useState<number | "">("");
  const [owesAmount, setOwesAmount] = useState<number | null>(null);
  const [owesHistoricalAmount, setOwesHistoricalAmount] = useState<
    number | null
  >(null);
  const [owesView, setOwesView] = useState<"current" | "historical" | null>(
    null,
  );
  const [loadingOwes, setLoadingOwes] = useState(false);
  const [owesError, setOwesError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GroupTab>("members");

  const cardClassName =
    "rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur";
  const tabs: Array<{ key: GroupTab; label: string }> = [
    { key: "members", label: "Members" },
    { key: "expenses", label: "Expenses" },
    { key: "settle", label: "Settle" },
    { key: "explain", label: "Explain" },
    { key: "history", label: "History" },
  ];

  function getSectionClass(tab: GroupTab) {
    return activeTab === tab ? cardClassName : `${cardClassName} hidden`;
  }

  function getMemberName(member: Member) {
    return member.name?.trim() || "Member";
  }

  function getTransferKey(transfer: SettlementTransfer) {
    const amount = Number(transfer.amount);
    const normalized = Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
    return `${transfer.fromUserId}-${transfer.toUserId}-${normalized}`;
  }

  function formatAmount(value: number) {
    return value.toFixed(2);
  }

  function formatMoney(value?: string | number) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return `$${numeric.toFixed(2)}`;
    if (value === undefined || value === null || value === "") return "—";
    return `$${value}`;
  }

  function formatEventFieldLabel(key: string) {
    const normalized = key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .trim();
    if (!normalized) return "Details";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function parseJsonRecord(value: unknown): Record<string, unknown> | null {
    if (isRecord(value)) return value;
    if (typeof value !== "string") return null;
    try {
      const parsed = JSON.parse(value);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function stripExpenseIds(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stripExpenseIds);
    if (isRecord(value)) {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => key !== "expenseId")
          .map(([key, nested]) => [key, stripExpenseIds(nested)]),
      );
    }
    return value;
  }

  function formatUserById(value: string | number) {
    const numeric =
      typeof value === "number" ? value : Number.parseInt(String(value), 10);
    if (!Number.isFinite(numeric)) return String(value);
    const member = members.find((m) => m.id === numeric);
    return member ? getMemberName(member) : `User #${numeric}`;
  }

  function formatEventFieldValue(key: string, value: unknown) {
    if (value === undefined || value === null) return "—";
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes("amount")) {
      if (typeof value === "number" || typeof value === "string") {
        return formatMoney(value);
      }
    }

    if (lowerKey.endsWith("userid")) {
      if (typeof value === "number" || typeof value === "string") {
        return formatUserById(value);
      }
    }

    if (lowerKey.endsWith("userids") && Array.isArray(value)) {
      return value
        .map((item) =>
          typeof item === "number" || typeof item === "string"
            ? formatUserById(item)
            : String(item),
        )
        .join(", ");
    }

    if (typeof value === "object") {
      return JSON.stringify(stripExpenseIds(value));
    }

    return String(value);
  }

  function areEventValuesEqual(left: unknown, right: unknown) {
    return (
      JSON.stringify(stripExpenseIds(left)) ===
      JSON.stringify(stripExpenseIds(right))
    );
  }

  function formatSignedMoney(value: number) {
    const abs = Math.abs(value);
    return `${value >= 0 ? "+" : "-"}$${abs.toFixed(2)}`;
  }

  function getUserOwesLabel(value: number) {
    if (Math.abs(value) < 0.005) return "settled";
    if (value > 0) return `owes ${formatMoney(value)}`;
    return `is owed ${formatMoney(Math.abs(value))}`;
  }

  function getSplitUserId(split: unknown): number | null {
    if (!isRecord(split)) return null;
    const raw =
      split.userId ?? split.user_id ?? split.memberId ?? split.member_id;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  }

  function getSplitAmountValue(split: unknown): number | null {
    if (!isRecord(split)) return null;
    const raw =
      split.shareAmount ??
      split.share_amount ??
      split.amount ??
      split.value ??
      split.share;
    const amount = Number(raw);
    return Number.isFinite(amount) ? amount : null;
  }

  function getExpenseOwesByUser(value: unknown): Map<number, number> | null {
    if (!isRecord(value)) return null;

    const payerUserId = Number(value.payerUserId);
    const amount = Number(value.amount);
    if (!Number.isFinite(payerUserId) || !Number.isFinite(amount)) return null;

    const shareByUser = getSplitSharesByUser(value);
    if (!shareByUser || shareByUser.size === 0) return null;

    const owesByUser = new Map<number, number>();
    owesByUser.set(payerUserId, -amount);

    for (const [splitUserId, splitAmount] of shareByUser.entries()) {
      owesByUser.set(
        splitUserId,
        (owesByUser.get(splitUserId) ?? 0) + splitAmount,
      );
    }

    return owesByUser;
  }

  function getOwesDiffLines(beforeValue: unknown, afterValue: unknown) {
    const beforeOwes = getExpenseOwesByUser(beforeValue);
    const afterOwes = getExpenseOwesByUser(afterValue);
    if (!beforeOwes || !afterOwes) return [] as string[];

    const allUserIds = Array.from(
      new Set([...beforeOwes.keys(), ...afterOwes.keys()]),
    ).sort((a, b) => a - b);

    const lines = allUserIds
      .map((userId) => {
        const before = beforeOwes.get(userId) ?? 0;
        const after = afterOwes.get(userId) ?? 0;
        if (Math.abs(before - after) < 0.005) return null;

        const member = members.find((m) => m.id === userId);
        const label = member ? getMemberName(member) : `User #${userId}`;
        const delta = after - before;
        return `${label}: ${getUserOwesLabel(before)} -> ${getUserOwesLabel(after)} (delta ${formatSignedMoney(delta)})`;
      })
      .filter((line): line is string => Boolean(line));

    return lines;
  }

  function getSplitSharesByUser(value: unknown): Map<number, number> | null {
    if (!isRecord(value)) return null;

    const sharesByUser = new Map<number, number>();

    if (Array.isArray(value.splits)) {
      for (const split of value.splits) {
        const userId = getSplitUserId(split);
        const shareAmount = getSplitAmountValue(split);
        if (userId === null || shareAmount === null) continue;
        sharesByUser.set(userId, shareAmount);
      }
      if (sharesByUser.size > 0) return sharesByUser;
    }

    const participantUserIds = Array.isArray(value.participantUserIds)
      ? value.participantUserIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id))
      : [];

    if (
      Array.isArray(value.exactAmounts) &&
      participantUserIds.length === value.exactAmounts.length
    ) {
      value.exactAmounts.forEach((amount, index) => {
        const userId = participantUserIds[index];
        const shareAmount = Number(amount);
        if (Number.isFinite(userId) && Number.isFinite(shareAmount)) {
          sharesByUser.set(userId, shareAmount);
        }
      });
      if (sharesByUser.size > 0) return sharesByUser;
    }

    const totalAmount = Number(value.amount);
    if (
      Number.isFinite(totalAmount) &&
      Array.isArray(value.percentages) &&
      participantUserIds.length === value.percentages.length
    ) {
      value.percentages.forEach((percentage, index) => {
        const userId = participantUserIds[index];
        const pct = Number(percentage);
        if (Number.isFinite(userId) && Number.isFinite(pct)) {
          sharesByUser.set(userId, (totalAmount * pct) / 100);
        }
      });
      if (sharesByUser.size > 0) return sharesByUser;
    }

    if (
      Number.isFinite(totalAmount) &&
      Array.isArray(value.shares) &&
      participantUserIds.length === value.shares.length
    ) {
      const shareCounts = value.shares.map((count) => Number(count));
      const totalShares = shareCounts.reduce(
        (sum, count) => sum + (Number.isFinite(count) ? count : 0),
        0,
      );
      if (totalShares > 0) {
        shareCounts.forEach((count, index) => {
          const userId = participantUserIds[index];
          if (Number.isFinite(userId) && Number.isFinite(count)) {
            sharesByUser.set(userId, (totalAmount * count) / totalShares);
          }
        });
        if (sharesByUser.size > 0) return sharesByUser;
      }
    }

    const splitByUser = value.splitByUserId ?? value.sharesByUserId;
    if (isRecord(splitByUser)) {
      for (const [rawUserId, rawAmount] of Object.entries(splitByUser)) {
        const userId = Number(rawUserId);
        const shareAmount = Number(rawAmount);
        if (Number.isFinite(userId) && Number.isFinite(shareAmount)) {
          sharesByUser.set(userId, shareAmount);
        }
      }
      if (sharesByUser.size > 0) return sharesByUser;
    }

    return null;
  }

  function getSplitDiffLines(beforeValue: unknown, afterValue: unknown) {
    const beforeShares = getSplitSharesByUser(beforeValue);
    const afterShares = getSplitSharesByUser(afterValue);
    if (!beforeShares || !afterShares) return [] as string[];

    const allUserIds = Array.from(
      new Set([...beforeShares.keys(), ...afterShares.keys()]),
    ).sort((a, b) => a - b);

    return allUserIds
      .map((userId) => {
        const before = beforeShares.get(userId) ?? 0;
        const after = afterShares.get(userId) ?? 0;
        if (Math.abs(before - after) < 0.005) return null;

        const member = members.find((m) => m.id === userId);
        const label = member ? getMemberName(member) : `User #${userId}`;
        const delta = after - before;
        return `${label}: ${formatMoney(before)} -> ${formatMoney(after)} (delta ${formatSignedMoney(delta)})`;
      })
      .filter((line): line is string => Boolean(line));
  }

  function buildEventDiffLines(
    beforeValue: unknown,
    afterValue: unknown,
    path: string[] = [],
  ): string[] {
    if (isRecord(beforeValue) && isRecord(afterValue)) {
      const keys = Array.from(
        new Set([...Object.keys(beforeValue), ...Object.keys(afterValue)]),
      ).filter((key) => key !== "expenseId");

      return keys.flatMap((key) =>
        buildEventDiffLines(beforeValue[key], afterValue[key], [...path, key]),
      );
    }

    if (areEventValuesEqual(beforeValue, afterValue)) return [];
    const label =
      path.length > 0
        ? path.map((segment) => formatEventFieldLabel(segment)).join(" ")
        : "Value";
    const leafKey = path[path.length - 1] ?? "value";
    return [
      `${label}: ${formatEventFieldValue(leafKey, beforeValue)} -> ${formatEventFieldValue(leafKey, afterValue)}`,
    ];
  }

  function formatEventPayload(payload: string) {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return payload;
      }

      const beforeValue = parseJsonRecord(parsed.before ?? parsed.Before);
      const afterValue = parseJsonRecord(parsed.after ?? parsed.After);
      if (isRecord(beforeValue) && isRecord(afterValue)) {
        const diffLines = buildEventDiffLines(beforeValue, afterValue);
        const splitDiffLines = getSplitDiffLines(beforeValue, afterValue);
        const owesDiffLines = getOwesDiffLines(beforeValue, afterValue);
        if (
          diffLines.length === 0 &&
          splitDiffLines.length === 0 &&
          owesDiffLines.length === 0
        ) {
          return "No dispute-impacting changes found.";
        }

        const sections: string[] = [];
        if (splitDiffLines.length > 0) {
          sections.push("Split changes per person:");
          sections.push(...splitDiffLines);
        }
        if (owesDiffLines.length > 0) {
          sections.push("Owes changes:");
          sections.push(...owesDiffLines);
        }
        if (diffLines.length > 0) {
          sections.push("Field changes:");
          sections.push(...diffLines);
        }

        return sections.join("\n");
      }

      const lines = Object.entries(parsed)
        .filter(([key]) => key !== "expenseId")
        .flatMap(([key, value]) => {
          const label = formatEventFieldLabel(key);
          if (isRecord(value)) {
            const nestedEntries = Object.entries(
              stripExpenseIds(value) as Record<string, unknown>,
            );
            if (nestedEntries.length === 0) return `${label}: —`;
            return nestedEntries.map(([nestedKey, nestedValue]) => {
              const nestedLabel = formatEventFieldLabel(nestedKey);
              return `${label} ${nestedLabel}: ${formatEventFieldValue(
                nestedKey,
                nestedValue,
              )}`;
            });
          }
          return `${label}: ${formatEventFieldValue(key, value)}`;
        });

      return lines.length > 0 ? lines.join("\n") : "No additional details";
    } catch {
      return payload;
    }
  }

  function getShortTimeZoneLabel(dateInput: string) {
    const date = new Date(dateInput);
    const part = new Intl.DateTimeFormat("en-US", {
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? "Local";
  }

  function getLedgerExplanationEntries(
    explanation: LedgerExplanationResponse | null,
  ) {
    if (!explanation) return [];

    const candidates = [
      explanation.entries,
      explanation.users,
      explanation.items,
      explanation.explanations,
      Array.isArray(explanation.data) ? explanation.data : undefined,
      Array.isArray(explanation.result) ? explanation.result : undefined,
      Array.isArray(explanation.payload) ? explanation.payload : undefined,
    ];
    const directList = candidates.find((candidate) => Array.isArray(candidate));
    if (Array.isArray(directList)) return directList;

    const nested =
      (explanation.data && !Array.isArray(explanation.data)
        ? getLedgerExplanationEntries(
            explanation.data as LedgerExplanationResponse,
          )
        : []) ||
      (explanation.result && !Array.isArray(explanation.result)
        ? getLedgerExplanationEntries(
            explanation.result as LedgerExplanationResponse,
          )
        : []) ||
      (explanation.payload && !Array.isArray(explanation.payload)
        ? getLedgerExplanationEntries(
            explanation.payload as LedgerExplanationResponse,
          )
        : []);
    if (Array.isArray(nested) && nested.length > 0) return nested;

    // Support map-like responses: { "12": {...entry without userId...}, "34": {...} }
    const mapped = Object.entries(explanation)
      .filter(([key, value]) => {
        if (!value || typeof value !== "object" || Array.isArray(value))
          return false;
        return key !== "data" && key !== "result" && key !== "payload";
      })
      .map(([key, value]) => {
        const entry = value as LedgerExplanationEntry;
        const parsedUserId = Number(key);
        return {
          ...entry,
          userId: Number.isFinite(entry.userId)
            ? entry.userId
            : Number.isFinite(parsedUserId)
              ? parsedUserId
              : -1,
        } satisfies LedgerExplanationEntry;
      })
      .filter((entry) => entry.userId >= 0);
    if (mapped.length > 0) return mapped;

    return [];
  }

  function getLedgerWhyParts(entry: LedgerExplanationEntry) {
    const parts: string[] = [];
    const expenses = entry.expenses ?? entry.contributingExpenses ?? [];
    const transfersIn = entry.transfersIn ?? [];
    const transfersOut = entry.transfersOut ?? [];
    const transfers = entry.transfers ?? entry.contributingTransfers ?? [];
    const contributions = entry.contributions ?? [];

    if (expenses.length > 0) {
      parts.push(
        `${expenses.length} expense${expenses.length === 1 ? "" : "s"}`,
      );
    }

    if (transfersIn.length > 0 || transfersOut.length > 0) {
      parts.push(
        `${transfersIn.length} incoming / ${transfersOut.length} outgoing transfer${transfersIn.length + transfersOut.length === 1 ? "" : "s"}`,
      );
    } else if (transfers.length > 0) {
      parts.push(
        `${transfers.length} transfer${transfers.length === 1 ? "" : "s"}`,
      );
    }

    const reasons = contributions
      .map((contribution) =>
        formatContributionDescription(contribution.description),
      )
      .filter((reason) => reason !== "—")
      .slice(0, 2);
    if (reasons.length > 0) {
      parts.push(reasons.join(" • "));
    }

    return parts;
  }

  function formatContributionDescription(description?: string) {
    if (!description?.trim()) return "—";
    return description.replace(/user\s+#?(\d+)/gi, (_, userIdText: string) => {
      const userId = Number(userIdText);
      if (!Number.isFinite(userId)) return `user ${userIdText}`;
      const member = members.find((m) => m.id === userId);
      return member ? getMemberName(member) : `User #${userId}`;
    });
  }

  function getRemainingAmount(
    total: string,
    amounts: Record<number, string>,
    ids: number[],
  ) {
    const totalValue = Number(total);
    if (!Number.isFinite(totalValue)) return null;
    const sum = ids.reduce((acc, id) => {
      const value = Number(amounts[id] ?? "");
      return acc + (Number.isFinite(value) ? value : 0);
    }, 0);
    return totalValue - sum;
  }

  function generateUuid() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    const bytes = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256),
    );
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return bytes
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
  }

  function buildMemberValueMap(
    membersList: Member[],
    seed: Record<number, string> = {},
  ) {
    return membersList.reduce<Record<number, string>>((acc, member) => {
      acc[member.id] = seed[member.id] ?? "";
      return acc;
    }, {});
  }

  async function confirmPaidTransfer(transfer: SettlementTransfer) {
    const key = getTransferKey(transfer);
    if (confirmingTransfers.has(key)) return;
    const isPaid = paidTransfers.has(key);
    if (isPaid) return;

    setConfirmingTransfers((prev) => new Set(prev).add(key));
    try {
      const confirmationHeader = confirmationId.trim();
      setConfirmTransferError(null);
      await api<void>(`/groups/${groupId}/settlements/confirm`, {
        method: "POST",
        confirmationId: confirmationHeader || undefined,
        body: JSON.stringify({
          confirmationId: confirmationHeader || undefined,
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
      setConfirmTransferError(
        e instanceof Error ? e.message : "Failed to confirm transfer",
      );
    } finally {
      setConfirmingTransfers((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function generateConfirmationIdFromApi() {
    if (!Number.isFinite(groupId)) return;
    try {
      setConfirmationIdError(null);
      const res = await api<{ confirmationId: string }>(
        `/groups/${groupId}/api/confirmation-id`,
      );
      setConfirmationId(res?.confirmationId ?? "");
    } catch (e: unknown) {
      setConfirmationIdError(
        e instanceof Error ? e.message : "Failed to generate confirmation ID",
      );
    }
  }

  async function loadGroup(gid: number) {
    setGroupError(null);
    setMembersError(null);
    setLoadingMembers(true);
    try {
      const group = await api<GroupResponse>(`/groups/${gid}`);
      setMembers(group.members ?? []);
      setGroupName(group.name ?? null);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? (e.message ?? "Failed to load group") : String(e);
      setGroupError(message || "Failed to load group");
      setMembersError(message || "Failed to load group");
    } finally {
      setLoadingMembers(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    loadGroup(groupId);
    loadExpenses(groupId, 1);
    loadSettlements(groupId);
    loadLedger(groupId);
    loadEvents(groupId, 1);

    setLoadingLedgerExplanation(true);
    setLedgerExplanationError(null);
    void api<LedgerExplanationResponse>(
      `/groups/${groupId}/explanations/ledger`,
    )
      .then((res) => {
        setLedgerExplanation(res);
      })
      .catch((e: unknown) => {
        setLedgerExplanationError(
          e instanceof Error ? e.message : "Failed to load ledger explanation",
        );
      })
      .finally(() => {
        setLoadingLedgerExplanation(false);
      });

    setLoadingConfirmedTransfers(true);
    setConfirmedTransfersError(null);
    void api<PaginatedResponse<ConfirmedTransfer>>(
      `/groups/${groupId}/confirmed-transfers?page=0&size=${defaultPageSize}&sort=${encodeURIComponent(defaultListSort)}`,
    )
      .then((res) => {
        setConfirmedTransfers(res.items ?? []);
        setConfirmedTransfersPage(
          Number.isFinite(res.currentPage) && res.currentPage > 0
            ? res.currentPage
            : 1,
        );
        setConfirmedTransfersTotalPages(
          Number.isFinite(res.totalPages) && res.totalPages > 0
            ? res.totalPages
            : 1,
        );
        setConfirmedTransfersTotalItems(
          Number.isFinite(res.totalItems) && res.totalItems >= 0
            ? res.totalItems
            : 0,
        );
      })
      .catch((e: unknown) => {
        setConfirmedTransfersError(
          e instanceof Error ? e.message : "Failed to load confirmed transfers",
        );
      })
      .finally(() => {
        setLoadingConfirmedTransfers(false);
      });
  }, [groupId]);

  useEffect(() => {
    setExactAmounts((prev) => buildMemberValueMap(members, prev));
    setPercentages((prev) => buildMemberValueMap(members, prev));
    setShares((prev) => buildMemberValueMap(members, prev));
    setEditExactAmounts((prev) => buildMemberValueMap(members, prev));
    setEditPercentages((prev) => buildMemberValueMap(members, prev));
    setEditShares((prev) => buildMemberValueMap(members, prev));
  }, [members]);

  const ledgerExplanationEntries =
    getLedgerExplanationEntries(ledgerExplanation);
  const ledgerExplanationByUserId = useMemo(
    () =>
      new Map(
        ledgerExplanationEntries.map((entry) => [entry.userId, entry] as const),
      ),
    [ledgerExplanationEntries],
  );

  useEffect(() => {
    if (!currentUserStorageKey) {
      setCurrentUserId("");
      return;
    }

    try {
      const stored = window.localStorage.getItem(currentUserStorageKey);
      if (!stored) return;
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) {
        setCurrentUserId(parsed);
      }
    } catch {
      // Ignore localStorage access issues in restricted environments.
    }
  }, [currentUserStorageKey]);

  useEffect(() => {
    if (members.length === 0) {
      setCurrentUserId("");
      return;
    }

    setCurrentUserId((prev) => {
      if (prev !== "" && members.some((member) => member.id === prev)) {
        return prev;
      }
      return members[0].id;
    });
  }, [members]);

  useEffect(() => {
    if (!currentUserStorageKey || currentUserId === "") return;

    try {
      window.localStorage.setItem(currentUserStorageKey, String(currentUserId));
    } catch {
      // Ignore localStorage access issues in restricted environments.
    }
  }, [currentUserStorageKey, currentUserId]);

  useEffect(() => {
    setSelectedLedgerExplanationUserId((prev) => {
      if (ledgerExplanationEntries.length === 0) return "";
      if (
        prev !== "" &&
        ledgerExplanationEntries.some((entry) => entry.userId === prev)
      ) {
        return prev;
      }
      if (
        currentUserId !== "" &&
        ledgerExplanationEntries.some((entry) => entry.userId === currentUserId)
      ) {
        return currentUserId;
      }
      return ledgerExplanationEntries[0].userId;
    });
  }, [ledgerExplanationEntries, currentUserId]);

  async function addMember() {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    setAddMemberError(null);
    setAddingMember(true);
    try {
      await api<{ userId: number; name: string }>(
        `/groups/${groupId}/members`,
        {
          method: "POST",
          body: JSON.stringify({ name: userName }),
        },
      );
      setUserName("");
      await loadGroup(groupId);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setAddMemberError(e.message ?? "Failed to add member");
      } else {
        setAddMemberError(String(e) || "Failed to add member");
      }
    } finally {
      setAddingMember(false);
    }
  }

  async function saveGroupName() {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    const trimmedName = editingGroupName.trim();
    if (!trimmedName) {
      setRenameGroupError("Group name cannot be empty");
      return;
    }

    setRenameGroupError(null);
    setSavingGroupName(true);
    try {
      const res = await api<GroupResponse>(`/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmedName }),
      });
      setGroupName(res.name ?? trimmedName);
      setMembers(res.members ?? []);
      setEditingGroupName("");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setRenameGroupError(e.message ?? "Failed to update group");
      } else {
        setRenameGroupError(String(e) || "Failed to update group");
      }
    } finally {
      setSavingGroupName(false);
    }
  }

  async function loadExpenses(
    gid: number,
    page = expensesPage,
    pageSize = expensesPageSize,
    sort = expensesSort,
  ) {
    setLoadingExpenses(true);
    setExpensesError(null);
    try {
      const query = new URLSearchParams({
        page: String(toApiPage(page)),
        size: String(pageSize),
        sort,
      });
      const res = await api<PaginatedResponse<Expense>>(
        `/groups/${gid}/expenses?${query.toString()}`,
      );
      setExpenses(res.items ?? []);
      setExpensesPage(
        Number.isFinite(res.currentPage) && res.currentPage >= 0
          ? toUiPage(res.currentPage)
          : page,
      );
      setExpensesTotalPages(
        Number.isFinite(res.totalPages) && res.totalPages > 0
          ? res.totalPages
          : 1,
      );
      setExpensesTotalItems(
        Number.isFinite(res.totalItems) && res.totalItems >= 0
          ? res.totalItems
          : 0,
      );
    } catch (e: unknown) {
      setExpensesError(
        e instanceof Error ? e.message : "Failed to load expenses",
      );
    } finally {
      setLoadingExpenses(false);
    }
  }

  async function loadSettlements(gid: number) {
    setLoadingSettlements(true);
    setSettlementsError(null);
    try {
      const res = await api<{ transfers: SettlementTransfer[] }>(
        `/groups/${gid}/settlements`,
      );
      setSettlements(res.transfers ?? []);
    } catch (e: unknown) {
      setSettlementsError(
        e instanceof Error ? e.message : "Failed to load settlements",
      );
    } finally {
      setLoadingSettlements(false);
    }
  }

  async function loadLedger(gid: number) {
    setLoadingLedger(true);
    setLedgerError(null);
    try {
      const res = await api<{ entries: LedgerEntry[] }>(
        `/groups/${gid}/ledger`,
      );
      setLedgerEntries(res.entries ?? []);
    } catch (e: unknown) {
      setLedgerError(e instanceof Error ? e.message : "Failed to load ledger");
    } finally {
      setLoadingLedger(false);
    }
  }

  async function loadLedgerExplanation(gid: number) {
    setLoadingLedgerExplanation(true);
    setLedgerExplanationError(null);
    try {
      const res = await api<LedgerExplanationResponse>(
        `/groups/${gid}/explanations/ledger`,
      );
      setLedgerExplanation(res);
    } catch (e: unknown) {
      setLedgerExplanationError(
        e instanceof Error ? e.message : "Failed to load ledger explanation",
      );
    } finally {
      setLoadingLedgerExplanation(false);
    }
  }

  async function loadEvents(
    gid: number,
    page = eventsPage,
    pageSize = eventsPageSize,
    sort = eventsSort,
  ) {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      const query = new URLSearchParams({
        page: String(toApiPage(page)),
        size: String(pageSize),
        sort,
      });
      const res = await api<PaginatedResponse<EventResponse>>(
        `/groups/${gid}/events?${query.toString()}`,
      );
      setEvents(res.items ?? []);
      setEventsPage(
        Number.isFinite(res.currentPage) && res.currentPage >= 0
          ? toUiPage(res.currentPage)
          : page,
      );
      setEventsTotalPages(
        Number.isFinite(res.totalPages) && res.totalPages > 0
          ? res.totalPages
          : 1,
      );
      setEventsTotalItems(
        Number.isFinite(res.totalItems) && res.totalItems >= 0
          ? res.totalItems
          : 0,
      );
    } catch (e: unknown) {
      setEventsError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoadingEvents(false);
    }
  }

  async function loadConfirmedTransfers(
    gid: number,
    page = confirmedTransfersPage,
    pageSize = confirmedTransfersPageSize,
    sort = confirmedTransfersSort,
  ) {
    setLoadingConfirmedTransfers(true);
    setConfirmedTransfersError(null);
    try {
      const query = new URLSearchParams({
        page: String(toApiPage(page)),
        size: String(pageSize),
        sort,
      });
      if (confirmedFilter.trim()) {
        query.set("confirmationId", confirmedFilter.trim());
      }
      const res = await api<PaginatedResponse<ConfirmedTransfer>>(
        `/groups/${gid}/confirmed-transfers?${query.toString()}`,
      );
      setConfirmedTransfers(res.items ?? []);
      setConfirmedTransfersPage(
        Number.isFinite(res.currentPage) && res.currentPage >= 0
          ? toUiPage(res.currentPage)
          : page,
      );
      setConfirmedTransfersTotalPages(
        Number.isFinite(res.totalPages) && res.totalPages > 0
          ? res.totalPages
          : 1,
      );
      setConfirmedTransfersTotalItems(
        Number.isFinite(res.totalItems) && res.totalItems >= 0
          ? res.totalItems
          : 0,
      );
    } catch (e: unknown) {
      setConfirmedTransfersError(
        e instanceof Error ? e.message : "Failed to load confirmed transfers",
      );
    } finally {
      setLoadingConfirmedTransfers(false);
    }
  }

  async function loadOwes(gid: number) {
    if (
      owesFromUserId === "" ||
      owesToUserId === "" ||
      owesFromUserId === owesToUserId
    ) {
      return;
    }
    setOwesView("current");
    setLoadingOwes(true);
    setOwesError(null);
    try {
      const res = await api<{ amount: string }>(
        `/groups/${gid}/owes?fromUserId=${owesFromUserId}&toUserId=${owesToUserId}`,
      );
      const value = Number(res.amount);
      setOwesAmount(Number.isFinite(value) ? value : 0);
    } catch (e: unknown) {
      setOwesError(e instanceof Error ? e.message : "Failed to load owes");
    } finally {
      setLoadingOwes(false);
    }
  }

  async function loadOwesHistorical(gid: number) {
    if (
      owesFromUserId === "" ||
      owesToUserId === "" ||
      owesFromUserId === owesToUserId
    ) {
      return;
    }
    setOwesView("historical");
    setLoadingOwes(true);
    setOwesError(null);
    try {
      const res = await api<{ amount: string }>(
        `/groups/${gid}/owes/historical?fromUserId=${owesFromUserId}&toUserId=${owesToUserId}`,
      );
      const value = Number(res.amount);
      setOwesHistoricalAmount(Number.isFinite(value) ? value : 0);
    } catch (e: unknown) {
      setOwesError(
        e instanceof Error ? e.message : "Failed to load historical owes",
      );
    } finally {
      setLoadingOwes(false);
    }
  }

  async function addExpense() {
    if (!Number.isFinite(groupId)) return;
    if (!desc.trim()) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (paidByUserId === "") return;

    setAddExpenseError(null);
    setAddingExpense(true);
    const participantUserIds = members.map((m) => m.id);
    if (participantUserIds.length === 0) {
      setAddingExpense(false);
      return;
    }
    const sharesList =
      splitMode === "shares"
        ? participantUserIds.map((id) => Number(shares[id] ?? ""))
        : [];
    const exactAmountNumbers =
      splitMode === "exact"
        ? participantUserIds.map((id) => Number(exactAmounts[id] ?? ""))
        : [];
    const percentageNumbers =
      splitMode === "percentage"
        ? participantUserIds.map((id) => Number(percentages[id] ?? ""))
        : [];

    if (
      splitMode === "exact" &&
      exactAmountNumbers.some((val) => !Number.isFinite(val))
    ) {
      setAddExpenseError("Enter an exact amount for each member.");
      setAddingExpense(false);
      return;
    }
    if (
      splitMode === "percentage" &&
      percentageNumbers.some((val) => !Number.isFinite(val))
    ) {
      setAddExpenseError("Enter a percentage for each member.");
      setAddingExpense(false);
      return;
    }
    if (
      splitMode === "shares" &&
      sharesList.some((val) => !Number.isFinite(val) || val < 1)
    ) {
      setAddExpenseError("Enter a share count (>= 1) for each member.");
      setAddingExpense(false);
      return;
    }
    if (splitMode === "exact") {
      const exactSum = exactAmountNumbers.reduce((sum, val) => sum + val, 0);
      if (Math.abs(exactSum - amt) > 0.01) {
        setAddExpenseError("Exact amounts must add up to the total.");
        setAddingExpense(false);
        return;
      }
    }
    if (splitMode === "percentage") {
      const percentageSum = percentageNumbers.reduce(
        (sum, val) => sum + val,
        0,
      );
      if (Math.abs(percentageSum - 100) > 0.01) {
        setAddExpenseError("Percentages must add up to 100%.");
        setAddingExpense(false);
        return;
      }
    }

    try {
      const payload: Record<string, unknown> = {
        description: desc,
        amount: formatAmount(amt),
        payerUserId: paidByUserId,
        participantUserIds,
      };
      if (splitMode === "shares") payload.shares = sharesList;
      if (splitMode === "exact") {
        payload.exactAmounts = exactAmountNumbers.map(formatAmount);
      }
      if (splitMode === "percentage") {
        payload.percentages = percentageNumbers.map(formatAmount);
      }

      await api<void>(`/groups/${groupId}/expenses`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setDesc("");
      setAmount("");
      setPaidByUserId("");
      setExactAmounts({});
      setPercentages({});
      setShares({});
      setSplitMode("equal");

      await Promise.all([
        loadExpenses(groupId),
        loadSettlements(groupId),
        loadEvents(groupId),
      ]);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setAddExpenseError(e.message ?? "Failed to add expense");
      } else {
        setAddExpenseError(String(e) || "Failed to add expense");
      }
    } finally {
      setAddingExpense(false);
    }
  }

  function startEditExpense(expense: Expense) {
    setEditingExpenseId(expense.expenseId);
    setEditDesc(expense.description ?? "");
    setEditAmount(String(expense.amount ?? ""));
    setEditPaidByUserId(expense.payerUserId ?? "");
    setEditSplitMode("equal");
    const splitSeed = (expense.splits ?? []).reduce<Record<number, string>>(
      (acc, split) => {
        acc[split.userId] = String(split.shareAmount);
        return acc;
      },
      {},
    );
    setEditExactAmounts(buildMemberValueMap(members, splitSeed));
    setEditPercentages(buildMemberValueMap(members));
    setEditShares(buildMemberValueMap(members, splitSeed));
  }

  function resetEditExpense() {
    setEditingExpenseId(null);
    setEditDesc("");
    setEditAmount("");
    setEditPaidByUserId("");
    setEditSplitMode("equal");
    setEditExactAmounts({});
    setEditPercentages({});
    setEditShares({});
  }

  async function updateExpense() {
    if (!Number.isFinite(groupId) || editingExpenseId === null) return;
    if (!editDesc.trim()) return;
    const amt = Number(editAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (editPaidByUserId === "") return;

    setUpdateExpenseError(null);
    setUpdatingExpense(true);
    const participantUserIds = members.map((m) => m.id);
    if (participantUserIds.length === 0) {
      setUpdatingExpense(false);
      return;
    }
    const sharesList =
      editSplitMode === "shares"
        ? participantUserIds.map((id) => Number(editShares[id] ?? ""))
        : [];
    const exactAmountNumbers =
      editSplitMode === "exact"
        ? participantUserIds.map((id) => Number(editExactAmounts[id] ?? ""))
        : [];
    const percentageNumbers =
      editSplitMode === "percentage"
        ? participantUserIds.map((id) => Number(editPercentages[id] ?? ""))
        : [];

    if (
      editSplitMode === "exact" &&
      exactAmountNumbers.some((val) => !Number.isFinite(val))
    ) {
      setUpdateExpenseError("Enter an exact amount for each member.");
      setUpdatingExpense(false);
      return;
    }
    if (
      editSplitMode === "percentage" &&
      percentageNumbers.some((val) => !Number.isFinite(val))
    ) {
      setUpdateExpenseError("Enter a percentage for each member.");
      setUpdatingExpense(false);
      return;
    }
    if (
      editSplitMode === "shares" &&
      sharesList.some((val) => !Number.isFinite(val) || val < 1)
    ) {
      setUpdateExpenseError("Enter a share count (>= 1) for each member.");
      setUpdatingExpense(false);
      return;
    }
    if (editSplitMode === "exact") {
      const exactSum = exactAmountNumbers.reduce((sum, val) => sum + val, 0);
      if (Math.abs(exactSum - amt) > 0.01) {
        setUpdateExpenseError("Exact amounts must add up to the total.");
        setUpdatingExpense(false);
        return;
      }
    }
    if (editSplitMode === "percentage") {
      const percentageSum = percentageNumbers.reduce(
        (sum, val) => sum + val,
        0,
      );
      if (Math.abs(percentageSum - 100) > 0.01) {
        setUpdateExpenseError("Percentages must add up to 100%.");
        setUpdatingExpense(false);
        return;
      }
    }

    try {
      const payload: Record<string, unknown> = {
        description: editDesc,
        amount: formatAmount(amt),
        payerUserId: editPaidByUserId,
        participantUserIds,
      };
      if (editSplitMode === "shares") payload.shares = sharesList;
      if (editSplitMode === "exact") {
        payload.exactAmounts = exactAmountNumbers.map(formatAmount);
      }
      if (editSplitMode === "percentage") {
        payload.percentages = percentageNumbers.map(formatAmount);
      }

      await api<void>(`/groups/${groupId}/expenses/${editingExpenseId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await Promise.all([
        loadExpenses(groupId),
        loadSettlements(groupId),
        loadEvents(groupId),
      ]);
      resetEditExpense();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setUpdateExpenseError(e.message ?? "Failed to update expense");
      } else {
        setUpdateExpenseError(String(e) || "Failed to update expense");
      }
    } finally {
      setUpdatingExpense(false);
    }
  }

  async function deleteExpense(expenseId: number) {
    if (!Number.isFinite(groupId)) return;
    setDeletingExpenseId(expenseId);
    setDeleteExpenseError(null);
    try {
      await api<void>(`/groups/${groupId}/expenses/${expenseId}`, {
        method: "DELETE",
      });
      await Promise.all([
        loadExpenses(groupId),
        loadSettlements(groupId),
        loadEvents(groupId),
      ]);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setDeleteExpenseError(e.message ?? "Failed to delete expense");
      } else {
        setDeleteExpenseError(String(e) || "Failed to delete expense");
      }
    } finally {
      setDeletingExpenseId(null);
    }
  }

  const exactRemaining =
    splitMode === "exact"
      ? getRemainingAmount(
          amount,
          exactAmounts,
          members.map((m) => m.id),
        )
      : null;

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
        </div>

        {groupError && (
          <StatusBanner
            variant="error"
            message={groupError}
            onRetry={() => Number.isFinite(groupId) && loadGroup(groupId)}
          />
        )}

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm backdrop-blur">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                  activeTab === tab.key
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className={getSectionClass("members")}>
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

        <div className={getSectionClass("members")}>
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
              disabled={
                !userName.trim() || addingMember || !Number.isFinite(groupId)
              }
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

        <div className={getSectionClass("members")}>
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
              onRetry={() => Number.isFinite(groupId) && loadGroup(groupId)}
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

        <div className={getSectionClass("expenses")}>
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
                onChange={(e) =>
                  setSplitMode(
                    e.target.value as
                      | "equal"
                      | "exact"
                      | "percentage"
                      | "shares",
                  )
                }
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
                      members.map((m) => m.id),
                    );
                    if (remaining === null)
                      return "Enter a total amount first.";
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

        <div className={getSectionClass("expenses")}>
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
                      void loadExpenses(
                        groupId,
                        1,
                        expensesPageSize,
                        "createdAt,asc",
                      );
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
                      void loadExpenses(
                        groupId,
                        1,
                        expensesPageSize,
                        "createdAt,desc",
                      );
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
                      void loadExpenses(
                        groupId,
                        1,
                        expensesPageSize,
                        "amount,asc",
                      );
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
                      void loadExpenses(
                        groupId,
                        1,
                        expensesPageSize,
                        "amount,desc",
                      );
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
              onRetry={() =>
                Number.isFinite(groupId) && loadExpenses(groupId, expensesPage)
              }
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
                {expenses.map((ex, index) => (
                  <li
                    key={`${ex.expenseId ?? "new"}-${ex.payerUserId}-${ex.amount}-${ex.createdAt ?? index}`}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
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
                        {ex.splits && ex.splits.length > 0 && (
                          <div className="mt-2 space-y-1 text-xs text-slate-500">
                            {ex.splits.map((split) => {
                              const member = members.find(
                                (m) => m.id === split.userId,
                              );
                              const label = member
                                ? getMemberName(member)
                                : `User #${split.userId}`;
                              return (
                                <div key={`${ex.expenseId}-${split.userId}`}>
                                  {label}: $
                                  {Number(split.shareAmount).toFixed(2)}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold">
                          ${Number(ex.amount).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            className="underline"
                            onClick={() => startEditExpense(ex)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-rose-600 underline"
                            disabled={deletingExpenseId === ex.expenseId}
                            onClick={() => deleteExpense(ex.expenseId)}
                          >
                            {deletingExpenseId === ex.expenseId
                              ? "Deleting..."
                              : "Delete"}
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
                Page {expensesPage} of {expensesTotalPages} (
                {expensesTotalItems} expenses)
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
                  onPageChange={(page) =>
                    Number.isFinite(groupId) && void loadExpenses(groupId, page)
                  }
                />
              </div>
            </div>
          )}
        </div>

        {activeTab === "expenses" && editingExpenseId !== null && (
          <div className={getSectionClass("expenses")}>
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
                    setEditPaidByUserId(
                      e.target.value ? Number(e.target.value) : "",
                    )
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
                  onChange={(e) =>
                    setEditSplitMode(
                      e.target.value as
                        | "equal"
                        | "exact"
                        | "percentage"
                        | "shares",
                    )
                  }
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
                        members.map((m) => m.id),
                      );
                      if (remaining === null) {
                        return "Enter a total amount first.";
                      }
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

        <div className={getSectionClass("settle")}>
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
              onClick={() =>
                Number.isFinite(groupId) && loadSettlements(groupId)
              }
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
              onRetry={() =>
                Number.isFinite(groupId) && loadSettlements(groupId)
              }
            />
          )}
          {!loadingSettlements &&
            !settlementsError &&
            settlements.length === 0 && (
              <StatusBanner
                variant="empty"
                message="No transfers needed right now."
              />
            )}
          {!loadingSettlements &&
            !settlementsError &&
            settlements.length > 0 &&
            (() => {
              const sortedTransfers = [...settlements].sort((a, b) => {
                if (a.fromUserId !== b.fromUserId) {
                  return a.fromUserId - b.fromUserId;
                }
                if (a.toUserId !== b.toUserId) {
                  return a.toUserId - b.toUserId;
                }
                return Number(a.amount) - Number(b.amount);
              });

              return (
                <div className="mt-4 max-h-80 overflow-y-auto pr-1">
                  <ul className="space-y-3">
                    {sortedTransfers.map((s) => {
                      const fromMember = members.find(
                        (m) => m.id === s.fromUserId,
                      );
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
                                <span className="text-rose-700">
                                  {fromLabel}
                                </span>{" "}
                                pays{" "}
                                <span className="text-emerald-700">
                                  {toLabel}
                                </span>
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
                                    `${fromLabel} pays ${toLabel} $${Number(s.amount).toFixed(2)}`,
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
            })()}
        </div>

        <div className={getSectionClass("settle")}>
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

          {loadingLedger && (
            <StatusBanner variant="loading" message="Loading ledger..." />
          )}
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
                const label = member
                  ? getMemberName(member)
                  : `User #${entry.userId}`;
                const explanation = ledgerExplanationByUserId.get(entry.userId);
                const whyParts = explanation
                  ? getLedgerWhyParts(explanation)
                  : [];
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
                      <div className="mt-1 text-xs text-slate-500">
                        {whyText}
                      </div>
                    </div>
                    <span
                      title={whyText}
                      className={
                        Number(entry.netBalance) >= 0
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }
                    >
                      {Number(entry.netBalance) >= 0 ? "+" : "-"}$
                      {Math.abs(Number(entry.netBalance)).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={getSectionClass("explain")}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Ledger explanation
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                See which expenses and transfers drive each member&apos;s
                balance.
              </p>
            </div>
            <button
              className="text-xs font-medium text-slate-600 underline"
              onClick={() =>
                Number.isFinite(groupId) && loadLedgerExplanation(groupId)
              }
              disabled={loadingLedgerExplanation}
            >
              {loadingLedgerExplanation ? "Explaining..." : "Explain"}
            </button>
          </div>

          {loadingLedgerExplanation && (
            <StatusBanner
              variant="loading"
              message="Loading ledger explanation..."
            />
          )}
          {ledgerExplanationError && (
            <StatusBanner
              variant="error"
              message={ledgerExplanationError}
              onRetry={() =>
                Number.isFinite(groupId) && loadLedgerExplanation(groupId)
              }
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
                  onChange={(e) =>
                    setCurrentUserId(e.target.value ? Number(e.target.value) : "")
                  }
                >
                  <option value="">Select current user</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {getMemberName(member)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Explain defaults to this member.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Explain member
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={selectedLedgerExplanationUserId}
                  onChange={(e) =>
                    setSelectedLedgerExplanationUserId(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                >
                  <option value="">Select group member</option>
                  {ledgerExplanationEntries.map((entry) => {
                    const member = members.find((m) => m.id === entry.userId);
                    const label = member
                      ? getMemberName(member)
                      : `User #${entry.userId}`;
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
          {!loadingLedgerExplanation &&
            !ledgerExplanationError &&
            ledgerExplanationEntries.length === 0 && (
              <StatusBanner
                variant="empty"
                message="No explanation data yet."
              />
            )}
          {!loadingLedgerExplanation &&
            !ledgerExplanationError &&
            ledgerExplanationEntries.length > 0 &&
            selectedLedgerExplanationUserId === "" && (
              <StatusBanner
                variant="info"
                message="Select group member to view explanation."
              />
            )}
          {!loadingLedgerExplanation &&
            !ledgerExplanationError &&
            ledgerExplanationEntries.length > 0 &&
            selectedLedgerExplanationUserId !== "" && (
              <div className="mt-4 space-y-4">
                {ledgerExplanationEntries
                  .filter(
                    (entry) => entry.userId === selectedLedgerExplanationUserId,
                  )
                  .map((entry) => {
                    const member = members.find((m) => m.id === entry.userId);
                    const label = member
                      ? getMemberName(member)
                      : `User #${entry.userId}`;
                    const netValue = Number(entry.netBalance ?? "");
                    const netLabel = Number.isFinite(netValue)
                      ? `${netValue >= 0 ? "+" : "-"}$${Math.abs(
                          netValue,
                        ).toFixed(2)}`
                      : (entry.netBalance ?? "—");
                    const netClass = Number.isFinite(netValue)
                      ? netValue >= 0
                        ? "text-emerald-700"
                        : "text-rose-700"
                      : "text-slate-600";
                    const expenses =
                      entry.expenses ?? entry.contributingExpenses ?? [];
                    const transfersIn = entry.transfersIn ?? [];
                    const transfersOut = entry.transfersOut ?? [];
                    const transfers =
                      entry.transfers ?? entry.contributingTransfers ?? [];
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
                            <div className="font-medium text-slate-900">
                              {label}
                            </div>
                            <div className="text-xs text-slate-500">
                              Net balance
                            </div>
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
                                const payer = members.find(
                                  (m) => m.id === expense.payerUserId,
                                );
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
                                        <div className="text-xs text-slate-500">
                                          Paid by {payerLabel}
                                        </div>
                                      </div>
                                      <span className="text-xs font-semibold text-slate-700">
                                        {formatMoney(expense.amount)}
                                      </span>
                                    </div>
                                    {expense.splits &&
                                      expense.splits.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                                          {expense.splits.map((split) => {
                                            const splitMember = members.find(
                                              (m) => m.id === split.userId,
                                            );
                                            const splitLabel = splitMember
                                              ? getMemberName(splitMember)
                                              : `User #${split.userId}`;
                                            return (
                                              <span
                                                key={`${entry.userId}-${expense.expenseId}-${split.userId}`}
                                                className="rounded-full border border-slate-200 bg-white px-2 py-1"
                                              >
                                                {splitLabel}{" "}
                                                {formatMoney(split.shareAmount)}
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
                                    <div className="text-[11px] font-medium text-emerald-700">
                                      Incoming
                                    </div>
                                    {transfersIn.map((transfer) => {
                                      const fromMember = members.find(
                                        (m) => m.id === transfer.fromUserId,
                                      );
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
                                    <div className="text-[11px] font-medium text-rose-700">
                                      Outgoing
                                    </div>
                                    {transfersOut.map((transfer) => {
                                      const toMember = members.find(
                                        (m) => m.id === transfer.toUserId,
                                      );
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
                                  const fromMember = members.find(
                                    (m) => m.id === transfer.fromUserId,
                                  );
                                  const toMember = members.find(
                                    (m) => m.id === transfer.toUserId,
                                  );
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
                                              .replace(/\b\w/g, (c) =>
                                                c.toUpperCase(),
                                              )
                                          : "Contribution"}
                                      </div>
                                      <div className="text-xs text-slate-600">
                                        {formatContributionDescription(
                                          contribution.description,
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700">
                                      {formatMoney(contribution.amount)}
                                    </span>
                                  </div>
                                  {contribution.timestamp && (
                                    <div className="mt-1 text-[11px] text-slate-500">
                                      {new Date(
                                        contribution.timestamp,
                                      ).toLocaleString()}{" "}
                                      (
                                      {getShortTimeZoneLabel(
                                        contribution.timestamp,
                                      )}
                                      )
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

        <div className={getSectionClass("settle")}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Owes lookup
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={owesFromUserId}
              onChange={(e) =>
                setOwesFromUserId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">From user...</option>
              {members
                .filter((m) => m.id !== owesToUserId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {getMemberName(m)}
                  </option>
                ))}
            </select>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={owesToUserId}
              onChange={(e) =>
                setOwesToUserId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">To user...</option>
              {members
                .filter((m) => m.id !== owesFromUserId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {getMemberName(m)}
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
                onClick={() => Number.isFinite(groupId) && loadOwes(groupId)}
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
                onClick={() =>
                  Number.isFinite(groupId) && loadOwesHistorical(groupId)
                }
              >
                Historical
              </button>
            </div>
          </div>
          <div className="mt-3 text-sm text-slate-600">
            {loadingOwes && (
              <StatusBanner variant="loading" message="Loading owes..." />
            )}
            {owesError && (
              <StatusBanner
                variant="error"
                message={owesError}
                onRetry={() =>
                  Number.isFinite(groupId) &&
                  (owesView === "historical"
                    ? loadOwesHistorical(groupId)
                    : loadOwes(groupId))
                }
              />
            )}
            {!loadingOwes &&
              !owesError &&
              owesAmount === null &&
              owesHistoricalAmount === null && (
                <StatusBanner
                  variant="empty"
                  message="Select two members to see what’s owed."
                />
              )}
            {!loadingOwes &&
              !owesError &&
              owesView === "current" &&
              owesAmount !== null && (
                <div>Current owes: ${owesAmount.toFixed(2)}</div>
              )}
            {!loadingOwes &&
              !owesError &&
              owesView === "historical" &&
              owesHistoricalAmount !== null && (
                <div>Historical owes: ${owesHistoricalAmount.toFixed(2)}</div>
              )}
          </div>
        </div>

        <div className={getSectionClass("history")}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Confirmed transfers
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1">
                  <span>Date</span>
                  <button
                    className={`rounded border px-1 leading-none ${confirmedTransfersSort === "createdAt,asc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                    onClick={() => {
                      setConfirmedTransfersSort("createdAt,asc");
                      if (Number.isFinite(groupId)) {
                        void loadConfirmedTransfers(
                          groupId,
                          1,
                          confirmedTransfersPageSize,
                          "createdAt,asc",
                        );
                      }
                    }}
                    disabled={loadingConfirmedTransfers}
                    aria-label="Sort confirmed transfers by date ascending"
                  >
                    ▲
                  </button>
                  <button
                    className={`rounded border px-1 leading-none ${confirmedTransfersSort === "createdAt,desc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                    onClick={() => {
                      setConfirmedTransfersSort("createdAt,desc");
                      if (Number.isFinite(groupId)) {
                        void loadConfirmedTransfers(
                          groupId,
                          1,
                          confirmedTransfersPageSize,
                          "createdAt,desc",
                        );
                      }
                    }}
                    disabled={loadingConfirmedTransfers}
                    aria-label="Sort confirmed transfers by date descending"
                  >
                    ▼
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <span>Amount</span>
                  <button
                    className={`rounded border px-1 leading-none ${confirmedTransfersSort === "amount,asc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                    onClick={() => {
                      setConfirmedTransfersSort("amount,asc");
                      if (Number.isFinite(groupId)) {
                        void loadConfirmedTransfers(
                          groupId,
                          1,
                          confirmedTransfersPageSize,
                          "amount,asc",
                        );
                      }
                    }}
                    disabled={loadingConfirmedTransfers}
                    aria-label="Sort confirmed transfers by amount ascending"
                  >
                    ▲
                  </button>
                  <button
                    className={`rounded border px-1 leading-none ${confirmedTransfersSort === "amount,desc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                    onClick={() => {
                      setConfirmedTransfersSort("amount,desc");
                      if (Number.isFinite(groupId)) {
                        void loadConfirmedTransfers(
                          groupId,
                          1,
                          confirmedTransfersPageSize,
                          "amount,desc",
                        );
                      }
                    }}
                    disabled={loadingConfirmedTransfers}
                    aria-label="Sort confirmed transfers by amount descending"
                  >
                    ▼
                  </button>
                </div>
              </div>
              <button
                className="text-xs font-medium text-slate-600 underline"
                onClick={() =>
                  Number.isFinite(groupId) &&
                  loadConfirmedTransfers(groupId, confirmedTransfersPage)
                }
                disabled={loadingConfirmedTransfers}
              >
                {loadingConfirmedTransfers ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <input
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            placeholder="Filter by confirmation ID (optional)"
            value={confirmedFilter}
            onChange={(e) => setConfirmedFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && Number.isFinite(groupId)) {
                void loadConfirmedTransfers(groupId, 1);
              }
            }}
          />

          {loadingConfirmedTransfers && (
            <StatusBanner
              variant="loading"
              message="Loading confirmed transfers..."
            />
          )}
          {confirmedTransfersError && (
            <StatusBanner
              variant="error"
              message={confirmedTransfersError}
              onRetry={() =>
                Number.isFinite(groupId) &&
                loadConfirmedTransfers(groupId, confirmedTransfersPage)
              }
            />
          )}
          {!loadingConfirmedTransfers &&
            !confirmedTransfersError &&
            confirmedTransfers.length === 0 && (
              <StatusBanner
                variant="empty"
                message="No confirmed transfers yet."
              />
            )}
          {!loadingConfirmedTransfers &&
            !confirmedTransfersError &&
            confirmedTransfers.length > 0 && (
              <div className="mt-4 space-y-2">
                {confirmedTransfers.map((transfer) => {
                  const fromMember = members.find(
                    (m) => m.id === transfer.fromUserId,
                  );
                  const toMember = members.find(
                    (m) => m.id === transfer.toUserId,
                  );
                  const fromLabel = fromMember
                    ? getMemberName(fromMember)
                    : `User #${transfer.fromUserId}`;
                  const toLabel = toMember
                    ? getMemberName(toMember)
                    : `User #${transfer.toUserId}`;
                  return (
                    <div
                      key={transfer.id}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                    >
                      <div className="text-sm font-medium text-slate-900">
                        {fromLabel} → {toLabel}: $
                        {Number(transfer.amount).toFixed(2)}
                      </div>
                      <div className="mt-1">
                        Confirmation: {transfer.confirmationId ?? "—"} ·{" "}
                        {new Date(transfer.createdAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          {!loadingConfirmedTransfers &&
            !confirmedTransfersError &&
            confirmedTransfersTotalItems > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Page {confirmedTransfersPage} of{" "}
                  {confirmedTransfersTotalPages} ({confirmedTransfersTotalItems}{" "}
                  transfers)
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span>Page size</span>
                    <select
                      className="rounded-xl border border-slate-300 bg-white px-2 py-1"
                      value={confirmedTransfersPageSize}
                      onChange={(e) => {
                        const nextSize = Number(e.target.value);
                        setConfirmedTransfersPageSize(nextSize);
                        if (Number.isFinite(groupId)) {
                          void loadConfirmedTransfers(groupId, 1, nextSize);
                        }
                      }}
                      disabled={loadingConfirmedTransfers}
                    >
                      {[5, 10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                  <PaginationControls
                    currentPage={confirmedTransfersPage}
                    totalPages={confirmedTransfersTotalPages}
                    loading={loadingConfirmedTransfers}
                    onPageChange={(page) =>
                      Number.isFinite(groupId) &&
                      void loadConfirmedTransfers(groupId, page)
                    }
                  />
                </div>
              </div>
            )}
        </div>

        <div className={getSectionClass("history")}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Expense events
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <span>Date</span>
                <button
                  className={`rounded border px-1 leading-none ${eventsSort === "createdAt,asc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                  onClick={() => {
                    setEventsSort("createdAt,asc");
                    if (Number.isFinite(groupId)) {
                      void loadEvents(
                        groupId,
                        1,
                        eventsPageSize,
                        "createdAt,asc",
                      );
                    }
                  }}
                  disabled={loadingEvents}
                  aria-label="Sort events by date ascending"
                >
                  ▲
                </button>
                <button
                  className={`rounded border px-1 leading-none ${eventsSort === "createdAt,desc" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                  onClick={() => {
                    setEventsSort("createdAt,desc");
                    if (Number.isFinite(groupId)) {
                      void loadEvents(
                        groupId,
                        1,
                        eventsPageSize,
                        "createdAt,desc",
                      );
                    }
                  }}
                  disabled={loadingEvents}
                  aria-label="Sort events by date descending"
                >
                  ▼
                </button>
              </div>
              <button
                className="text-xs font-medium text-slate-600 underline"
                onClick={() =>
                  Number.isFinite(groupId) && loadEvents(groupId, eventsPage)
                }
                disabled={loadingEvents}
              >
                {loadingEvents ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {loadingEvents && (
            <StatusBanner variant="loading" message="Loading events..." />
          )}
          {eventsError && (
            <StatusBanner
              variant="error"
              message={eventsError}
              onRetry={() =>
                Number.isFinite(groupId) && loadEvents(groupId, eventsPage)
              }
            />
          )}
          {!loadingEvents && !eventsError && events.length === 0 && (
            <StatusBanner variant="empty" message="No events yet." />
          )}
          {!loadingEvents && !eventsError && events.length > 0 && (
            <div className="mt-4 max-h-64 overflow-y-auto pr-1">
              <ul className="space-y-2">
                {events.map((event) => (
                  <li
                    key={event.eventId}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                  >
                    <div className="text-sm font-medium text-slate-900">
                      {event.eventType}
                    </div>
                    <div className="mt-1">
                      {new Date(event.createdAt).toLocaleString()} (
                      {getShortTimeZoneLabel(event.createdAt)})
                    </div>
                    <div className="mt-2 whitespace-pre-wrap break-words text-[11px] text-slate-500">
                      {formatEventPayload(event.payload)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!loadingEvents && !eventsError && eventsTotalItems > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {eventsPage} of {eventsTotalPages} ({eventsTotalItems}{" "}
                events)
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <span>Page size</span>
                  <select
                    className="rounded-xl border border-slate-300 bg-white px-2 py-1"
                    value={eventsPageSize}
                    onChange={(e) => {
                      const nextSize = Number(e.target.value);
                      setEventsPageSize(nextSize);
                      if (Number.isFinite(groupId)) {
                        void loadEvents(groupId, 1, nextSize);
                      }
                    }}
                    disabled={loadingEvents}
                  >
                    {[5, 10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <PaginationControls
                  currentPage={eventsPage}
                  totalPages={eventsTotalPages}
                  loading={loadingEvents}
                  onPageChange={(page) =>
                    Number.isFinite(groupId) && void loadEvents(groupId, page)
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
