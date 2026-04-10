import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, isRestricted, reason } = body

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter required" },
        { status: 400 },
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 },
      )
    }

    const dateRef = adminDb
      .collection("admin")
      .doc("global")
      .collection("restrictedDate")
      .doc(date)

    await dateRef.set({
      date,
      isRestricted: isRestricted ?? true,
      reason,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json(
      { success: true, message: "Restricted date added" },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error adding restricted date:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to add restricted date",
      },
      { status: 500 },
    )
  }
}