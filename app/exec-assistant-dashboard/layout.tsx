import type React from "react"
import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { RoleDashboardLayoutClient } from "@/components/role-layout/role-dashboard-layout-client"

export const metadata: Metadata = { title: "Exec Assistant Dashboard | Spotix" }

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getRoleUser("exec-assistant")
  return (
    <RoleDashboardLayoutClient user={user} dashboardLabel="Exec Assistant Dashboard" basePath="/exec-assistant-dashboard">
      {children}
    </RoleDashboardLayoutClient>
  )
}
