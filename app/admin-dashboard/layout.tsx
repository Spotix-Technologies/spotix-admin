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

  if (!sessionCookie) {
    redirect("/login")
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const uid = decodedClaims.uid

    // Fetch user data
    const userDoc = await adminDb.collection("users").doc(uid).get()
    const userData = userDoc.data()

    // Check admin status
    const adminDoc = await adminDb.collection("admins").doc(uid).get()
    const isAdmin = adminDoc.exists && adminDoc.data()?.role === "admin"

    if (!isAdmin) {
      redirect("/unauth")
    }

    return {
      uid,
      username: userData?.username || "Admin",
      fullName: userData?.fullName || "",
      profilePicture: userData?.profilePicture || null,
    }
  } catch {
    redirect("/login")
  }
}

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserData()

  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>
}
