import type { Metadata } from "next"
import { ElectionManagementClient } from "./election-management-client"

export const metadata: Metadata = {
  title: "Election Management | Spotix Admin Portal",
}

// Any registered admin role can access this page and see the elections
// list (enforced by the shared /admin-dashboard layout guard); editing
// the platform fee settings is further restricted to full "admin" at
// the API route level (see /api/v1/admin-elections/settings/route.ts) —
// same split as the Votes page's structure limits.
export default function ElectionManagementPage() {
  return <ElectionManagementClient />
}
