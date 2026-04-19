import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { createSessionCookie, setSessionCookie } from "@/lib/session"
import type { AdminRole } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VALID_ROLES: AdminRole[] = ["admin", "exec-assistant", "customer-support", "marketing", "IT"]

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("spotix_session")?.value
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const uid = decodedClaims.uid

    const body = await request.json()
    const targetRole: AdminRole = body?.targetRole

    if (!targetRole || !VALID_ROLES.includes(targetRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Verify user has that role as a secondary role
    const adminDoc = await adminDb.collection("admins").doc(uid).get()
    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const adminData = adminDoc.data()!
    const currentRole: AdminRole = adminData.role
    const secondaryRoles: AdminRole[] = adminData.secondaryRoles ?? []
    const allRoles = [currentRole, ...secondaryRoles]

    if (!allRoles.includes(targetRole)) {
      return NextResponse.json({ error: "Role not assigned to user" }, { status: 403 })
    }

    // Swap: targetRole becomes primary, current becomes secondary
    const newSecondaryRoles = allRoles.filter((r) => r !== targetRole)

    await adminDb.collection("admins").doc(uid).update({
      role: targetRole,
      secondaryRoles: newSecondaryRoles,
    })

    // Issue a fresh session cookie (re-auth for the new role)
    // We use the existing session claims to mint a new Firebase custom token,
    // then create a new session cookie from it.
    const customToken = await adminAuth.createCustomToken(uid)

    // We can't directly exchange a custom token server-side without the client SDK.
    // Instead, we keep the existing session cookie (still valid) and just tell the
    // client the role has swapped. The layout.tsx re-reads admins/{uid} on each load.
    // So we just return success — the redirect in the client will trigger a page load
    // which re-reads from Firestore. No new cookie needed since the session is still valid.

    return NextResponse.json({ success: true, newRole: targetRole })
  } catch (error) {
    console.error("[switch-role]", error)
    return NextResponse.json({ error: "Failed to switch role" }, { status: 500 })
  }
}
