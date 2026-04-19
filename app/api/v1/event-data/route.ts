import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"



/* ─────────────────────────────────────────────
   GET
   ?action=search&term=       → suggestions (5+ chars)
   ?action=getEventDetails&eventId=  → full doc
───────────────────────────────────────────── */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      const response = adminResult.error as NextResponse
      const json = await response.json() as any
      return NextResponse.json({ error: json.error || "Forbidden: admin access required", developer: DEV_TAG }, { status: response.status })
    }

    

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "listRecent") {
  const snap = await adminDb
    .collection("events")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get()

  const results = snap.docs.map((doc) => {
    const d = doc.data()
    return {
      eventId: doc.id,
      eventName: d.eventName || "Untitled",
      eventImage: d.eventImage || "",
      status: d.status || "active",
      organizerId: d.organizerId || "",
    }
  })

  return NextResponse.json({ success: true, data: results, developer: DEV_TAG }, { status: 200 })
}

    /* SEARCH SUGGESTIONS */
    if (action === "search") {
      const term = searchParams.get("term")?.trim()
      if (!term || term.length < 5) {
        return NextResponse.json({ success: true, data: [] }, { status: 200 })
      }

      const results: Array<{
        eventId: string
        eventName: string
        eventImage: string
        status: string
        organizerId: string
      }> = []

      // Exact eventId lookup
      const byId = await adminDb.collection("events").doc(term).get()
      if (byId.exists) {
        const d = byId.data()!
        results.push({
          eventId: byId.id,
          eventName: d.eventName || "Untitled",
          eventImage: d.eventImage || "",
          status: d.status || "active",
          organizerId: d.organizerId || "",
        })
      }

      // Name prefix query
      const nameSnap = await adminDb
        .collection("events")
        .orderBy("eventName")
        .startAt(term)
        .endAt(term + "\uf8ff")
        .limit(8)
        .get()

      for (const doc of nameSnap.docs) {
        if (results.find((r) => r.eventId === doc.id)) continue
        const d = doc.data()
        results.push({
          eventId: doc.id,
          eventName: d.eventName || "Untitled",
          eventImage: d.eventImage || "",
          status: d.status || "active",
          organizerId: d.organizerId || "",
        })
      }

      return NextResponse.json({ success: true, data: results.slice(0, 8), developer: DEV_TAG }, { status: 200 })
    }

    /* EVENT DETAILS */
    if (action === "getEventDetails") {
      const eventId = searchParams.get("eventId")
      if (!eventId) {
        return NextResponse.json({ error: "eventId required", developer: DEV_TAG }, { status: 400 })
      }

      const eventDoc = await adminDb.collection("events").doc(eventId).get()
      if (!eventDoc.exists) {
        return NextResponse.json({ error: "Event not found", developer: DEV_TAG }, { status: 404 })
      }

      const d = eventDoc.data()!
      const attendeesSnap = await adminDb
        .collection("events")
        .doc(eventId)
        .collection("attendees")
        .get()

      return NextResponse.json({
        success: true,
        data: {
          id: eventId,
          eventName: d.eventName || "",
          eventDescription: d.eventDescription || "",
          eventImage: d.eventImage || "",
          eventImages: d.eventImages || [],
          eventDate: d.eventDate || "",
          eventEndDate: d.eventEndDate || "",
          eventStart: d.eventStart || "",
          eventEnd: d.eventEnd || "",
          eventVenue: d.eventVenue || "",
          venueCoordinates: d.venueCoordinates || null,
          eventType: d.eventType || "",
          isFree: d.isFree ?? false,
          ticketPrices: d.ticketPrices || [],
          ticketsSold: d.ticketsSold ?? attendeesSnap.size,
          revenue: d.revenue ?? 0,
          totalRevenue: d.totalRevenue ?? 0,
          paidAmount: d.paidAmount ?? 0,
          totalPaidOut: d.totalPaidOut ?? 0,
          likeCount: d.likeCount ?? 0,
          status: d.status || "active",
          flagged: d.flagged ?? false,
          suspended: d.suspended ?? false,
          organizerId: d.organizerId || "",
          affiliateId: d.affiliateId || null,
          affiliateName: d.affiliateName || null,
          allowAgents: d.allowAgents ?? false,
          enabledCollaboration: d.enabledCollaboration ?? false,
          hasStopDate: d.hasStopDate ?? false,
          stopDate: d.stopDate || null,
          createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
          attendeeCount: attendeesSnap.size,
        },
        developer: DEV_TAG,
      }, { status: 200 })
    }

    return NextResponse.json({ error: "Invalid action or missing parameters", developer: DEV_TAG }, { status: 400 })
  } catch (error) {
    console.error("GET /api/v1/event-data error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 },
    )
  }
}

/* ─────────────────────────────────────────────
   PATCH — flag | setStatus | suspend
   Body: { eventId, action, reason, ...payload }
───────────────────────────────────────────── */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      const response = adminResult.error as NextResponse
      const json = await response.json() as any
      return NextResponse.json({ error: json.error || "Forbidden: admin access required", developer: DEV_TAG }, { status: response.status })
    }
    const admin = adminResult

    const body = await request.json()
    const { eventId, action, reason } = body

    if (!eventId || !action) {
      return NextResponse.json({ error: "eventId and action are required", developer: DEV_TAG }, { status: 400 })
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: "A reason is required for all admin actions", developer: DEV_TAG }, { status: 400 })
    }

    const eventRef = adminDb.collection("events").doc(eventId)
    if (!(await eventRef.get()).exists) {
      return NextResponse.json({ error: "Event not found", developer: DEV_TAG }, { status: 404 })
    }

    const auditEntry = {
      adminUid: admin.uid,
      adminUsername: admin.username,
      reason,
      timestamp: new Date().toISOString(),
      action,
    }

    if (action === "flag") {
      const { flagged } = body
      if (typeof flagged !== "boolean") {
        return NextResponse.json({ error: "flagged (boolean) required", developer: DEV_TAG }, { status: 400 })
      }
      await eventRef.update({ flagged, updatedAt: new Date(), flagAudit: FieldValue.arrayUnion({ ...auditEntry, flagged }) })
      return NextResponse.json({ success: true, message: `Event ${flagged ? "flagged" : "unflagged"}`, developer: DEV_TAG }, { status: 200 })
    }

    if (action === "setStatus") {
      const { status } = body
      if (!["active", "inactive"].includes(status)) {
        return NextResponse.json({ error: "status must be 'active' or 'inactive'", developer: DEV_TAG }, { status: 400 })
      }
      await eventRef.update({ status, updatedAt: new Date(), statusAudit: FieldValue.arrayUnion({ ...auditEntry, status }) })
      return NextResponse.json({ success: true, message: `Event set to ${status}`, developer: DEV_TAG }, { status: 200 })
    }

    if (action === "suspend") {
      const { suspended } = body
      if (typeof suspended !== "boolean") {
        return NextResponse.json({ error: "suspended (boolean) required", developer: DEV_TAG }, { status: 400 })
      }
      await eventRef.update({ suspended, updatedAt: new Date(), suspendAudit: FieldValue.arrayUnion({ ...auditEntry, suspended }) })
      return NextResponse.json({ success: true, message: `Event ${suspended ? "suspended" : "unsuspended"}`, developer: DEV_TAG }, { status: 200 })
    }

    return NextResponse.json({ error: "Unknown action", developer: DEV_TAG }, { status: 400 })
  } catch (error) {
    console.error("PATCH /api/v1/event-data error:", error)
    return NextResponse.json({ error: "Internal Server Error", developer: DEV_TAG }, { status: 500 })
  }
}

/* ─────────────────────────────────────────────
   DELETE — soft-delete → deletedEvents/
   Body: { eventId, reason }
───────────────────────────────────────────── */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      const response = adminResult.error as NextResponse
      const json = await response.json() as any
      return NextResponse.json({ error: json.error || "Forbidden: admin access required", developer: DEV_TAG }, { status: response.status })
    }
    const admin = adminResult

    const body = await request.json()
    const { eventId, reason } = body

    if (!eventId) return NextResponse.json({ error: "eventId required", developer: DEV_TAG }, { status: 400 })
    if (!reason?.trim()) return NextResponse.json({ error: "A reason is required for deletion", developer: DEV_TAG }, { status: 400 })

    const eventRef = adminDb.collection("events").doc(eventId)
    const eventDoc = await eventRef.get()
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found", developer: DEV_TAG }, { status: 404 })
    }

    await adminDb.collection("deletedEvents").doc(eventId).set({
      ...eventDoc.data()!,
      deletedAt: new Date().toISOString(),
      deletedBy: { adminUid: admin.uid, adminUsername: admin.username },
      deletionReason: reason,
      originalEventId: eventId,
    })

    await eventRef.delete()

    return NextResponse.json({ success: true, message: "Event moved to deletedEvents", developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("DELETE /api/v1/event-data error:", error)
    return NextResponse.json({ error: "Internal Server Error", developer: DEV_TAG }, { status: 500 })
  }
}
