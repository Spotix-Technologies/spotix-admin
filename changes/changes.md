# Changes

## Event Data page UI
- `app/admin-dashboard/event-data/event-data-client.tsx`
  - Removed the "Signed in as {username}" line from the page header.
  - Replaced the gradient "SPOTIX ADMIN" marketing pill header with a clean icon + title + subtitle header, consistent with the rest of the admin dashboard (e.g. Global Settings).

## Archive → References
- `app/admin-dashboard/archive/page.tsx` — **deleted** (page replaced by References below).
- `app/admin-dashboard/references/page.tsx` — **new**. Entry point for the References page.
- `app/admin-dashboard/references/references-client.tsx` — **new**. Admin pastes a payment reference (from the `Reference` collection, created by `/api/v1/create-pay-ref` in spotix-user) and looks it up:
  - Status (Pending / Paid / Failed) with a status pill.
  - Buyer info (name, email, phone, guest vs registered).
  - Event paid for (name, venue, type, date/time, organizer contact).
  - Ticket breakdown by type/quantity/price, plus any discount/referral applied.
  - Subtotal, transaction fee, and total amount.
  - All tickets generated against the reference, with check-in status.
  - Delete option:
    - Hidden/disabled with explanation if the reference is paid (`successful`), has tickets already generated, or is `failed`.
    - Shown but disabled with a countdown if it's `pending` but younger than 24 hours.
    - Enabled (with a reason + type-to-confirm modal) once `pending` and 24+ hours old.
- `app/api/v1/references/route.ts` — **new**.
  - `GET ?reference=...` — fetches the reference doc, resolves any generated tickets from the `tickets` collection (`ticketReference == reference`), and computes deletion eligibility server-side.
  - `DELETE { reference, reason }` — re-validates status is `pending`, no tickets generated, and 24h have passed since `createdAt`; archives the doc into `deletedReferences` for an audit trail before deleting it from `Reference`.
- `app/admin-dashboard/dashboard-layout-client.tsx` — sidebar menu item renamed from "Archive" (`Archive` icon, inactive) to "References" (`Receipt` icon, active), pointing at `/admin-dashboard/references`.
