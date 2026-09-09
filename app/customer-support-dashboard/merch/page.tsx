import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { MerchSupportClient } from "./merch-support-client"

export const metadata: Metadata = { title: "Merch | Customer Support Dashboard" }

export default async function Page() {
  await getRoleUser("customer-support") // auth guard
  return <MerchSupportClient />
}
