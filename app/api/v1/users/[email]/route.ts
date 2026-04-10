import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export interface UserDetails {
  email: string
  displayName: string
  userId: string
  createdAt: string
  lastLogin?: string
  totalTickets: number
  totalSpent: number
  blockedStatus?: {
    isBlocked: boolean
    blockedAt?: string
    reason?: string
  }
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

    // Find user by email
    const usersRef = adminDb.collection("users")
    const userQuery = await usersRef.where("email", "==", decodedEmail).limit(1).get()

    if (userQuery.empty) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userDoc = userQuery.docs[0]
    const userData = userDoc.data()

    // Get user's tickets count and total spent
    const ticketsRef = adminDb.collection("userTickets")
    const ticketsSnapshot = await ticketsRef.where("userEmail", "==", decodedEmail).get()

    let totalSpent = 0
    ticketsSnapshot.forEach((doc) => {
      const ticket = doc.data()
      totalSpent += ticket.price || 0
    })

    // Check if user is blocked
    const blockRef = adminDb.collection("blockedUsers").doc(decodedEmail)
    const blockDoc = await blockRef.get()

    const details: UserDetails = {
      email: userData.email,
      displayName: userData.username || userData.email,
      userId: userDoc.id,
      createdAt: userData.createdAt || "",
      lastLogin: userData.lastLogin,
      totalTickets: ticketsSnapshot.size,
      totalSpent,
      blockedStatus: blockDoc.exists
        ? {
            isBlocked: true,
            blockedAt: blockDoc.data()?.blockedAt,
            reason: blockDoc.data()?.reason,
          }
        : { isBlocked: false },
    }

    return NextResponse.json(details)
  } catch (error) {
    console.error("[v0] User details error:", error)
    return NextResponse.json(
      { error: "Failed to fetch user details" },
      { status: 500 }
    )
  }
}
