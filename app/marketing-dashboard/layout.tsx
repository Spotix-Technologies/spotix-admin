import type React from "react"
import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { RoleDashboardLayoutClient } from "@/components/role-layout/role-dashboard-layout-client"

export const metadata: Metadata = { title: "Marketing Dashboard | Spotix" }

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getRoleUser("marketing")
  return (
    <RoleDashboardLayoutClient
      user={user}
      dashboardLabel="Marketing Dashboard"
      basePath="/marketing-dashboard"
      extraNavItems={[
        { label: "Upload Events", href: "/marketing-dashboard/upload-events", iconName: "Globe" },
        { label: "Payments", href: "/marketing-dashboard/payments", iconName: "Wallet" },
      ]}
    >
      {children}
    </RoleDashboardLayoutClient>
  )
}
