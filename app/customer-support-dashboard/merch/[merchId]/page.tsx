import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { MerchDetailClient } from "./merch-detail-client"

export const metadata: Metadata = { title: "Merch Item | Customer Support Dashboard" }

export default async function Page({ params }: { params: Promise<{ merchId: string }> }) {
  await getRoleUser("customer-support") // auth guard
  const { merchId } = await params
  return <MerchDetailClient merchId={merchId} backHref="/customer-support-dashboard/merch" />
}
