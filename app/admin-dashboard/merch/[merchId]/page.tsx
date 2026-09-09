import type { Metadata } from "next"
import { MerchDetailClient } from "./merch-detail-client"
import { requireRoles } from "@/lib/require-admin-page"

export const metadata: Metadata = { title: "Merch Item | Spotix Admin Portal" }

export default async function MerchDetailPage({ params }: { params: Promise<{ merchId: string }> }) {
  await requireRoles(["admin", "customer-support"])
  const { merchId } = await params
  return <MerchDetailClient merchId={merchId} backHref="/admin-dashboard/merch" />
}
