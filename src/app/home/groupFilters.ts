import type { Group } from "./types";

function hasWildcardPattern(value: string) {
  return value.includes("*") || value.includes("?");
}

function wildcardToRegex(pattern: string) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^${escaped.replace(/\\\*/g, ".*").replace(/\\\?/g, ".")}$`,
    "i",
  );
}

export function matchesGroupName(name: string, pattern: string) {
  const normalizedPattern = pattern.trim();
  if (!normalizedPattern) return true;
  if (hasWildcardPattern(normalizedPattern)) {
    return wildcardToRegex(normalizedPattern).test(name);
  }
  return name.toLowerCase().includes(normalizedPattern.toLowerCase());
}

export function getGroupMembersCount(group: Group) {
  if (Number.isFinite(group.memberCount)) return group.memberCount;
  if (Number.isFinite(group.membersCount)) return group.membersCount;
  if (Number.isFinite(group.totalMembers)) return group.totalMembers;
  return null;
}

export function toApiPage(uiPage: number) {
  return Math.max(0, uiPage - 1);
}

export function toUiPage(apiPage: number) {
  return Math.max(1, apiPage + 1);
}
