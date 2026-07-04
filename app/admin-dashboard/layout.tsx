import type React from "react"
import type { Metadata } from "next"
import { requireAnyAdmin } from "@/lib/require-admin-page"
import { DashboardLayoutClient } from "./dashboard-layout-client"

export const metadata: Metadata = {
  title: "Dashboard | Spotix Admin Portal",
  description: "Spotix admin dashboard for managing your platform",
}

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  // Any registered admin role may enter the /admin-dashboard route group.
  // Several pages here (Upload Events, References, Votes, Documents search,
  // Verification, Event Data) are shared across some or all admin types.
  // Pages that must remain restricted guard themselves individually via
  // requireFullAdmin()/requireRoles() from "@/lib/require-admin-page".
  const user = await requireAnyAdmin()
  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>
}
