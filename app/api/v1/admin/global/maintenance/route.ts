import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { isMaintenance, maintenanceReason } = body

    const globalRef = adminDb.collection("admin").doc("global")

    if (isMaintenance) {
      // Log maintenance enable
      const logsRef = adminDb.collection("maintenanceLogs")
      await logsRef.add({
        reason: maintenanceReason || null,
        enabledAt: FieldValue.serverTimestamp(),
        disabledAt: null,
      })
    } else {
      // Update the latest log with disabled timestamp
      const logsRef = adminDb.collection("maintenanceLogs")
      const snapshot = await logsRef.orderBy("enabledAt", "desc").limit(1).get()

      if (!snapshot.empty) {
        const latestLog = snapshot.docs[0]
        await latestLog.ref.update({
          disabledAt: FieldValue.serverTimestamp(),
        })
      }
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
