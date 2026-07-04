import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { VotesClient } from "./votes-client"

export const metadata: Metadata = { title: "Voting Control | Customer Support Dashboard" }

export default async function Page() {
  await getRoleUser("customer-support") // auth guard
  return <VotesClient />
}
