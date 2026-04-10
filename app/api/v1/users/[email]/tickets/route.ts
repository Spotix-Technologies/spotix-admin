// app/api/v1/users/[email]/tickets/route.ts

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
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      return adminResult.error
    }

    const { email } = await params
    const decodedEmail = decodeURIComponent(email)

    // Get user's tickets from tickets collection, ordered by purchaseDate descending, limit to 5
    const ticketsRef = adminDb.collection("tickets")
    const snapshot = await ticketsRef
      .where("email", "==", decodedEmail)
      .orderBy("purchaseDate", "desc")
      .limit(5)
      .get()

    const tickets: any[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      tickets.push({
        eventName: data.eventName || "",
        purchaseDate: data.purchaseDate || "",
        purchaseTime: data.purchaseTime || "",
        referralCode: data.referralCode || "",
        referralName: data.referralName || "",
        ticketId: data.ticketId || doc.id,
        ticketPrice: data.ticketPrice || 0,
        ticketReference: data.ticketReference || "",
        ticketType: data.ticketType || "",
        totalAmount: data.totalAmount || 0,
        // transactionFee: data.transactionFee || 0,
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
