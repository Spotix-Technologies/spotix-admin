/**
 * app/api/v1/event-data/attendees/route.ts
 *
 * GET /api/v1/event-data/attendees?eventId=xxx
 *   → Returns full attendee list for an event (id, fullName, email,
 *     ticketType, verified, purchaseDate, ticketReference, faceEmbedding)
 *
 * Access: admin + exec-assistant
 */

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status })
}
function fail(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status })
}

function tsToDateString(ts: FirebaseFirestore.Timestamp | string | null | undefined): string {
  if (!ts) return "Unknown"
  if (typeof ts === "string") return ts
  try { return ts.toDate().toLocaleDateString() } catch { return "Unknown" }
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAccess(req, ["admin", "exec-assistant"])
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get("eventId")?.trim()
  if (!eventId) return fail("eventId is required", 400)

  const eventRef = adminDb.collection("events").doc(eventId)
  const eventSnap = await eventRef.get()
  if (!eventSnap.exists) return fail("Event not found", 404)

  const attendeesSnap = await eventRef.collection("attendees").get()

  const attendees = attendeesSnap.docs.map((d) => {
    const a = d.data()
    return {
      id: d.id,
      fullName: a.fullName ?? "Unknown",
      email: a.email ?? "no-email@example.com",
      ticketType: a.ticketType ?? "Standard",
      verified: a.verified ?? false,
      purchaseDate: tsToDateString(a.purchaseDate),
      ticketReference: a.ticketReference ?? "Unknown",
      facialEnroll: a.faceEmbedding ? "enrolled" : "unenrolled",
      faceEmbedding: a.faceEmbedding ?? null,
    }
  })

  return ok({ attendees, eventName: eventSnap.data()?.eventName ?? "" })
}
