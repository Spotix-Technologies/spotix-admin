import type React from "react"
import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { RoleDashboardLayoutClient } from "@/components/role-layout/role-dashboard-layout-client"

export const metadata: Metadata = { title: "Customer Support Dashboard | Spotix" }

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getRoleUser("customer-support")
  return (
    <RoleDashboardLayoutClient user={user} dashboardLabel="Customer Support Dashboard" basePath="/customer-support-dashboard">
      {children}
    </RoleDashboardLayoutClient>
  )
}
