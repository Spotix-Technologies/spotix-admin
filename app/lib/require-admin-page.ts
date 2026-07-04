// Shared server-side helper for guarding pages inside /admin-dashboard.
//
// Unlike verify-admin.ts (which guards API routes and returns a NextResponse
// error), these helpers are meant to be called directly from Server
// Components / page.tsx files and simply `redirect()` when access is denied.
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export type AdminRole = "admin" | "exec-assistant" | "customer-support" | "marketing" | "IT"

export interface AdminPageUser {
  uid: string
  username: string
  fullName: string
  profilePicture: string | null
  role: AdminRole
  secondaryRoles: AdminRole[]
}

export const ROLE_REDIRECT: Record<string, string> = {
  admin: "/admin-dashboard",
  "exec-assistant": "/exec-assistant-dashboard",
  "customer-support": "/customer-support-dashboard",
  marketing: "/marketing-dashboard",
  IT: "/it-dashboard",
}

async function getAdminPageUser(): Promise<AdminPageUser> {
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
    const role = (adminData.role ?? "") as AdminRole
    if (!role) redirect("/unauth")
    const secondaryRoles: AdminRole[] = adminData.secondaryRoles ?? []

    const userData = userDoc.data()
    return {
      uid,
      username: userData?.username || "Admin",
      fullName: userData?.fullName || "",
      profilePicture: userData?.profilePicture || null,
      role,
      secondaryRoles,
    }
  } catch (err) {
    // redirect() throws internally — let it propagate; anything else means auth failed
    if (err && typeof err === "object" && "digest" in err) throw err
    redirect("/login")
  }
}

/**
 * Any registered admin (any of the 5 roles) may proceed.
 * Used for pages inside /admin-dashboard that are shared across all admin types
 * (e.g. Upload Events, References, Votes, Documents search).
 */
export async function requireAnyAdmin(): Promise<AdminPageUser> {
  return getAdminPageUser()
}

/**
 * Only the primary "admin" role may proceed. Everyone else is redirected to
 * their own dashboard (or /unauth if they have no dashboard of their own).
 */
export async function requireFullAdmin(): Promise<AdminPageUser> {
  const user = await getAdminPageUser()
  if (user.role !== "admin") {
    redirect(ROLE_REDIRECT[user.role] || "/unauth")
  }
  return user
}

/**
 * Only the given roles (checked against primary role or secondary roles)
 * may proceed. Everyone else is redirected to their own dashboard.
 */
export async function requireRoles(roles: AdminRole[]): Promise<AdminPageUser> {
  const user = await getAdminPageUser()
  const allowed = roles.includes(user.role) || user.secondaryRoles.some((r) => roles.includes(r))
  if (!allowed) {
    redirect(ROLE_REDIRECT[user.role] || "/unauth")
  }
  return user
}
