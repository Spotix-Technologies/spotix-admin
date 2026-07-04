import { GlobalsClient } from "./components/globals-client"
import { requireFullAdmin } from "@/lib/require-admin-page"

export default async function GlobalsPage() {
  await requireFullAdmin()
  return <GlobalsClient />
}
