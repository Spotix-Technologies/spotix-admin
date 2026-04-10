import { type NextRequest, NextResponse } from "next/server"
import { adminDb, admin } from "@/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, isRestricted, reason } = body

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 },
      )
    }

    const dateRef = adminDb
      .collection("admin")
      .doc("global")
      .collection("restrictedDates")
      .doc(date)

    await dateRef.set(
      {
        isRestricted,
        reason: reason || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    return NextResponse.json(
      { success: true, message: "Restricted date created/updated" },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating restricted date:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to create restricted date",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split("/")
    const date = pathParts[pathParts.length - 1]

    if (!date || date === "restricted-date") {
      return NextResponse.json(
        { error: "Date parameter required" },
        { status: 400 },
      )
    }

    const dateRef = adminDb
      .collection("admin")
      .doc("global")
      .collection("restrictedDates")
      .doc(date)

    await dateRef.delete()

    return NextResponse.json(
      { success: true, message: "Restricted date deleted" },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error deleting restricted date:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to delete restricted date",
      },
      { status: 500 },
    )
  }
}
