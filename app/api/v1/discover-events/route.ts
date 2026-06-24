/**
 * POST /api/v1/discover-events
 * Creates a new event in discover/{state}/{autoId}
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV = "API developed and maintained by Spotix Technologies"

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request)
    if ("error" in admin) return admin.error

    const body = await request.json()
    const {
      eventName, description, host, state, location, genre,
      eventStart, eventEnd, ticketPolicy, ticketTiers,
      isSpotixEvent, spotixEventId, ticketLink, imageUrl,
    } = body

    if (!eventName || !state || !eventStart || !imageUrl) {
      return NextResponse.json({ error: "eventName, state, eventStart, and imageUrl are required", developer: DEV }, { status: 400 })
    }

    const now = new Date().toISOString()
    const docRef = adminDb.collection("discover").doc(state).collection("events").doc()

    await docRef.set({
      id: docRef.id,
      eventName,
      description: description || "",
      host: host || "",
      state,
      location: location || "",
      genre: genre || "",
      eventStart,
      eventEnd: eventEnd || null,
      ticketPolicy: ticketPolicy || "tbd",
      ticketTiers: ticketPolicy === "listed" ? (ticketTiers || []) : [],
      isSpotixEvent: !!isSpotixEvent,
      spotixEventId: isSpotixEvent ? (spotixEventId || null) : null,
      ticketLink: !isSpotixEvent ? (ticketLink || null) : null,
      imageUrl,
      postedBy: admin.username,
      postedByUid: admin.uid,
      createdAt: now,
      updatedAt: now,
      status: "active",
    })

    return NextResponse.json({ success: true, id: docRef.id, state, developer: DEV }, { status: 201 })
  } catch (error) {
    console.error("POST /api/v1/discover-events error:", error)
    return NextResponse.json({ error: "Internal Server Error", developer: DEV }, { status: 500 })
  }
}
