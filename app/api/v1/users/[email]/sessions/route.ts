import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export interface UserSession {
  sessionId: string
  ipAddress: string
  userAgent: string
  country?: string
  city?: string
  lastActivity: string
  createdAt: string
}

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

    // Get user's sessions
    const sessionsRef = adminDb.collection("userSessions")
    const snapshot = await sessionsRef
      .where("userEmail", "==", decodedEmail)
      .orderBy("lastActivity", "desc")
      .limit(20)
      .get()

    const sessions: UserSession[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      sessions.push({
        sessionId: doc.id,
        ipAddress: data.ipAddress || "Unknown",
        userAgent: data.userAgent || "Unknown",
        country: data.country,
        city: data.city,
        lastActivity: data.lastActivity || "",
        createdAt: data.createdAt || "",
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
