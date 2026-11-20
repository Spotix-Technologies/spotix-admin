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

## 5. Dashboard stat cards – numbers no longer cut off
- `app/lib/stat-format.ts` (**new**) – shared `formatCurrency`, `formatCurrencyCompact`, `formatCurrencyFit`, `formatNumber`, `calculatePercentageChange` (previously copy-pasted into three files).
- `app/admin-dashboard/components/stat-card.tsx` (**new**) – shared `StatCard`, `StatGrid`, `PercentageIndicator`. Values never use `truncate`; amounts of ₦1,000,000+ show compact (₦2.6M) with the exact figure in the hover title. Percentage change now sits on its own line so every card has the same height (the "Users Signed Up" label no longer wraps and misaligns the row).
- `year-stats.tsx`, `month-stats.tsx`, `day-stats.tsx` – replaced ~120 lines of duplicated card markup each with `<StatCard>`; grid is 2 cols → 3 cols (md) → 6 cols (2xl) so six cards never get squeezed into ~130px. Day hero figure uses `break-words` instead of `truncate`.

## 6. PWA – header no longer sits under the status bar
- `app/globals.css` – added `.header-safe-top` and `.sidebar-safe` (use `env(safe-area-inset-*)`; the app already runs `viewportFit: "cover"` + `black-translucent`, so content was drawing beneath the clock/notch).
- `dashboard-layout-client.tsx`, `role-dashboard-layout-client.tsx`, `admin-dashboard-client.tsx` – headers use `header-safe-top`; navigation toast offset by the top inset.
- `components/ui/sidebar.tsx` – mobile drawer uses `sidebar-safe` (top/bottom insets, cleared at `lg`).

## 7. Event edit history (Supabase, via spotix-backend)
- `app/admin-dashboard/event-data/edit-history/` (**new**) – `types.ts`, `format.ts`, `use-edit-history.ts`, `edit-history-panel.tsx`: read-only timeline with before/after diffs, ticket-tier diffs, discount created/edited views, "Load older edits" pagination, refresh, and a warning banner if organizer edits can't be loaded.
- `event-data-tab.tsx` – new **History** tab.
- `app/api/v1/event-data/route.ts` – new `GET ?action=getEditHistory&eventId=&before=&limit=`: pulls organizer/teammate edits from spotix-backend `/v1/edit-history` and merges the existing Firestore admin edits (first page). `getEventDetails` no longer ships 50 `editHistory` rows with every load (nothing read them) – one fewer Firestore query per event open.
