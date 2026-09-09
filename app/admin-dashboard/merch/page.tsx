import type { Metadata } from "next"
import { MerchAdminClient } from "./merch-admin-client"
import { requireRoles } from "@/lib/require-admin-page"

export const metadata: Metadata = {
  title: "Merch | Spotix Admin Portal",
}

export default async function MerchPage() {
  await requireRoles(["admin", "customer-support"])
  return <MerchAdminClient />
}
