import type { Metadata } from "next"
import RequisitionClient from "@/components/requisition/requisition-client"

export const metadata: Metadata = {
  title: "Requisition | Spotix Admin Portal",
}

// Any registered admin role can access this page (enforced by the shared
// /admin-dashboard layout guard) — full admins can request funds too.
export default function RequisitionPage() {
  return <RequisitionClient />
}
