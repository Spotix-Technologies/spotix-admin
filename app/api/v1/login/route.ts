import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { createSessionCookie, setSessionCookie } from "@/lib/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ROLE_REDIRECT: Record<string, string> = {
  admin:              "/admin-dashboard",
  "exec-assistant":   "/exec-assistant-dashboard",
  "customer-support": "/customer-support-dashboard",
  marketing:          "/marketing-dashboard",
  IT:                 "/it-dashboard",
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const idToken = body?.idToken

    if (!idToken) {
      return NextResponse.json({ error: "ID token is required" }, { status: 400 })
    }

    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken, false)
    } catch (error: any) {
      if (error?.code === "auth/id-token-expired") {
        return NextResponse.json(
          { error: "Session expired. Please try logging in again.", code: "auth/id-token-expired", requiresReauth: true },
          { status: 401 }
        )
      }
      throw error
    }

    const uid = decodedToken.uid

    const userDoc = await adminDb.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!

    const adminDoc = await adminDb.collection("admins").doc(uid).get()
    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Not an admin user" }, { status: 403 })
    }

    const adminData = adminDoc.data()!
    const role: string = adminData.role ?? ""
    const secondaryRoles: string[] = adminData.secondaryRoles ?? []
    const redirectTo = ROLE_REDIRECT[role] ?? "/unauth"

    const sessionCookie = await createSessionCookie(idToken)
    await setSessionCookie(sessionCookie)

    return NextResponse.json({
      success: true,
      user: {
        uid,
        profilePicture: userData.profilePicture ?? null,
        username:       userData.username       ?? null,
        fullName:       userData.fullName        ?? null,
      },
      role,
      secondaryRoles,
      redirectTo,
    })
  } catch (error: any) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: error?.message ?? "Authentication failed", code: error?.code ?? null },
      { status: 401 }
    )
  }
}
