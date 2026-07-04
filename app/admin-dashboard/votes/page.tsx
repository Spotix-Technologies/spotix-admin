import type { Metadata } from "next"
import { VotesClient } from "./votes-client"

export const metadata: Metadata = {
  title: "Voting Control | Spotix Admin Portal",
}

// Any registered admin role can access this page (enforced by the shared
// /admin-dashboard layout guard).
export default function VotesPage() {
  return <VotesClient />
}
