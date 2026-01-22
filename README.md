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

Install and run the dev server:

```bash
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
- `PATCH /groups/{groupId}` -> 204

### Members

- `POST /groups/{groupId}/members` -> `{ userId, name }`

### Expenses

- `GET /groups/{groupId}/expenses` -> `[{ id, description, amount, payerUserId, createdAt? }]`
- `POST /groups/{groupId}/expenses` expects:
  ```json
  {
    "description": "string",
    "amount": 0,
    "payerUserId": 0,
    "participantUserIds": [0],
    "shares": [1],
    "exactAmounts": [0],
    "percentages": [0]
  }
  ```

### Settlements

- `GET /groups/{groupId}/settlements` -> `{ transfers: [{ fromUserId, toUserId, amount }] }`
- `POST /groups/{groupId}/settlements/confirm` -> 204
  ```json
  {
    "transfers": [
      { "fromUserId": 0, "toUserId": 0, "amount": 0 }
    ]
  }
  ```

## Project structure

- `src/app/page.tsx` - home (group list + create/rename)
- `src/app/groups/[groupId]/page.tsx` - group details

## Notes

- The UI is optimized for simple workflows and uses client-side data fetching.
- If your backend response shape differs, update the types in the page components.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
