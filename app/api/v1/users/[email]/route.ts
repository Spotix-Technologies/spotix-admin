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

    // Find user by email
    const usersRef = adminDb.collection("users")
    const userQuery = await usersRef.where("email", "==", decodedEmail).limit(1).get()

    if (userQuery.empty) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userDoc = userQuery.docs[0]
    const userData = userDoc.data()

    const toISO = (val: any): string => {
  if (!val) return ""
  if (typeof val?.toDate === "function") return val.toDate().toISOString()
  return String(val)
}

    const details = {
    createdAt: toISO(userData.createdAt),
    email: userData.email || "",
    fullName: userData.fullName || "",
    isBooker: userData.isBooker || false,
    lastLogin: toISO(userData.lastLogin),
    phoneNumber: userData.phoneNumber || "",
    profilePicture: userData.profilePicture || "",
    referralCodeUsed: userData.referralCodeUsed || "",
    referredBy: userData.referredBy || "",
    totalEvents: userData.totalEvents || 0,
    totalPaidOut: userData.totalPaidOut || 0,
    totalRevenue: userData.totalRevenue || 0,
    totalTicketsSold: userData.totalTicketsSold || 0,
    updatedAt: toISO(userData.updatedAt),
    username: userData.username || "",
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
