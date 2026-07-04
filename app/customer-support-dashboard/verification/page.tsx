import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { VerificationClient } from "./verification-client"

export const metadata: Metadata = { title: "Verification | Customer Support Dashboard" }

export default async function Page() {
  await getRoleUser("customer-support") // auth guard
  return <VerificationClient />
}
