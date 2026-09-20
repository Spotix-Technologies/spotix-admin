"use client"

import { useAdminSession } from "@/hooks/use-admin-session"
import { Vote } from "lucide-react"
import ElectionsListPanel from "@/components/elections/elections-list-panel"

export function ElectionManagementClient() {
  const { session } = useAdminSession()

  // Full "admin" can edit a given election's fee; anyone else who lands
  // here via a secondary role (e.g. exec-assistant) sees it read-only.
  // The API route independently re-checks this, so this is purely about
  // not showing a Save button that would just 403.
  const canEditFees = session?.role === "admin" || session?.secondaryRoles?.includes("admin") || false

  return (
    <div className="space-y-5 p-4 md:p-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center">
          <Vote className="w-4 h-4 text-[#6b2fa5]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Election Management</h1>
          <p className="text-xs text-gray-500">Per-election platform fee configuration for Spotix elections</p>
        </div>
      </div>

      <ElectionsListPanel apiBase="admin-elections" canEditFees={canEditFees} adminUsername={session?.username ?? "Admin"} />
    </div>
  )
}
