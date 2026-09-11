import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import RequisitionClient from "@/components/requisition/requisition-client"

export const metadata: Metadata = { title: "Requisition | Exec Assistant Dashboard" }

export default async function Page() {
  await getRoleUser("exec-assistant") // auth guard
  return <RequisitionClient />
}
