import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import RequisitionClient from "@/components/requisition/requisition-client"

export const metadata: Metadata = { title: "Requisition | IT Dashboard" }

export default async function Page() {
  await getRoleUser("IT") // auth guard
  return <RequisitionClient />
}
