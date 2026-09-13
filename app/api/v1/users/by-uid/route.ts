// api/v1/users/by-uid/route.ts
//
// GET ?userId=<uid> → { found, user: { uid, email, username, fullName } }
//
// Companion to /api/v1/users/search (which looks up by email). This lets
// the Users admin page accept a direct userId query — e.g. when an admin
// clicks an organizerId elsewhere in the dashboard (event data, polls,
// merch) and lands on /admin-dashboard/users?userId=<uid>. Returns the
// same shape as /search so the client can reuse its existing
// loadUserData(email, uid) flow once the email is resolved here.

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      return adminResult.error
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")?.trim()

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required", found: false },
        { status: 400 }
      )
    }

    const userDoc = await adminDb.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({ found: false })
    }

    const userData = userDoc.data()!

    return NextResponse.json({
      found: true,
      user: {
        uid: userDoc.id,
        email: userData.email,
        username: userData.username,
        fullName: userData.fullName,
      },
    })
  } catch (error) {
    console.error("[v0] Users by-uid error:", error)
    return NextResponse.json(
      { error: "Failed to look up user", found: false },
      { status: 500 }
    )
  }
}
