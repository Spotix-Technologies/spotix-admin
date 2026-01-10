import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("spotix_session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "No session" }, { status: 401 })
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const uid = decodedClaims.uid

    // Fetch user data
    const userDoc = await adminDb.collection("users").doc(uid).get()
    const userData = userDoc.data()

    // Check admin status
    const adminDoc = await adminDb.collection("admins").doc(uid).get()
    const isAdmin = adminDoc.exists && adminDoc.data()?.role === "admin"

    return NextResponse.json({
      uid,
      username: userData?.username || null,
      fullName: userData?.fullName || null,
      profilePicture: userData?.profilePicture || null,
      isAdmin,
    })
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }
}
