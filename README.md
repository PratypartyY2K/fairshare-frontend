# Fairshare Frontend

Next.js App Router frontend for managing shared expenses in groups: members, expenses, settlement suggestions, ledger explanations, and audit history.

## Why Fairshare?

Unlike traditional expense-splitting apps, Fairshare provides:

- **Explainable ledgers**: Understand exactly why you owe what you owe with detailed breakdowns
- **Audit trail**: Complete history of edits, voids, and transfers for transparency and accountability
- **Deterministic rounding + idempotent actions**: Consistent, repeatable operations that prevent double-charging
- **Fairness-aware splitting** _(coming soon)_: Advanced algorithms for equitable expense distribution

## Quickstart: Running the Full System

```bash
# 1. Clone the repository (if needed)
git clone https://github.com/PratypartyY2K/fairshare-frontend.git
cd fairshare-frontend

# 2. Initialize submodules (if backend is included as a submodule)
git submodule update --init --recursive

# 3. Run the backend (adjust according to your backend setup)
# Example: cd backend && ./gradlew bootRun
# Or: cd backend && npm start
# Backend typically runs on http://localhost:8080

# 4. Set up frontend environment
cp .env.local.example .env.local  # Or create .env.local manually
# Add: NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# 5. Run the frontend
npm install
npm run dev

# 6. Access the application
# Frontend: http://localhost:3000
# Backend API docs (Swagger): http://localhost:8080/swagger-ui.html
```

## Tech Stack

- Next.js `16.1.4` (App Router)
- React `19.2.3`
- TypeScript `5`
- Tailwind CSS `4`

## Prerequisites

- Node.js 18+
- A running backend API

## Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

The app fails fast if `NEXT_PUBLIC_API_BASE_URL` is missing.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## NPM Scripts

- `npm run dev`: Start development server.
- `npm run build`: Build production bundle.
- `npm run start`: Run production server.
- `npm run lint`: Run ESLint.

## Core Functionality

- Home page:
  - Create group
  - Rename group
  - List groups with pagination, sorting, and wildcard name filter (`*`, `?`)
  - API status checks (`/` and `/health`)
- Group page tabs:
  - `Members`: rename group + add/list members
  - `Expenses`: add/edit/delete expenses with split modes (equal, exact, percentage, shares)
  - `Settle`: suggested transfers, confirm transfers (idempotent confirmation ID), ledger view, owes lookup
  - `Explain`: per-member ledger explanation with expenses/transfers/contributions breakdown
  - `History`: confirmed transfers list + expense events list, both paginated/sortable

## API Endpoints Used

Base URL: `NEXT_PUBLIC_API_BASE_URL`

- Status: `GET /`, `GET /health`
- Groups: `GET /groups`, `POST /groups`, `GET /groups/{groupId}`, `PATCH /groups/{groupId}`
- Members: `POST /groups/{groupId}/members`
- Expenses: `GET /groups/{groupId}/expenses`, `POST /groups/{groupId}/expenses`, `PATCH /groups/{groupId}/expenses/{expenseId}`, `DELETE /groups/{groupId}/expenses/{expenseId}`
- Settlements: `GET /groups/{groupId}/settlements`, `POST /groups/{groupId}/settlements/confirm`, `GET /groups/{groupId}/api/confirmation-id`
- Ledger/Explain: `GET /groups/{groupId}/ledger`, `GET /groups/{groupId}/explanations/ledger`
- History/Audit: `GET /groups/{groupId}/confirmed-transfers`, `GET /groups/{groupId}/events`
- Owes: `GET /groups/{groupId}/owes`, `GET /groups/{groupId}/owes/historical`

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

## Notes

- UI pages are 1-based; backend pagination is handled via conversion helpers where needed.
- Group name filtering supports both substring and wildcard matching.
- Ledger explanation parser is defensive and supports multiple backend response shapes.
- Confirm-transfer flow supports idempotency via confirmation ID.
