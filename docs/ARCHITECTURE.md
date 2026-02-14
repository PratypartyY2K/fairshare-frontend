# Fairshare Frontend Architecture

This document provides a detailed file-by-file breakdown of the Fairshare frontend codebase for developers.

## File-by-File Guide

### Root config and metadata

- `README.md`: Project documentation.
- `package.json`: Package metadata, dependencies, scripts.
- `package-lock.json`: Exact dependency lockfile.
- `tsconfig.json`: TypeScript compiler settings and include paths.
- `next.config.ts`: Next.js configuration scaffold.
- `postcss.config.mjs`: Enables Tailwind PostCSS plugin.
- `eslint.config.mjs`: ESLint setup using Next core-web-vitals + TypeScript presets.
- `next-env.d.ts`: Next.js TypeScript generated references.
- `.gitignore`: Ignore rules for Node/Next/env/build artifacts.

### App shell

- `src/app/layout.tsx`: Global HTML layout wrapper + page metadata.
- `src/app/globals.css`: Loads Tailwind base/components/utilities.

### Home page (`/`)

- `src/app/page.tsx`: Home page container; owns state, API calls, filtering/sorting/pagination, group create/rename flow.
- `src/app/home/types.ts`: Home page types (`Group`, `CreateGroupResponse`).
- `src/app/home/groupFilters.ts`: Group name wildcard filter helpers, member-count fallback extractor, page index converters.
- `src/app/home/components/CreateGroupSection.tsx`: Create-group form and success/error/loading UI.
- `src/app/home/components/ApiStatusSection.tsx`: Backend status display for `/` and `/health`.
- `src/app/home/components/ExistingGroupsSection.tsx`: Group list UI with sort/filter/rename/pagination controls.

### Group page (`/groups/[groupId]`)

- `src/app/groups/[groupId]/page.tsx`: Composes tab UI and wires controller state/actions into tab components.
- `src/app/groups/[groupId]/useGroupPageController.ts`: Main page controller hook; all group-page data fetching, mutations, state, pagination, sorting, validation, and derived view data.
- `src/app/groups/[groupId]/types.ts`: Group-page domain models (members, expenses, settlements, ledger explanation, events, confirmed transfers).
- `src/app/groups/[groupId]/groupPageUtils.ts`: Shared helpers for formatting, event payload diffing, ledger explanation normalization, split calculations, and page conversions.
- `src/app/groups/[groupId]/components/GroupTabNav.tsx`: Tab-switch navigation bar.
- `src/app/groups/[groupId]/components/MembersTab.tsx`: Rename group, add member, and member list UI.
- `src/app/groups/[groupId]/components/ExpensesTab.tsx`: Add/edit/delete expense UI with split-mode-specific inputs and expense list pagination/sorting.
- `src/app/groups/[groupId]/components/SettleTab.tsx`: Settlement suggestions, transfer confirmation, ledger snapshot, and owes lookup UI.
- `src/app/groups/[groupId]/components/ExplainTab.tsx`: Per-member ledger explanation drilldown UI (expenses/transfers/contributions).
- `src/app/groups/[groupId]/components/HistoryTab.tsx`: Confirmed transfers and expense-event audit views with sorting/pagination/filtering.

### Shared libraries and UI

- `src/lib/api.ts`: Typed fetch wrapper with base URL, JSON handling, error parsing, `Idempotency-Key` and `Confirmation-Id` header support, no-store cache policy.
- `src/lib/pagination.ts`: Generic paginated API response/meta TypeScript types.
- `src/components/ui/StatusBanner.tsx`: Reusable status banner component (`loading`, `empty`, `error`, `info`) with optional retry action.
- `src/components/ui/PaginationControls.tsx`: Reusable paginated navigation (prev/next + compact page-number window).

### Public assets

- `public/file.svg`: Generic file icon.
- `public/globe.svg`: Globe icon.
- `public/next.svg`: Next.js logo asset.
- `public/vercel.svg`: Vercel logo asset.
- `public/window.svg`: Window/browser icon.

## Implementation Notes

- UI pages are 1-based; backend pagination is handled via conversion helpers where needed.
- Group name filtering supports both substring and wildcard matching.
- Ledger explanation parser is defensive and supports multiple backend response shapes.
- Confirm-transfer flow supports idempotency via confirmation ID.
