import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { ReferencesClient } from "./references-client"

export const metadata: Metadata = { title: "References | Customer Support Dashboard" }

export default async function Page() {
  await getRoleUser("customer-support") // auth guard
  return <ReferencesClient />
}
