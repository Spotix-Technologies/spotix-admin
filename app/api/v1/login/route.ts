import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { createSessionCookie, setSessionCookie } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const idToken = body?.idToken

    if (!idToken) {
      return NextResponse.json(
        { error: "ID token is required" },
        { status: 400 }
      )
    }

    // 1️⃣ Verify Firebase ID token (allow slightly expired tokens)
    let decodedToken
    try {
      // First try normal verification
      decodedToken = await adminAuth.verifyIdToken(idToken, false)
    } catch (error: any) {
      // If token is expired, provide helpful error
      if (error?.code === 'auth/id-token-expired') {
        return NextResponse.json(
          { 
            error: "Session expired. Please try logging in again.",
            code: "auth/id-token-expired",
            requiresReauth: true 
          },
          { status: 401 }
        )
      }
      throw error
    }

    const uid = decodedToken.uid

    // 2️⃣ Ensure user exists
    const userDoc = await adminDb.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const userData = userDoc.data()

    // 3️⃣ Check admin role
    const adminDoc = await adminDb.collection("admins").doc(uid).get()

    let isAdmin = false
    let role: string | null = null

    if (adminDoc.exists) {
      const adminData = adminDoc.data()
      role = adminData?.role ?? null
      isAdmin = role === "admin"
    }

    // 4️⃣ Create Firebase session cookie
    const sessionCookie = await createSessionCookie(idToken)

    // 5️⃣ Set HTTP-only session cookie
    await setSessionCookie(sessionCookie)

    // 6️⃣ Success response
    return NextResponse.json({
      success: true,
      user: {
        uid,
        profilePicture: userData?.profilePicture ?? null,
        username: userData?.username ?? null,
        fullName: userData?.fullName ?? null,
      },
      isAdmin,
      role,
    })
  } catch (error: any) {
    // DO NOT mask Firebase errors
    console.error("Login error FULL:", error)

    return NextResponse.json(
      {
        error: error?.message ?? "Authentication failed",
        code: error?.code ?? null,
      },
      { status: 401 }
    )
  }
}