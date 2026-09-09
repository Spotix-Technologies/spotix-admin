import type { Metadata } from "next"
import { LegalContentClient } from "@/components/legal/legal-content-client"
import { getRoleUser } from "@/lib/get-role-user"

export const metadata: Metadata = {
  title: "Legal Content | Spotix Exec Assistant Dashboard",
  description: "Edit the Spotix Terms of Service, EULA, Refund Policy, and Privacy Policy",
}

export default async function LegalContentPage() {
  const user = await getRoleUser("exec-assistant")
  return <LegalContentClient adminName={user.username} />
}
