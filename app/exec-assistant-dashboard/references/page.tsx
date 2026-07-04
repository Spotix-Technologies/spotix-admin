import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { ReferencesClient } from "./references-client"

export const metadata: Metadata = { title: "References | Exec Assistant Dashboard" }

export default async function Page() {
  await getRoleUser("exec-assistant") // auth guard
  return <ReferencesClient />
}
