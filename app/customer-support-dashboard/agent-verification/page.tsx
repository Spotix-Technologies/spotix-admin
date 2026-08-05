import type { Metadata } from "next"
import { AgentVerificationClient } from "./agent-verification-client"
import { requireRoles } from "@/lib/require-admin-page"

export const metadata: Metadata = {
  title: "Agent Verification | Spotix Admin Portal",
}

export default async function AgentVerificationPage() {
  await requireRoles(["admin", "customer-support"])
  return <AgentVerificationClient />
}
