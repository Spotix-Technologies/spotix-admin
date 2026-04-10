import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      return adminResult.error
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")?.trim()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required", found: false },
        { status: 400 }
      )
    }

    // Search user by exact email
    const usersRef = adminDb.collection("users")
    const snapshot = await usersRef.where("email", "==", email).limit(1).get()

    if (snapshot.empty) {
      return NextResponse.json({ found: false })
    }

    const userDoc = snapshot.docs[0]
    const userData = userDoc.data()

    return NextResponse.json({
      found: true,
      user: {
        email: userData.email,
        username: userData.username,
        fullName: userData.fullName,
      },
    })
  } catch (error) {
    console.error("[v0] Users search error:", error)
    return NextResponse.json(
      { error: "Failed to search users", found: false },
      { status: 500 }
    )
  }
}
