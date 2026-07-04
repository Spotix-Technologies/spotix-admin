import { HomeStats } from "./components/home-stats"
import { requireFullAdmin } from "@/lib/require-admin-page"

export default async function AdminDashboardPage() {
  // The overview/home stats are restricted to the full "admin" role. Other
  // admin types are redirected to their own dashboard home.
  await requireFullAdmin()
  return <HomeStats />
}
