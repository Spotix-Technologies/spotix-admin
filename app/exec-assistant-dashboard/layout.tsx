import type React from "react"
import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { RoleDashboardLayoutClient } from "@/components/role-layout/role-dashboard-layout-client"

export const metadata: Metadata = { title: "Exec Assistant Dashboard | Spotix" }

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getRoleUser("exec-assistant")
  return (
    <RoleDashboardLayoutClient
      user={user}
      dashboardLabel="Exec Assistant Dashboard"
      basePath="/exec-assistant-dashboard"
      extraNavItems={[
        { label: "Documents", href: "/exec-assistant-dashboard/documents", iconName: "FolderOpen" },
        { label: "References", href: "/exec-assistant-dashboard/references", iconName: "Receipt" },
        { label: "Upload Events", href: "/exec-assistant-dashboard/upload-events", iconName: "Globe" },
        { label: "Event Data", href: "/exec-assistant-dashboard/event-data", iconName: "CalendarDays" },
        { label: "Verification", href: "/exec-assistant-dashboard/verification", iconName: "ShieldCheck" },
        { label: "Votes", href: "/exec-assistant-dashboard/votes", iconName: "Vote" },
        { label: "Payments", href: "/exec-assistant-dashboard/payments", iconName: "Wallet" },
        { label: "Legal Content", href: "/exec-assistant-dashboard/legal", iconName: "Scale" },
      ]}
    >
      {children}
    </RoleDashboardLayoutClient>
  )
}
