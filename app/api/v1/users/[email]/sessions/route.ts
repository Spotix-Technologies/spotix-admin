import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      return adminResult.error
    }

    const { email } = await params
    const decodedEmail = decodeURIComponent(email)

    // Find user by email to get userId
    const usersRef = adminDb.collection("users")
    const userQuery = await usersRef.where("email", "==", decodedEmail).limit(1).get()

    if (userQuery.empty) {
      return NextResponse.json({ sessions: [] })
    }

    const userId = userQuery.docs[0].id

    // Get user's refresh tokens (active sessions)
    const refreshTokensRef = adminDb.collection("refreshTokens")
    const tokensSnapshot = await refreshTokensRef
      .where("userId", "==", userId)
      .where("isRevoked", "==", false)
      .orderBy("lastUsedAt", "desc")
      .limit(20)
      .get()

        const toISO = (val: any): string => {
    if (!val) return ""
    if (typeof val?.toDate === "function") return val.toDate().toISOString()
    return String(val)
    }

    const sessions: any[] = []
    tokensSnapshot.forEach((doc) => {
      const data = doc.data()
      sessions.push({
        tokenId: doc.id,
        deviceId: data.deviceId || "",
        deviceMeta: data.deviceMeta || {},
        appVersion: data.appVersion || "",
        model: data.model || "",
        platform: data.platform || "",
        expiresAt: toISO(data.expiresAt) || "",
        lastUsedAt: toISO(data.lastUsedAt) || "",
      })
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("[v0] User sessions error:", error)
    return NextResponse.json(
      { error: "Failed to fetch sessions", sessions: [] },
      { status: 500 }
    )
  }
}
