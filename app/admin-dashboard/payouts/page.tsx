import { UnderDevelopment } from "../components/under-development"
import { requireFullAdmin } from "@/lib/require-admin-page"

export default async function PayoutsPage() {
  await requireFullAdmin()
  return <UnderDevelopment pageName="Payouts" />
}
