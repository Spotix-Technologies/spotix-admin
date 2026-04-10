import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

/**
 * Verifies admin access via session cookie.
 * Must be called at the beginning of protected admin API routes.
 * Returns null if verification fails, with appropriate error response already sent.
 * Returns admin object with uid and username if verification succeeds.
 */
export async function verifyAdminAccess(request: NextRequest): Promise<
  | { uid: string; username: string }
  | { error: NextResponse }
> {
  try {
    // Check for session cookie
    const sessionCookie = request.cookies.get("spotix_session")?.value

    if (!sessionCookie) {
      return {
        error: NextResponse.json(
          { error: "Unauthorized: admin access required" },
          { status: 401 }
        ),
      }
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const uid = decodedClaims.uid

    // Check if user is an admin
    const adminDoc = await adminDb.collection("admins").doc(uid).get()
    const isAdmin = adminDoc.exists && adminDoc.data()?.role === "admin"

    if (!isAdmin) {
      return {
        error: NextResponse.json(
          { error: "Forbidden: admin access required" },
          { status: 403 }
        ),
      }
    }

    // Get user info for audit trail
    const userDoc = await adminDb.collection("users").doc(uid).get()
    const userData = userDoc.data()

    return {
      uid,
      username: userData?.username || "Unknown Admin",
    }
  } catch {
    return {
      error: NextResponse.json(
        { error: "Unauthorized: admin access required" },
        { status: 401 }
      ),
    }
  }
}
