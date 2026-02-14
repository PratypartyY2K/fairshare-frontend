import type {
  LedgerContribution,
  LedgerExplanationEntry,
  LedgerExplanationResponse,
  Member,
  SettlementTransfer,
} from "./types";

export function toApiPage(uiPage: number) {
  return Math.max(0, uiPage - 1);
}

export function toUiPage(apiPage: number) {
  return Math.max(1, apiPage + 1);
}

export function getMemberName(member: Member) {
  return member.name?.trim() || "Member";
}

export function getTransferKey(transfer: SettlementTransfer) {
  const amount = Number(transfer.amount);
  const normalized = Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
  return `${transfer.fromUserId}-${transfer.toUserId}-${normalized}`;
}

export function formatAmount(value: number) {
  return value.toFixed(2);
}

export function formatMoney(value?: string | number) {
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
  const raw = split.userId ?? split.user_id ?? split.memberId ?? split.member_id;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

function getSplitAmountValue(split: unknown): number | null {
  if (!isRecord(split)) return null;
  const raw =
    split.shareAmount ?? split.share_amount ?? split.amount ?? split.value ?? split.share;
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : null;
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
    owesByUser.set(splitUserId, (owesByUser.get(splitUserId) ?? 0) + splitAmount);
  }

  return owesByUser;
}

function getSplitDiffLines(
  beforeValue: unknown,
  afterValue: unknown,
  memberNameById: Map<number, string>,
) {
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

      const label = memberNameById.get(userId) ?? `User #${userId}`;
      const delta = after - before;
      return `${label}: ${formatMoney(before)} -> ${formatMoney(after)} (delta ${formatSignedMoney(delta)})`;
    })
    .filter((line): line is string => Boolean(line));
}

function getOwesDiffLines(
  beforeValue: unknown,
  afterValue: unknown,
  memberNameById: Map<number, string>,
) {
  const beforeOwes = getExpenseOwesByUser(beforeValue);
  const afterOwes = getExpenseOwesByUser(afterValue);
  if (!beforeOwes || !afterOwes) return [] as string[];

  const allUserIds = Array.from(
    new Set([...beforeOwes.keys(), ...afterOwes.keys()]),
  ).sort((a, b) => a - b);

  return allUserIds
    .map((userId) => {
      const before = beforeOwes.get(userId) ?? 0;
      const after = afterOwes.get(userId) ?? 0;
      if (Math.abs(before - after) < 0.005) return null;

      const label = memberNameById.get(userId) ?? `User #${userId}`;
      const delta = after - before;
      return `${label}: ${getUserOwesLabel(before)} -> ${getUserOwesLabel(after)} (delta ${formatSignedMoney(delta)})`;
    })
    .filter((line): line is string => Boolean(line));
}

function buildEventDiffLines(
  beforeValue: unknown,
  afterValue: unknown,
  memberNameById: Map<number, string>,
  path: string[] = [],
): string[] {
  if (isRecord(beforeValue) && isRecord(afterValue)) {
    const keys = Array.from(
      new Set([...Object.keys(beforeValue), ...Object.keys(afterValue)]),
    ).filter((key) => key !== "expenseId");

    return keys.flatMap((key) =>
      buildEventDiffLines(beforeValue[key], afterValue[key], memberNameById, [
        ...path,
        key,
      ]),
    );
  }

  if (JSON.stringify(stripExpenseIds(beforeValue)) === JSON.stringify(stripExpenseIds(afterValue))) {
    return [];
  }

  const leafKey = path[path.length - 1] ?? "value";
  const label =
    path.length > 0
      ? path.map((segment) => formatEventFieldLabel(segment)).join(" ")
      : "Value";

  return [
    `${label}: ${formatEventFieldValue(leafKey, beforeValue, memberNameById)} -> ${formatEventFieldValue(leafKey, afterValue, memberNameById)}`,
  ];
}

function formatEventFieldValue(
  key: string,
  value: unknown,
  memberNameById: Map<number, string>,
) {
  if (value === undefined || value === null) return "—";
  const lowerKey = key.toLowerCase();

  if (lowerKey.includes("amount")) {
    if (typeof value === "number" || typeof value === "string") {
      return formatMoney(value);
    }
  }

  if (lowerKey.endsWith("userid")) {
    if (typeof value === "number" || typeof value === "string") {
      const numeric = typeof value === "number" ? value : Number.parseInt(String(value), 10);
      if (!Number.isFinite(numeric)) return String(value);
      return memberNameById.get(numeric) ?? `User #${numeric}`;
    }
  }

  if (lowerKey.endsWith("userids") && Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item !== "number" && typeof item !== "string") return String(item);
        const numeric =
          typeof item === "number" ? item : Number.parseInt(String(item), 10);
        if (!Number.isFinite(numeric)) return String(item);
        return memberNameById.get(numeric) ?? `User #${numeric}`;
      })
      .join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(stripExpenseIds(value));
  }

  return String(value);
}

export function formatEventPayload(
  payload: string,
  memberNameById: Map<number, string>,
) {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return payload;
    }

    const beforeValue = parseJsonRecord(parsed.before ?? parsed.Before);
    const afterValue = parseJsonRecord(parsed.after ?? parsed.After);
    if (isRecord(beforeValue) && isRecord(afterValue)) {
      const diffLines = buildEventDiffLines(beforeValue, afterValue, memberNameById);
      const splitDiffLines = getSplitDiffLines(
        beforeValue,
        afterValue,
        memberNameById,
      );
      const owesDiffLines = getOwesDiffLines(beforeValue, afterValue, memberNameById);
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
            return `${label} ${nestedLabel}: ${formatEventFieldValue(nestedKey, nestedValue, memberNameById)}`;
          });
        }
        return `${label}: ${formatEventFieldValue(key, value, memberNameById)}`;
      });

    return lines.length > 0 ? lines.join("\n") : "No additional details";
  } catch {
    return payload;
  }
}

export function getShortTimeZoneLabel(dateInput: string) {
  const date = new Date(dateInput);
  const part = new Intl.DateTimeFormat("en-US", {
    timeZoneName: "short",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? "Local";
}

export function getLedgerExplanationEntries(
  explanation: LedgerExplanationResponse | null,
): LedgerExplanationEntry[] {
  if (!explanation) return [];

  const candidates: Array<LedgerExplanationEntry[] | undefined> = [
    explanation.entries,
    explanation.users,
    explanation.items,
    explanation.explanations,
    Array.isArray(explanation.data) ? explanation.data : undefined,
    Array.isArray(explanation.result) ? explanation.result : undefined,
    Array.isArray(explanation.payload) ? explanation.payload : undefined,
  ];
  const directList = candidates.find(
    (candidate): candidate is LedgerExplanationEntry[] => Array.isArray(candidate),
  );
  if (directList) return directList;

  const nestedCandidates = [explanation.data, explanation.result, explanation.payload];
  for (const nestedCandidate of nestedCandidates) {
    if (!nestedCandidate || Array.isArray(nestedCandidate)) continue;
    const nested = getLedgerExplanationEntries(nestedCandidate as LedgerExplanationResponse);
    if (nested.length > 0) return nested;
  }

  const mapped = Object.entries(explanation)
    .filter(([key, value]) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
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
    .filter(
      (entry): entry is LedgerExplanationEntry =>
        Number.isFinite(entry.userId) && entry.userId >= 0,
    );
  if (mapped.length > 0) return mapped;

  return [];
}

export function formatContributionDescription(
  description: string | undefined,
  memberNameById: Map<number, string>,
) {
  if (!description?.trim()) return "—";
  return description.replace(/user\s+#?(\d+)/gi, (_, userIdText: string) => {
    const userId = Number(userIdText);
    if (!Number.isFinite(userId)) return `user ${userIdText}`;
    return memberNameById.get(userId) ?? `User #${userId}`;
  });
}

export function getLedgerWhyParts(
  entry: LedgerExplanationEntry,
  memberNameById: Map<number, string>,
) {
  const parts: string[] = [];
  const expenses = entry.expenses ?? entry.contributingExpenses ?? [];
  const transfersIn = entry.transfersIn ?? [];
  const transfersOut = entry.transfersOut ?? [];
  const transfers = entry.transfers ?? entry.contributingTransfers ?? [];
  const contributions = entry.contributions ?? [];

  if (expenses.length > 0) {
    parts.push(`${expenses.length} expense${expenses.length === 1 ? "" : "s"}`);
  }

  if (transfersIn.length > 0 || transfersOut.length > 0) {
    parts.push(
      `${transfersIn.length} incoming / ${transfersOut.length} outgoing transfer${transfersIn.length + transfersOut.length === 1 ? "" : "s"}`,
    );
  } else if (transfers.length > 0) {
    parts.push(`${transfers.length} transfer${transfers.length === 1 ? "" : "s"}`);
  }

  const reasons = contributions
    .map((contribution: LedgerContribution) =>
      formatContributionDescription(contribution.description, memberNameById),
    )
    .filter((reason) => reason !== "—")
    .slice(0, 2);
  if (reasons.length > 0) {
    parts.push(reasons.join(" • "));
  }

  return parts;
}

export function getRemainingAmount(
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

export function buildMemberValueMap(
  membersList: Member[],
  seed: Record<number, string> = {},
) {
  return membersList.reduce<Record<number, string>>((acc, member) => {
    acc[member.id] = seed[member.id] ?? "";
    return acc;
  }, {});
}
