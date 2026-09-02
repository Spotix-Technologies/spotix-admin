import type React from "react"
import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { RoleDashboardLayoutClient } from "@/components/role-layout/role-dashboard-layout-client"

export const metadata: Metadata = { title: "Customer Support Dashboard | Spotix" }

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getRoleUser("customer-support")
  return (
    <RoleDashboardLayoutClient
      user={user}
      dashboardLabel="Customer Support Dashboard"
      basePath="/customer-support-dashboard"
      extraNavItems={[
        { label: "References", href: "/customer-support-dashboard/references", iconName: "Receipt" },
        { label: "Upload Events", href: "/customer-support-dashboard/upload-events", iconName: "Globe" },
        { label: "Event Data", href: "/customer-support-dashboard/event-data", iconName: "CalendarDays" },
        { label: "Verification", href: "/customer-support-dashboard/verification", iconName: "ShieldCheck" },
        { label: "Agent Verification", href: "/customer-support-dashboard/agent-verification", iconName: "UserCheck" },
        { label: "Votes", href: "/customer-support-dashboard/votes", iconName: "Vote" },
        { label: "Payments", href: "/customer-support-dashboard/payments", iconName: "Wallet" },
      ]}
    >
      {children}
    </RoleDashboardLayoutClient>
  )
}
