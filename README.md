# Fairshare Frontend

A lightweight Next.js frontend for managing groups, members, expenses, and settle-up transfers.

## Requirements

- Node.js 18+
- A running backend that exposes the endpoints below

## Setup

Create `.env.local` with your API base URL:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## Getting started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- Create groups and rename them
- Group list filtering by name (supports wildcard `*` and `?`)
- Group list pagination with:
  - page buttons (`1, 2, 3, ...`)
  - Previous/Next
  - page-size selector (`5, 10, 25, 50, 100`)
  - per-column sort buttons (`▲`/`▼`) for Name and Members
- Add members to a group
- Add expenses with split modes:
  - Equal split
  - Exact amounts
  - Percentages
- View expenses and settle-up transfers
- Group detail lists (Expenses, Confirmed transfers, Expense events) support:
  - page buttons (`1, 2, 3, ...`)
  - Previous/Next
  - page-size selector (`5, 10, 25, 50, 100`)
  - sort buttons (`▲`/`▼`) by relevant columns
- Confirm transfers ("Mark paid") with backend persistence
- Ledger explanation with member selector dropdown and contribution details

## Implementation evidence (audit map)

The sections below map each major UI capability to the exact screen/component where it is implemented.

### Home page (`src/app/page.tsx`)

- Group pagination:
  - Numbered page buttons + Previous/Next
  - Page size selector (`5, 10, 25, 50, 100`)
  - Active/current page highlighted
  - Query params sent: `page`, `pageSize`
- Group sorting:
  - Column-side sort buttons (`▲`/`▼`) for:
    - Name (`name,asc` / `name,desc`)
    - Members (`memberCount,asc` / `memberCount,desc`)
  - Query param sent: `sort`
- Group filtering:
  - Name filter input with Apply/Clear
  - Supports wildcard patterns:
    - `*` matches any sequence
    - `?` matches one character
  - Query param sent: `name`
  - Fallback current-page filter still applied client-side if backend ignores filter
- Members column:
  - Uses `memberCount` from API response (`GroupResponse`)

### Group page (`src/app/groups/[groupId]/page.tsx`)

- Expenses list:
  - Numbered pagination + Previous/Next
  - Page size selector (`5, 10, 25, 50, 100`)
  - Sort controls (`Date ▲/▼`, `Amount ▲/▼`)
  - Query params sent: `page`, `size`, `sort`
- Confirmed transfers list:
  - Numbered pagination + Previous/Next
  - Page size selector (`5, 10, 25, 50, 100`)
  - Sort controls (`Date ▲/▼`, `Amount ▲/▼`)
  - Optional confirmation filter input
  - Query params sent: `confirmationId`, `page`, `size`, `sort`
- Expense events list:
  - Numbered pagination + Previous/Next
  - Page size selector (`5, 10, 25, 50, 100`)
  - Sort controls (`Date ▲/▼`)
  - Query params sent: `page`, `size`, `sort`
- Ledger explanation UI:
  - Loads from `/groups/{groupId}/explanations/ledger`
  - Member dropdown (`Select group member`)
  - Renders selected member details only
  - Supports response shape with top-level `explanations` and `contributions`

## Quick verification checklist

Use this checklist to verify implementation end-to-end in a running app:

1. Home page group list:
   - Change page size to `5` and confirm request includes `pageSize=5`.
   - Click page `2` and confirm request page increments correctly.
   - Click Name `▲`/`▼` and confirm `sort=name,asc|desc`.
   - Apply wildcard filter (e.g., `6*`) and confirm `name=6*` is sent.
2. Group page expenses:
   - Change page size and verify request uses `size=<selected>`.
   - Click Amount `▲`/`▼` and verify `sort=amount,asc|desc`.
3. Group page confirmed transfers:
   - Set confirmation filter + page change and verify both `confirmationId` and pagination params are sent.
4. Group page events:
   - Click Date `▲`/`▼` and verify `sort=createdAt,asc|desc`.
5. Ledger explanation:
   - Reload group page and confirm explanation section loads.
   - Select a member and confirm only that member's explanation is shown.

## API expectations

The frontend expects the following backend endpoints (base URL from `NEXT_PUBLIC_API_BASE_URL`):

### Groups

- `GET /groups` (query params used by UI: `page`, `pageSize`, `sort`, `name`)
  -> `{ items: [{ id, name?, memberCount? }], totalItems, totalPages, currentPage, pageSize }`
- `POST /groups` expects `{ name }` -> `{ id, name? }`
- `GET /groups/{groupId}` -> `{ id, name?, members: [{ id, name? }] }`
- `PATCH /groups/{groupId}` -> `{ id, name?, members: [...] }`

### Members

- `POST /groups/{groupId}/members` expects `{ name }` -> `{ userId, name }`

### Expenses

- `GET /groups/{groupId}/expenses` (query params used by UI: `page`, `size`, `sort`)
  -> `{ items: [{ expenseId, groupId, description, amount, payerUserId, createdAt, splits: [{ userId, shareAmount }] }], totalItems, totalPages, currentPage, pageSize }`
- `POST /groups/{groupId}/expenses` expects:
  ```json
  {
    "description": "string",
    "amount": "0.00",
    "payerUserId": 0,
    "participantUserIds": [0],
    "shares": [1],
    "exactAmounts": ["0.00"],
    "percentages": ["0.00"]
  }
  ```
  Notes: send only one split mode (exactAmounts, percentages, or shares). If none is provided, the backend uses equal split. `paidByUserId` is deprecated; use `payerUserId`.
- `PATCH /groups/{groupId}/expenses/{expenseId}` -> updated expense response (200)
- `DELETE /groups/{groupId}/expenses/{expenseId}` -> 204

### Settlements

- `GET /groups/{groupId}/settlements` -> `{ transfers: [{ fromUserId, toUserId, amount }] }`
- `POST /groups/{groupId}/settlements/confirm` -> `{ confirmationId, appliedTransfersCount }`
  - Optional header: `Confirmation-Id: <uuid>` (overrides body `confirmationId` if body omits it)
  ```json
  {
    "confirmationId": "string",
    "transfers": [
      { "fromUserId": 0, "toUserId": 0, "amount": 0 }
    ]
  }
  ```
  Notes: `confirmationId` is optional and can be used for idempotency.
- `GET /groups/{groupId}/api/confirmation-id` -> `{ confirmationId }` (generate a confirmation id)

### Ledger and analytics

- `GET /groups/{groupId}/ledger` -> `{ entries: [{ userId, netBalance }] }`
- `GET /groups/{groupId}/explanations/ledger` -> `{ explanations: [{ userId, netBalance, contributions: [...] }] }` (also supports compatible wrapped/legacy shapes)
- `GET /groups/{groupId}/events` (query params used by UI: `page`, `size`, `sort`) -> `{ items: [{ eventId, groupId, expenseId, eventType, payload, createdAt }], totalItems, totalPages, currentPage, pageSize }`
- `GET /groups/{groupId}/confirmed-transfers` (query params used by UI: `confirmationId`, `page`, `size`, `sort`) -> `{ items: [{ id, groupId, fromUserId, toUserId, amount, confirmationId, createdAt }], totalItems, totalPages, currentPage, pageSize }`
- `GET /groups/{groupId}/owes?fromUserId=...&toUserId=...` -> `{ amount }`
- `GET /groups/{groupId}/owes/historical?fromUserId=...&toUserId=...` -> `{ amount }`

## Project structure

- `src/app/page.tsx` - home (group list + create/rename)
- `src/app/groups/[groupId]/page.tsx` - group details

## Notes

- The UI is optimized for simple workflows and uses client-side data fetching.
- UI page numbers are 1-based. Backend `currentPage` from Spring-style pageable responses is treated as 0-based and mapped in the frontend.
- If your backend response shape differs, update the types in the page components.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
