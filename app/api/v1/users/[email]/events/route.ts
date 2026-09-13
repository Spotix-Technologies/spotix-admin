// api/v1/users/[email]/events/route.ts
//
// GET ?userId=<uid> → { events: [{ eventId, eventName, eventImage, status }] }
//
// Lists events this user organizes (events/{id} where organizerId == uid),
// for the Users admin page's "Created Content" tab. Mirrors the summary
// shape used by event-data's listRecent/search actions, so the same
// EventSummary-style card can render either. Path keeps the [email]
// segment for route-family consistency with the other users/[email]/*
// routes, but the actual lookup is keyed off userId, same as
// payout-methods/route.ts.

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) return adminResult.error

    await params // consume params (unused — lookup is userId-scoped)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "userId query param is required", events: [] },
        { status: 400 }
      )
    }

    // Requires a Firestore composite index on (organizerId ASC, createdAt DESC)
    // on the events collection — Firestore will surface a console link to
    // create it the first time this query runs if it doesn't exist yet.
    const snapshot = await adminDb
      .collection("events")
      .where("organizerId", "==", userId)
      .orderBy("createdAt", "desc")
      .get()

    const events = snapshot.docs.map((doc) => {
      const d = doc.data()
      return {
        eventId: doc.id,
        eventName: d.eventName || "Untitled",
        eventImage: d.eventImage || "",
        status: d.status || "active",
      }
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error("[v0] User events error:", error)
    return NextResponse.json(
      { error: "Failed to fetch events", events: [] },
      { status: 500 }
    )
  }
}
