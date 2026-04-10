import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RestrictedDate {
  date: string
  isRestricted: boolean
  reason?: string
  createdAt?: any
  updatedAt?: any
}

interface RestrictedDay {
  day: string
  isRestricted: boolean
  reason?: string
  createdAt?: any
  updatedAt?: any
}

interface GlobalSettings {
  isPayoutAllowed: boolean
  isPayoutNotAllowedReason?: string
  isMaintenance: boolean
  maintenanceReason?: string
  updatedAt?: any
}

export async function GET(request: NextRequest) {
  try {
    // Get global settings
    const globalRef = adminDb.collection("admin").doc("global")
    const globalDoc = await globalRef.get()
    const globalSettings: GlobalSettings = globalDoc.exists
      ? (globalDoc.data() as GlobalSettings)
      : { isPayoutAllowed: true, isMaintenance: false }

    // Get restricted dates
    const restrictedDatesRef = adminDb.collection("admin").doc("global").collection("restrictedDates")
    const restrictedDatesSnapshot = await restrictedDatesRef.get()
    const restrictedDates: RestrictedDate[] = []
    restrictedDatesSnapshot.forEach((doc) => {
      restrictedDates.push({
        ...(doc.data() as RestrictedDate),
        date: doc.id,
      })
    })

    // Get restricted days
    const restrictedDaysRef = adminDb.collection("admin").doc("global").collection("restrictedDays")
    const restrictedDaysSnapshot = await restrictedDaysRef.get()
    const restrictedDays: RestrictedDay[] = []
    restrictedDaysSnapshot.forEach((doc) => {
      restrictedDays.push({
        ...(doc.data() as RestrictedDay),
        day: doc.id,
      })
    })

    return NextResponse.json(
      {
        success: true,
        globalSettings,
        restrictedDates,
        restrictedDays,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error fetching global settings:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to fetch global settings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, date, day, isRestricted, reason } = body

    if (type === "restricted-date" && date) {
      const dateRef = adminDb
        .collection("admin")
        .doc("global")
        .collection("restrictedDates")
        .doc(date)

      await dateRef.set(
        {
          isRestricted,
          reason: reason || null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

      return NextResponse.json(
        { success: true, message: "Restricted date added" },
        { status: 201 },
      )
    }

    if (type === "restricted-day" && day) {
      const dayRef = adminDb
        .collection("admin")
        .doc("global")
        .collection("restrictedDays")
        .doc(day)

      await dayRef.set(
        {
          isRestricted,
          reason: reason || null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

      return NextResponse.json(
        { success: true, message: "Restricted day updated" },
        { status: 201 },
      )
    }

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 },
    )
  } catch (error) {
    console.error("Error creating restriction:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to create restriction",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const date = url.searchParams.get("date")

    if (!date) {
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
    console.error("Error deleting restriction:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to delete restriction",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { isMaintenance, maintenanceReason } = body

    const globalRef = adminDb.collection("admin").doc("global")

    if (isMaintenance) {
      // Log maintenance enable
      const logsRef = adminDb.collection("maintenanceLogs")
      await logsRef.add({
        isMaintenance: true,
        reason: maintenanceReason || null,
        enabledAt: FieldValue.serverTimestamp(),
        disabledAt: null,
      })
    }

    await globalRef.set(
      {
        isMaintenance,
        maintenanceReason: isMaintenance ? maintenanceReason || null : null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    return NextResponse.json(
      { success: true, message: `Maintenance mode ${isMaintenance ? "enabled" : "disabled"}` },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error updating maintenance status:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to update maintenance status",
      },
      { status: 500 },
    )
  }
}
