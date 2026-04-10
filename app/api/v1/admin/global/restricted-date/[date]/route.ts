import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  try {
    const { date } = await params

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter required" },
        { status: 400 },
      )
    }

    const dateRef = adminDb
      .collection("admin")
      .doc("global")
      .collection("restrictedDate")
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