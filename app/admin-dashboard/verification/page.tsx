import type { Metadata } from "next"
import { VerificationClient } from "./verification-client"
import { requireRoles } from "@/lib/require-admin-page"

export const metadata: Metadata = {
  title: "Verification | Spotix Admin Portal",
}

export default async function VerificationPage() {
  // Admin, customer-support, and exec-assistant may review verification
  // requests and issue Booker Verification Tags.
  await requireRoles(["admin", "customer-support", "exec-assistant"])
  return <VerificationClient />
}
