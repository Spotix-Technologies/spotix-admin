import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PUT(request: NextRequest) {
  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      return adminResult.error
    }

    const body = await request.json()
    const { isPayoutAllowed, isPayoutNotAllowedReason } = body

    const globalRef = adminDb.collection("admin").doc("global")

    await globalRef.set(
      {
        isPayoutAllowed,
        isPayoutNotAllowedReason: isPayoutNotAllowedReason || null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    return NextResponse.json(
      { success: true, message: "Payout settings updated" },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error updating payout settings:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to update payout settings",
      },
      { status: 500 },
    )
  }
}
