import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface EventDataResponse {
  id: string
  eventName: string
  eventImage: string
  ticketsSold: number
  totalRevenue: number
  ticketPrices: Array<{ policy: string; price: number }>
  flagged?: boolean
}

interface UserEventSummary {
  eventId: string
  eventName: string
  ticketsSold: number
  totalRevenue: number
}

// GET all user IDs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const userId = searchParams.get("userId")
    const eventId = searchParams.get("eventId")

    // Action 1: Get all events for a specific user
    if (action === "getUserEvents" && userId) {
      const userEventsRef = adminDb.collection("events").doc(userId).collection("userEvents")
      const eventsSnapshot = await userEventsRef.get()

      const events: UserEventSummary[] = []

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data()
        
        // Get attendees count
        const attendeesSnapshot = await adminDb
          .collection("events")
          .doc(userId)
          .collection("userEvents")
          .doc(eventDoc.id)
          .collection("attendees")
          .get()

        const ticketsSold = attendeesSnapshot.size

        // Use totalRevenue from event document if available, otherwise calculate
        let totalRevenue = eventData.totalRevenue || 0

        events.push({
          eventId: eventDoc.id,
          eventName: eventData.eventName || "Untitled Event",
          ticketsSold,
          totalRevenue,
        })
      }

      return NextResponse.json(
        {
          success: true,
          data: events,
          developer: "API developed and maintained by Spotix Technologies",
        },
        { status: 200 },
      )
    }

    // Action 2: Get specific event details
    if (action === "getEventDetails" && userId && eventId) {
      const eventRef = adminDb.collection("events").doc(userId).collection("userEvents").doc(eventId)
      const eventDoc = await eventRef.get()

      if (!eventDoc.exists) {
        return NextResponse.json(
          {
            error: "Event not found",
            developer: "API developed and maintained by Spotix Technologies",
          },
          { status: 404 },
        )
      }

      const eventData = eventDoc.data()

      // Get attendees
      const attendeesRef = adminDb
        .collection("events")
        .doc(userId)
        .collection("userEvents")
        .doc(eventId)
        .collection("attendees")
      const attendeesSnapshot = await attendeesRef.get()
      const ticketsSold = attendeesSnapshot.size

      // Use totalRevenue from event document if available
      const totalRevenue = eventData?.totalRevenue || 0

      const responseData: EventDataResponse = {
        id: eventId,
        eventName: eventData?.eventName || "",
        eventImage: eventData?.eventImage || "",
        ticketsSold: ticketsSold,
        totalRevenue: totalRevenue,
        ticketPrices: eventData?.ticketPrices || [],
        flagged: eventData?.flagged || false,
      }

      return NextResponse.json(
        {
          success: true,
          data: responseData,
          developer: "API developed and maintained by Spotix Technologies",
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        error: "Invalid action or missing parameters",
        developer: "API developed and maintained by Spotix Technologies",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("Error fetching data:", error)

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to fetch data",
        details: error instanceof Error ? error.message : "Unknown error",
        developer: "API developed and maintained by Spotix Technologies",
      },
      { status: 500 },
    )
  }
}

// POST to update event flagged status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, eventId, flagged } = body

    if (!userId || !eventId || typeof flagged !== "boolean") {
      return NextResponse.json(
        {
          error: "Missing or invalid userId/eventId/flagged parameters",
          developer: "API developed and maintained by Spotix Technologies",
        },
        { status: 400 },
      )
    }

    const eventRef = adminDb.collection("events").doc(userId).collection("userEvents").doc(eventId)
    await eventRef.update({
      flagged: flagged,
      updatedAt: new Date(),
    })

    return NextResponse.json(
      {
        success: true,
        message: `Event ${flagged ? "flagged" : "unflagged"} successfully`,
        developer: "API developed and maintained by Spotix Technologies",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error updating event flagged status:", error)

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to update event data",
        details: error instanceof Error ? error.message : "Unknown error",
        developer: "API developed and maintained by Spotix Technologies",
      },
      { status: 500 },
    )
  }
}