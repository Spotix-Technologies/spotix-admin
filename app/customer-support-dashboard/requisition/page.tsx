import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import RequisitionClient from "@/components/requisition/requisition-client"

export const metadata: Metadata = { title: "Requisition | Customer Support Dashboard" }

export default async function Page() {
  await getRoleUser("customer-support") // auth guard
  return <RequisitionClient />
}
