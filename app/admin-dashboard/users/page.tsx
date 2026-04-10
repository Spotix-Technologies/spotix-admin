import { type Metadata } from "next"
import { UsersClient } from "./user-client"

export const metadata: Metadata = {
  title: "Users | Spotix Admin Dashboard",
  description: "Search and manage user accounts, view tickets, payouts, and sessions",
}

export default function UsersPage() {
  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-600 mt-2">Search and manage user accounts</p>
      </div>

      <UsersClient />
    </main>
  )
}
