import type React from "react"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { DashboardLayoutClient } from "./dashboard-layout-client"

export const metadata: Metadata = {
  title: "Dashboard | Spotix Admin Portal",
  description: "Spotix admin dashboard for managing your platform",
}

async function getUserData() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("spotix_session")?.value

  if (!sessionCookie) redirect("/login")

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const uid = decodedClaims.uid

    const [userDoc, adminDoc] = await Promise.all([
      adminDb.collection("users").doc(uid).get(),
      adminDb.collection("admins").doc(uid).get(),
    ])

    if (!adminDoc.exists) redirect("/unauth")

    const adminData = adminDoc.data()
    const role: string = adminData?.role ?? ""
    const secondaryRoles: string[] = adminData?.secondaryRoles ?? []

    // Only the primary "admin" role may enter /admin-dashboard
    if (role !== "admin") {
      const ROLE_REDIRECT: Record<string, string> = {
        "exec-assistant":   "/exec-assistant-dashboard",
        "customer-support": "/customer-support-dashboard",
        "marketing":        "/marketing-dashboard",
        "IT":               "/it-dashboard",
      }
      const dest = ROLE_REDIRECT[role]
      if (dest) redirect(dest)
      redirect("/unauth")
    }

    const userData = userDoc.data()
    return {
      uid,
      username:       userData?.username      || "Admin",
      fullName:       userData?.fullName       || "",
      profilePicture: userData?.profilePicture || null,
      role,
      secondaryRoles,
    }
  } catch {
    redirect("/login")
  }
}

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserData()
  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>
}
