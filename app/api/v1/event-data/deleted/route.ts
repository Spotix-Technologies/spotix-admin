import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function getAdminFromHeaders(request: NextRequest): { uid: string; username: string } | null {
  const isAdmin = request.headers.get("x-is-admin")
  const uid = request.headers.get("x-user-uid")
  const username =
    request.headers.get("x-user-username") ||
    request.headers.get("x-user-fullname") ||
    "Unknown Admin"
  if (isAdmin !== "true" || !uid) return null
  return { uid, username }
}

/* GET — list all deleted events */
export async function GET(request: NextRequest) {
  try {
    if (request.headers.get("x-is-admin") !== "true") {
      return NextResponse.json({ error: "Forbidden: admin access required", developer: DEV_TAG }, { status: 403 })
    }

    const snap = await adminDb
      .collection("deletedEvents")
      .orderBy("deletedAt", "desc")
      .limit(50)
      .get()

    const events = snap.docs.map((doc) => {
      const d = doc.data()
      return {
        eventId: doc.id,
        eventName: d.eventName || "Untitled",
        eventImage: d.eventImage || "",
        organizerId: d.organizerId || "",
        status: d.status || "active",
        deletedAt: d.deletedAt || "",
        deletedBy: d.deletedBy || {},
        deletionReason: d.deletionReason || "",
      }
    })

    return NextResponse.json({ success: true, data: events, developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("GET /api/v1/event-data/deleted error:", error)
    return NextResponse.json({ error: "Internal Server Error", developer: DEV_TAG }, { status: 500 })
  }
}

/* POST — restore a deleted event back to events/ */
export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromHeaders(request)
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: admin access required", developer: DEV_TAG }, { status: 403 })
    }

    const body = await request.json()
    const { eventId } = body

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required", developer: DEV_TAG }, { status: 400 })
    }

    const deletedRef = adminDb.collection("deletedEvents").doc(eventId)
    const deletedDoc = await deletedRef.get()

    if (!deletedDoc.exists) {
      return NextResponse.json({ error: "Deleted event not found", developer: DEV_TAG }, { status: 404 })
    }

    const { deletedAt, deletedBy, deletionReason, originalEventId, ...originalData } = deletedDoc.data()!

    await adminDb.collection("events").doc(eventId).set({
      ...originalData,
      restoredAt: new Date().toISOString(),
      restoredBy: { adminUid: admin.uid, adminUsername: admin.username },
    })

    await deletedRef.delete()

    return NextResponse.json({ success: true, message: "Event restored successfully", developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("POST /api/v1/event-data/deleted error:", error)
    return NextResponse.json({ error: "Internal Server Error", developer: DEV_TAG }, { status: 500 })
  }
}