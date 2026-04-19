// Shared server-side helper for role dashboard layouts
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export type RoleSlug = "exec-assistant" | "customer-support" | "marketing" | "IT"

const ROLE_REDIRECT: Record<string, string> = {
  admin:              "/admin-dashboard",
  "exec-assistant":   "/exec-assistant-dashboard",
  "customer-support": "/customer-support-dashboard",
  marketing:          "/marketing-dashboard",
  IT:                 "/it-dashboard",
}

export async function getRoleUser(expectedRole: RoleSlug) {
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

    const adminData = adminDoc.data()!
    const role: string = adminData.role ?? ""
    const secondaryRoles: string[] = adminData.secondaryRoles ?? []

    // Must have the expected role as primary
    if (role !== expectedRole) {
      const dest = ROLE_REDIRECT[role]
      if (dest) redirect(dest)
      redirect("/unauth")
    }

    const userData = userDoc.data()
    return {
      uid,
      username:       userData?.username      || "User",
      fullName:       userData?.fullName       || "",
      profilePicture: userData?.profilePicture || null,
      role,
      secondaryRoles,
    }
  } catch {
    redirect("/login")
  }
}
