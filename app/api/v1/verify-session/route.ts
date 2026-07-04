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

    // Check admin status. `isAdmin` keeps its original meaning (full "admin"
    // role) so existing consumers aren't affected. `role`/`secondaryRoles`
    // are new fields so clients can apply finer-grained permission checks
    // (e.g. edit ownership on pages shared across all admin types).
    const adminDoc = await adminDb.collection("admins").doc(uid).get()
    const adminData = adminDoc.exists ? adminDoc.data() : null
    const role: string = adminData?.role ?? ""
    const secondaryRoles: string[] = adminData?.secondaryRoles ?? []
    const isAdmin = role === "admin"

    return NextResponse.json({
      uid,
      username: userData?.username || null,
      fullName: userData?.fullName || null,
      profilePicture: userData?.profilePicture || null,
      isAdmin,
      role,
      secondaryRoles,
    })
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }
}
