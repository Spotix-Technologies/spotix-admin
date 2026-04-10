import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
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
    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { error: "Reason for blocking is required" },
        { status: 400 }
      )
    }

    // Check if user exists
    const usersRef = adminDb.collection("users")
    const userQuery = await usersRef.where("email", "==", decodedEmail).limit(1).get()

    if (userQuery.empty) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Block the user
    const blockRef = adminDb.collection("blockedUsers").doc(decodedEmail)
    await blockRef.set({
      email: decodedEmail,
      reason,
      blockedAt: new Date().toISOString(),
      blockedBy: "admin", // In a real scenario, get the admin name from adminResult
    })

    return NextResponse.json({
      success: true,
      message: `User ${decodedEmail} has been blocked`,
    })
  } catch (error) {
    console.error("[v0] Block user error:", error)
    return NextResponse.json(
      { error: "Failed to block user" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Unblock the user
    const blockRef = adminDb.collection("blockedUsers").doc(decodedEmail)
    await blockRef.delete()

    return NextResponse.json({
      success: true,
      message: `User ${decodedEmail} has been unblocked`,
    })
  } catch (error) {
    console.error("[v0] Unblock user error:", error)
    return NextResponse.json(
      { error: "Failed to unblock user" },
      { status: 500 }
    )
  }
}
