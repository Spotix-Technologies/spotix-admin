import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { VotesClient } from "./votes-client"

export const metadata: Metadata = { title: "Voting Control | Exec Assistant Dashboard" }

export default async function Page() {
  await getRoleUser("exec-assistant") // auth guard
  return <VotesClient />
}
