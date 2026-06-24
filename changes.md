# Changes

## 1. References page – responsive search bar
- `app/admin-dashboard/references/references-client.tsx`
  - Search row now uses `flex-col` on mobile and `flex-row` on `sm+`. The "Look up" button drops below the input on small screens (`w-full sm:w-auto`).

## 2. Revenue breakdown pie chart – main dashboard
- `app/admin-dashboard/components/revenue-breakdown.tsx` (**new**)
  - Recharts `PieChart` (donut) showing how yearly `totalRevenue` splits across Retained Revenue, Organiser Payouts, and Transaction Fees. Includes a detail row list with percentages alongside the chart.
- `app/admin-dashboard/components/home-stats.tsx`
  - Imports and renders `<RevenueBreakdown>` between the Year Stats bar chart and the Month Stats section.

## 3. Payouts tab in event-data detail view
- `app/admin-dashboard/event-data/event-data-tab.tsx`
  - Added `"payouts"` to the `activeTab` union type.
  - Added a **Payouts** tab button (with `Wallet` icon) to the tab bar.
  - Inline `AdminPayoutsTab` component queries `/api/v1/event-data/payouts?eventId=` and renders a table showing `payoutId`, `amount`, and status badge for each payout.
  - Added `Loader2`, `AlertCircle`, `Wallet`, and `useEffect` imports.
- `app/api/v1/event-data/payouts/route.ts` (**new**)
  - `GET ?eventId=...` – queries the `payouts` Firestore collection filtered by `eventId` and returns `{ payoutId, amount, status }` per document.

## 4. Attendees export – registry ceremony (mirrors booker)
- `app/admin-dashboard/event-data/admin-attendees-tab.tsx`
  - Replaced the old `ExportDialog` (which had a purchase-count toggle) with `RegistryDialog` matching the booker app's export flow exactly:
    - **CSV** downloads immediately with no key ceremony.
    - **JSON** first calls `/api/v1/event-data/sync-key` to mint a Scanner sync key, reveals it once with copy/hide controls, then downloads the `{ eventId, eventName, guests }` envelope-wrapped JSON.
  - CSV schema: `fullName, email, ticketId, ticketType, facialEnroll, faceEmbedding` (no purchase-count de-duplication).
  - JSON schema: envelope `{ eventId, eventName, guests: [...] }` — same structure as booker.
- `app/api/v1/event-data/sync-key/route.ts` (**new**)
  - `POST { eventId }` – generates a 12-character alphanumeric sync key, writes `syncKey` + `syncKeyCreatedAt` to `events/{eventId}` (identical fields to the booker's `/api/sync`), and returns the key once. Scanner compatibility guaranteed.
