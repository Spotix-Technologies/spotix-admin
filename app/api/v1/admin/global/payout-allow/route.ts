import { type NextRequest, NextResponse } from "next/server"
import { adminDb, admin } from "@/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { isPayoutAllowed, isPayoutNotAllowedReason } = body

    const globalRef = adminDb.collection("admin").doc("global")

    await globalRef.set(
      {
        isPayoutAllowed,
        isPayoutNotAllowedReason: isPayoutNotAllowedReason || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
