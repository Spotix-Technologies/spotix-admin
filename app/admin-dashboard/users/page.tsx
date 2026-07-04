import { type Metadata } from "next"
import { UsersClient } from "./user-client"
import { requireFullAdmin } from "@/lib/require-admin-page"

export const metadata: Metadata = {
  title: "Users | Spotix Admin Dashboard",
  description: "Search and manage user accounts, view tickets, payouts, and sessions",
}

export default async function UsersPage() {
  await requireFullAdmin()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 mt-1 text-sm">Search and manage user accounts</p>
      </div>
      <UsersClient />
    </div>
  )
}
