import type React from "react"
import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { RoleDashboardLayoutClient } from "@/components/role-layout/role-dashboard-layout-client"

export const metadata: Metadata = { title: "IT Dashboard | Spotix" }

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getRoleUser("IT")
  return (
    <RoleDashboardLayoutClient user={user} dashboardLabel="IT Dashboard" basePath="/it-dashboard">
      {children}
    </RoleDashboardLayoutClient>
  )
}
