import type { Metadata } from "next"
import DisbursementsClient from "./disbursements-client"

export const metadata: Metadata = {
  title: "Disbursements | Spotix Admin Portal",
}

// Like Transfers, this menu item is only shown to the "admin" role in the
// sidebar (see dashboard-layout-client.tsx's roles: ["admin"]) — the
// creation/approval endpoints behind it independently re-check for
// "admin" too, so hitting this URL directly as another role still just
// gets 403s. The "My Payments" tab inside DisbursementsClient hits the
// same /api/v1/payments/* endpoints every role dashboard's Payments tab
// uses, open to any admin role, since a full admin can be a disbursement
// recipient as well.
export default function DisbursementsPage() {
  return <DisbursementsClient />
}
