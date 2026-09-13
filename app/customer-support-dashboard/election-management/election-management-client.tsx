"use client"

import { Vote } from "lucide-react"
import ElectionsListPanel from "@/components/elections/elections-list-panel"

// Customer-support's own view of Election Management: each election's
// fee editor renders read-only here (canEditFees=false) — configuring
// it is an admin-only capability, enforced again at the API route level
// (/api/v1/support-elections/{electionId}/settings only ever accepts GET).
export function ElectionManagementClient() {
  return (
    <div className="space-y-5 p-4 md:p-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center">
          <Vote className="w-4 h-4 text-[#6b2fa5]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Election Management</h1>
          <p className="text-xs text-gray-500">View each election's platform fee configuration and look up elections</p>
        </div>
      </div>

      <ElectionsListPanel apiBase="support-elections" canEditFees={false} />
    </div>
  )
}
