import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export interface UserTicket {
  ticketId: string
  eventId: string
  eventName: string
  ticketTier: string
  price: number
  quantity: number
  purchasedAt: string
  status: "active" | "used" | "cancelled"
  qrCode?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      return adminResult.error
    }

    const { email } = await params
    const decodedEmail = decodeURIComponent(email)

    // Get user's tickets
    const ticketsRef = adminDb.collection("userTickets")
    const snapshot = await ticketsRef.where("userEmail", "==", decodedEmail).get()

    const tickets: UserTicket[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      tickets.push({
        ticketId: doc.id,
        eventId: data.eventId,
        eventName: data.eventName,
        ticketTier: data.ticketTier,
        price: data.price || 0,
        quantity: data.quantity || 1,
        purchasedAt: data.purchasedAt || "",
        status: data.status || "active",
        qrCode: data.qrCode,
      })
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error("[v0] User tickets error:", error)
    return NextResponse.json(
      { error: "Failed to fetch tickets", tickets: [] },
      { status: 500 }
    )
  }
}
