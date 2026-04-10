import { type NextRequest, NextResponse } from "next/server"
import { adminDb, admin } from "@/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { day, isRestricted, reason } = body

    if (!day) {
      return NextResponse.json(
        { error: "Day is required" },
        { status: 400 },
      )
    }

    const dayRef = adminDb
      .collection("admin")
      .doc("global")
      .collection("restrictedDays")
      .doc(day)

    await dayRef.set(
      {
        isRestricted,
        reason: reason || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    return NextResponse.json(
      { success: true, message: "Restricted day updated" },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error updating restricted day:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to update restricted day",
      },
      { status: 500 },
    )
  }
}
