# Fairshare Frontend

A Next.js frontend for transparent group expense management with built-in **explainability** and **audit history**.

## Why Fairshare?

Unlike basic expense-splitting apps, Fairshare prioritizes transparency and trust:

- **🔍 Explain Tab**: See exactly how each member's balance was calculated — breakdown of every expense, transfer, and contribution that affects their ledger position.
- **📜 History/Audit Tab**: Complete audit trail of all confirmed transfers and expense changes, with full before/after snapshots for accountability.
- **⚖️ Smart Settlements**: Automatic settlement suggestions that minimize the number of transfers needed to balance the group.

These features make Fairshare ideal for groups that value transparency: roommates, travel groups, or any shared expense scenario where trust and clarity matter.

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

## Core Features

- **Group Management**: Create groups, add members, track shared expenses
- **Flexible Expense Splits**: Equal, exact amounts, percentages, or custom shares
- **Smart Settlements**: Minimized transfer suggestions with idempotent confirmation
- **Ledger Explanation**: Per-member breakdown showing how balances are calculated
- **Audit History**: Complete timeline of confirmed transfers and expense modifications
- **Advanced Filtering**: Wildcard search, pagination, and sorting across all views

## API Integration

This frontend connects to the Fairshare backend API. 

**For complete API documentation, refer to the backend's Swagger/OpenAPI specification** — it is the source of truth for all endpoint contracts, request/response schemas, and versioning.

### API Compatibility

- The frontend requires `NEXT_PUBLIC_API_BASE_URL` to be configured (see Environment section above)
- API endpoints are versioned and must match the backend's published contracts
- When integrating new backend features, always verify against the latest Swagger documentation
- Key integration points: groups, members, expenses, settlements, ledger explanations, and audit events

## Developer Documentation

For detailed technical documentation including file structure and implementation details, see:

- **[Architecture Guide](docs/ARCHITECTURE.md)**: Complete file-by-file breakdown of the codebase
