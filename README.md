# Fairshare Frontend

The Fairshare frontend is a Next.js application for inspecting, editing, and explaining shared group expenses.

Its job is not just to collect form input. The UI is meant to expose the value of the system: balances should be understandable, settlement flows should be trustworthy, and historical changes should be visible rather than hidden behind a single total.

## Why This Frontend Matters

Most expense-sharing interfaces optimize for speed and minimal friction, but they often hide the reasoning behind the numbers. Fairshare takes the opposite approach.

This frontend is designed to help users answer questions like:

- What do I owe right now?
- Why do I owe it?
- Which expenses contributed to that amount?
- Which transfers have already been confirmed?
- How did the group state change over time?

The backend provides the accounting model. The frontend makes that model legible.

## Product Goals

- Make shared-expense accounting understandable, not just usable.
- Surface ledger outcomes without requiring users to trust a black box.
- Keep core group workflows simple while preserving access to history and explanation.
- Support real product flows such as retries, pagination, filtering, and error recovery.

## User Experience Model

### Home Page

The landing flow is intentionally operational:

- verify backend connectivity
- create groups
- rename groups
- browse groups with filtering, sorting, and pagination

The home page acts as the control surface for entering the system, not just a static dashboard.

### Group Workspace

Each group is treated as a workspace with focused tabs for:

- members
- expenses
- settlements
- ledger explanation
- history

That keeps the UI aligned with the backend model. Users can move from creating an expense to understanding ledger impact to confirming transfers, all inside a single group context.

### Explainability

The explain and history views are the main differentiators of the product. They expose the reasoning behind balances and make the system feel accountable rather than opaque.

## Tech Stack

- Next.js 16.1.6
- React 19.2.3
- TypeScript 5
- Tailwind CSS 4

## Frontend Capabilities

### Group Management

- Create groups
- Rename groups
- Browse groups with search, sorting, and pagination

### Members

- Add members to a group
- View current group membership

### Expenses

- Create expenses
- Edit expenses
- Delete expenses
- Support equal, exact amount, percentage, and share-based split modes

### Settlements And Ledger

- View settlement suggestions
- Confirm transfers
- Inspect current ledger balances
- Query owes relationships

### Explainability And History

- View per-user ledger explanations
- Inspect expense event history
- Inspect confirmed transfer history
- Filter and page through historical records

## Local Run

Install dependencies:

```bash
npm install
```

Start the backend first on `http://localhost:8080`, then create `.env.local`.

Recommended direct-backend setup:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Optional rewrite-based setup:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
BACKEND_URL=http://localhost:8080
```

Then start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## API Integration Modes

The frontend supports two local integration styles.

Direct browser-to-backend mode:

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`
- the browser calls the Spring backend directly
- this depends on backend CORS allowing `http://localhost:3000`

Rewrite-based mode:

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api`
- Next.js rewrites `/api/:path*` to `BACKEND_URL` or `http://localhost:8080`
- this is useful when you want the frontend to proxy backend requests through Next

`NEXT_PUBLIC_API_BASE_URL` must be set. The shared API client expects it at runtime.

## Architecture Notes

The frontend is organized around two major surfaces:

- the home page, which owns group discovery and creation flows
- the group page, which acts as a single workspace for members, expenses, settlement, explanation, and history

API access is centralized in [src/lib/api.ts](/Users/pratyushkumar/Desktop/Pratyush/faireshare-mono-repo/fairshare-frontend/src/lib/api.ts). Shared pagination and response typing live in [src/lib/pagination.ts](/Users/pratyushkumar/Desktop/Pratyush/faireshare-mono-repo/fairshare-frontend/src/lib/pagination.ts).

The group page intentionally centralizes most orchestration in [src/app/groups/[groupId]/useGroupPageController.ts](/Users/pratyushkumar/Desktop/Pratyush/faireshare-mono-repo/fairshare-frontend/src/app/groups/[groupId]/useGroupPageController.ts), while tab components focus on rendering and interaction boundaries. That tradeoff favors feature velocity and shared state coordination across multiple group-level workflows.

Additional implementation notes are in [docs/ARCHITECTURE.md](/Users/pratyushkumar/Desktop/Pratyush/faireshare-mono-repo/fairshare-frontend/docs/ARCHITECTURE.md).

## Verification

Lint:

```bash
npm run lint
```

Production build:

```bash
npm run build -- --webpack
```

Production server:

```bash
npm run start
```

## Common Problems

If the app fails early because `NEXT_PUBLIC_API_BASE_URL` is missing:

- add `.env.local`
- set `NEXT_PUBLIC_API_BASE_URL`
- restart the dev server or rerun the build

If the UI shows `/api/...` 404 responses:

- confirm whether `.env.local` points to `http://localhost:8080` or `http://localhost:3000/api`
- if using rewrite mode, restart Next after changing env or config
- confirm the backend is running on `http://localhost:8080`

If direct browser calls to `http://localhost:8080` fail:

- confirm backend CORS still allows `http://localhost:3000`
