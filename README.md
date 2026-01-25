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
- Add members to a group
- Add expenses with split modes:
  - Equal split
  - Exact amounts
  - Percentages
- View expenses and settle-up transfers
- Confirm transfers ("Mark paid") with backend persistence

## API expectations

The frontend expects the following backend endpoints (base URL from `NEXT_PUBLIC_API_BASE_URL`):

### Groups

- `GET /groups` -> `[{ id, name? }]`
- `POST /groups` -> `{ id, name? }`
- `GET /groups/{groupId}` -> `{ id, name?, members: [{ id, name?, userName? }] }`
- `PATCH /groups/{groupId}` -> `{ id, name?, members: [...] }`

### Members

- `POST /groups/{groupId}/members` expects `{ userName }` -> `{ userId, name }`

### Expenses

- `GET /groups/{groupId}/expenses` -> `[{ expenseId, groupId, description, amount, payerUserId, createdAt, splits: [{ userId, shareAmount }] }]`
- `POST /groups/{groupId}/expenses` expects:
  ```json
  {
    "description": "string",
    "amount": 0,
    "payerUserId": 0,
    "paidByUserId": 0,
    "participantUserIds": [0],
    "shares": [1],
    "exactAmounts": [0],
    "percentages": [0]
  }
  ```
  Notes: send only one split mode (exactAmounts, percentages, or shares). If none is provided, the backend uses equal split. The backend accepts either `payerUserId` or `paidByUserId`.
- `PATCH /groups/{groupId}/expenses/{expenseId}` -> updated expense response
- `DELETE /groups/{groupId}/expenses/{expenseId}` -> 204

### Settlements

- `GET /groups/{groupId}/settlements` -> `{ transfers: [{ fromUserId, toUserId, amount }] }`
- `POST /groups/{groupId}/settlements/confirm` -> 204
  ```json
  {
    "confirmationId": "string",
    "transfers": [
      { "fromUserId": 0, "toUserId": 0, "amount": 0 }
    ]
  }
  ```
  Notes: `confirmationId` is optional and can be used for idempotency.

### Ledger and analytics

- `GET /groups/{groupId}/ledger` -> `{ entries: [{ userId, netBalance }] }`
- `GET /groups/{groupId}/events` -> `[{ eventId, groupId, expenseId, eventType, payload, createdAt }]`
- `GET /groups/{groupId}/confirmed-transfers?confirmationId=...` -> `[{ id, groupId, fromUserId, toUserId, amount, confirmationId, createdAt }]`
- `GET /groups/{groupId}/owes?fromUserId=...&toUserId=...` -> `{ amount }`
- `GET /groups/{groupId}/owes/historical?fromUserId=...&toUserId=...` -> `{ amount }`

## Project structure

- `src/app/page.tsx` - home (group list + create/rename)
- `src/app/groups/[groupId]/page.tsx` - group details

## Notes

- The UI is optimized for simple workflows and uses client-side data fetching.
- If your backend response shape differs, update the types in the page components.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
