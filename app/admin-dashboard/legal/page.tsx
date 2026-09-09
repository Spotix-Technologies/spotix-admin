import type { Metadata } from "next"
import { LegalContentClient } from "@/components/legal/legal-content-client"
import { requireRoles } from "@/lib/require-admin-page"

export const metadata: Metadata = {
  title: "Legal Content | Spotix Admin Portal",
  description: "Edit the Spotix Terms of Service, EULA, Refund Policy, and Privacy Policy",
}

export default async function LegalContentPage() {
  // Only the primary admin and exec-assistant may edit legal content.
  const user = await requireRoles(["admin", "exec-assistant"])
  return <LegalContentClient adminName={user.username} />
}
