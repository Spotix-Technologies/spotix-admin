import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"
const DELETE_ELIGIBILITY_MS = 24 * 60 * 60 * 1000 // 24 hours

/* ─────────────────────────────────────────────
   GET ?reference=SPTX-REF-...
   Looks up a single payment reference and returns
   its payment details, event details, and any
   tickets that have been generated from it.
───────────────────────────────────────────── */
export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) return adminResult.error

    const { searchParams } = new URL(request.url)
    const reference = searchParams.get("reference")?.trim()

    if (!reference) {
      return NextResponse.json({ error: "reference is required", developer: DEV_TAG }, { status: 400 })
    }

    const refDoc = await adminDb.collection("Reference").doc(reference).get()
    if (!refDoc.exists) {
      return NextResponse.json({ error: "Reference not found", developer: DEV_TAG }, { status: 404 })
    }

    const d = refDoc.data()!

    // Resolve generated tickets, if any
    let tickets: Array<{
      ticketId: string
      ticketType: string
      ticketPrice: number
      fullName: string
      email: string
      phoneNumber: string
      verified: boolean
      purchaseDate: string
      purchaseTime: string
    }> = []

    if (d.ticketGenerated) {
      const ticketsSnap = await adminDb
        .collection("tickets")
        .where("ticketReference", "==", reference)
        .get()

      tickets = ticketsSnap.docs.map((t) => {
        const td = t.data()
        return {
          ticketId: td.ticketId || t.id,
          ticketType: td.ticketType || "",
          ticketPrice: td.ticketPrice ?? 0,
          fullName: td.fullName || "",
          email: td.email || "",
          phoneNumber: td.phoneNumber || "",
          verified: td.verified ?? false,
          purchaseDate: td.purchaseDate || "",
          purchaseTime: td.purchaseTime || "",
        }
      })
    }

    // Deletion eligibility — only pending refs, 24h after creation, with no tickets generated
    const createdAtMs = d.createdAt ? new Date(d.createdAt).getTime() : null
    const deletionEligibleAt = createdAtMs ? new Date(createdAtMs + DELETE_ELIGIBILITY_MS).toISOString() : null
    const isPastEligibility = createdAtMs ? Date.now() - createdAtMs >= DELETE_ELIGIBILITY_MS : false
    const deletionEligible = d.status === "pending" && !d.ticketGenerated && isPastEligibility

    return NextResponse.json({
      success: true,
      data: {
        reference: d.reference || refDoc.id,
        status: d.status || "pending",
        vendor: d.vendor || "paystack",
        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
        paymentCreationDate: d.paymentCreationDate || null,
        deletionEligible,
        deletionEligibleAt,

        // Buyer
        userId: d.userId || null,
        userEmail: d.userEmail || null,
        userFullName: d.userFullName || null,
        userPhone: d.userPhone || null,
        isGuest: !d.userId || d.userId === d.userEmail,

        // Event organizer / host
        bookerName: d.bookerName || null,
        bookerEmail: d.bookerEmail || null,

        // Event paid for
        eventId: d.eventId || null,
        eventCreatorId: d.eventCreatorId || null,
        eventName: d.eventName || "",
        eventVenue: d.eventVenue || "",
        eventType: d.eventType || "",
        eventDate: d.eventDate || "",
        eventEndDate: d.eventEndDate || "",
        eventStart: d.eventStart || "",
        eventEnd: d.eventEnd || "",
        stopDate: d.stopDate || null,

        // Payment breakdown
        ticketTypes: d.ticketTypes || [],
        ticketType: d.ticketType || "",
        ticketPrice: d.ticketPrice ?? 0,
        transactionFee: d.transactionFee ?? 0,
        totalAmount: d.totalAmount ?? 0,
        totalTicketCount: d.totalTicketCount ?? 0,

        // Discount / referral
        discountCode: d.discountCode || null,
        discountData: d.discountData || null,
        referralCode: d.referralCode || null,
        referralName: d.referralName || null,

        // Ticket generation
        ticketGenerated: d.ticketGenerated ?? false,
        ticketGeneratedAt: d.ticketGeneratedAt || null,
        totalTicketsGenerated: d.totalTicketsGenerated ?? 0,
        tickets,
      },
      developer: DEV_TAG,
    }, { status: 200 })
  } catch (error) {
    console.error("GET /api/v1/references error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 },
    )
  }
}

/* ─────────────────────────────────────────────
   DELETE
   Body: { reference, reason }
   Only allowed when status === "pending", no tickets
   have been generated against it, and at least 24
   hours have passed since its createdAt timestamp.
───────────────────────────────────────────── */
export async function DELETE(request: NextRequest) {
  try {
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) return adminResult.error
    const admin = adminResult

    const body = await request.json()
    const { reference, reason } = body

    if (!reference) {
      return NextResponse.json({ error: "reference is required", developer: DEV_TAG }, { status: 400 })
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: "A reason is required to delete a reference", developer: DEV_TAG }, { status: 400 })
    }

    const refDocRef = adminDb.collection("Reference").doc(reference)
    const refDoc = await refDocRef.get()
    if (!refDoc.exists) {
      return NextResponse.json({ error: "Reference not found", developer: DEV_TAG }, { status: 404 })
    }

    const d = refDoc.data()!

    if (d.status === "successful") {
      return NextResponse.json({ error: "Paid references cannot be deleted", developer: DEV_TAG }, { status: 403 })
    }
    if (d.status !== "pending") {
      return NextResponse.json({ error: "Only pending references can be deleted", developer: DEV_TAG }, { status: 403 })
    }
    if (d.ticketGenerated) {
      return NextResponse.json({ error: "Tickets have already been generated for this reference", developer: DEV_TAG }, { status: 403 })
    }

    const createdAtMs = d.createdAt ? new Date(d.createdAt).getTime() : null
    const isPastEligibility = createdAtMs ? Date.now() - createdAtMs >= DELETE_ELIGIBILITY_MS : false
    if (!isPastEligibility) {
      return NextResponse.json(
        { error: "This reference is not yet eligible for deletion. Pending references can only be deleted 24 hours after creation.", developer: DEV_TAG },
        { status: 403 },
      )
    }

    // Preserve an audit trail before removing the live document
    await adminDb.collection("deletedReferences").doc(reference).set({
      ...d,
      deletedAt: new Date().toISOString(),
      deletedBy: { adminUid: admin.uid, adminUsername: admin.username },
      deletionReason: reason,
      originalReference: reference,
    })

    await refDocRef.delete()

    return NextResponse.json({ success: true, message: "Reference deleted", developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("DELETE /api/v1/references error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 },
    )
  }
}
