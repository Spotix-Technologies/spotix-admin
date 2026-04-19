import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export type AdminRole = "admin" | "exec-assistant" | "customer-support" | "marketing" | "IT"

export interface AdminIdentity {
  uid: string
  username: string
  role: AdminRole
  secondaryRoles: AdminRole[]
  isSuperAdmin: boolean
}

/**
 * Verifies admin access via session cookie.
 * Pass `requiredRoles` to restrict access to specific roles.
 * If empty, any valid admin role is accepted.
 */
export async function verifyAdminAccess(
  request: NextRequest,
  requiredRoles: AdminRole[] = []
): Promise<AdminIdentity | { error: NextResponse }> {
  try {
    const sessionCookie = request.cookies.get("spotix_session")?.value
    if (!sessionCookie) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const uid = decodedClaims.uid

    const [adminDoc, userDoc] = await Promise.all([
      adminDb.collection("admins").doc(uid).get(),
      adminDb.collection("users").doc(uid).get(),
    ])

    if (!adminDoc.exists) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
    }

    const adminData = adminDoc.data()!
    const role = (adminData.role ?? "") as AdminRole
    const secondaryRoles: AdminRole[] = adminData.secondaryRoles ?? []
    const isSuperAdmin = adminData.setup === true

    // Determine all roles this user has
    const allRoles = [role, ...secondaryRoles]

    // Enforce required roles if specified
    if (requiredRoles.length > 0) {
      const hasAccess = requiredRoles.some((r) => allRoles.includes(r))
      if (!hasAccess) {
        return { error: NextResponse.json({ error: "Forbidden: insufficient role" }, { status: 403 }) }
      }
    } else {
      // Any registered admin role is fine
      if (!role) {
        return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
      }
    }

    const userData = userDoc.data()
    return {
      uid,
      username: userData?.username || "Unknown",
      role,
      secondaryRoles,
      isSuperAdmin,
    }
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
}

/** Convenience: only full admins */
export async function verifyFullAdmin(request: NextRequest) {
  return verifyAdminAccess(request, ["admin"])
}
