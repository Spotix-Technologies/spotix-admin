import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { VerificationClient } from "./verification-client"

export const metadata: Metadata = { title: "Verification | Exec Assistant Dashboard" }

export default async function Page() {
  await getRoleUser("exec-assistant") // auth guard
  return <VerificationClient />
}
