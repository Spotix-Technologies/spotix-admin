import { requireRoles } from "@/lib/require-admin-page"
import { AffiliatesClient } from "./affiliates-client"

export default async function AffiliatesPage() {
  await requireRoles(["admin"])
  return <AffiliatesClient />
}
