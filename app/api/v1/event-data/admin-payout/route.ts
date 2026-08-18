/**
 * app/api/v1/event-data/admin-payout/route.ts
 * POST { eventId, date, confirmVaultOverride? }
 *
 * Records a payout an admin has already settled with the booker outside
 * Paystack (or is forcing through despite a stuck/unavailable Vault).
 * The row is created ALREADY "successful" — no Paystack call happens
 * here at all. Every other operation the normal payout backend endpoint
 * would perform on a successful resolution (analytics increments,
 * Firestore reference stamping, idempotency, the one-active-payout-per-
 * date guarantee) still happens, just synchronously and immediately.
 *
 * Restricted to the full "admin" role — not customer-support or
 * exec-assistant. This moves money-equivalent records and can override
 * a Vault; that's a materially different trust level than the
 * flag/suspend/delete moderation actions other admin roles already do
 * on this data. (Flag to product if you want this opened up further.)
 *
 * Amount is NEVER trusted from the client — it's re-derived server-side
 * from the date doc's own ticketSales, exactly like every other figure
 * on this record. There is no Paystack call here to naturally catch a
 * tampered amount the way there would be on the booker path, so this
 * matters more here, not less.
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyFullAdmin } from "@/lib/verify-admin"
import { createAdminInitiatedPayout, hasActiveOrSuccessfulPayout } from "@/lib/payout-admin-db"
import { writePayoutReferenceOnDateDoc, getSinglePayoutMethod, getVaultStatus, supersedeOpenVaultHold, applySuccessfulPayoutAnalytics } from "@/lib/payout-firestore-admin"
import { claimIdempotencyKey, DuplicateRequestError } from "@/lib/payout-idempotency"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number, extra?: object) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG, ...extra }, { status })
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyFullAdmin(request)
    if ("error" in admin) return admin.error

    const idempotencyKey = request.headers.get("idempotency-key")
    if (!idempotencyKey?.trim()) return fail("Idempotency-Key header is required", 400)
    try {
      await claimIdempotencyKey(idempotencyKey, admin.uid)
    } catch (err) {
      if (err instanceof DuplicateRequestError) return fail(err.message, 409)
      return fail("Could not verify request uniqueness. Please try again.", 500)
    }

    let body: { eventId?: string; date?: string; confirmVaultOverride?: boolean }
    try { body = await request.json() } catch { return fail("Invalid JSON", 400) }
    const { eventId, date, confirmVaultOverride } = body
    if (!eventId?.trim()) return fail("eventId is required", 400)
    if (!date?.trim()) return fail("date is required", 400)

    const eventSnap = await adminDb.collection("events").doc(eventId).get()
    if (!eventSnap.exists) return fail("Event not found", 404)
    const event = eventSnap.data()!
    const organizerId = event.organizerId
    if (!organizerId) return fail("Event has no organizer on file", 404)

    const dateDocRef = adminDb.collection("admin").doc("events").collection(eventId).doc(date)
    const dateDoc = await dateDocRef.get()
    if (!dateDoc.exists) return fail("Transaction date record not found", 404)
    const amount = dateDoc.data()?.ticketSales
    if (typeof amount !== "number" || amount <= 0) return fail("This date has no positive ticketSales to pay out", 400)

    const alreadyActive = await hasActiveOrSuccessfulPayout({ eventId }, date)
    if (alreadyActive) return fail("A payout for this date already exists (active or successful).", 409)

    const { usable: method, methods } = await getSinglePayoutMethod(organizerId)
    if (!method) {
      return fail(
        methods.length === 0
          ? "This booker has no payout method on file. Admins cannot create one — they must add it themselves."
          : `This booker has ${methods.length} payout methods on file. Admin-initiated payout is only available when exactly one method exists — ask the booker to remove the extras, or use their own dashboard to choose.`,
        400
      )
    }

    const vault = await getVaultStatus(eventId)
    if (vault.enabled && !confirmVaultOverride) {
      return fail("This event has an active Vault. Paying out now bypasses Vault sign-off entirely.", 409, {
        vaultEnabled: true,
        requiresConfirmation: true,
      })
    }

    let row
    try {
      row = await createAdminInitiatedPayout({
        isEvent: true,
        isPoll: false,
        eventId,
        eventName: event.eventName ?? "",
        payDate: date,
        beneficiaryUserId: organizerId,
        amount,
        method: {
          methodId: method.id,
          bankName: method.bankName,
          bankCode: method.bankCode,
          accountNumber: method.accountNumber,
          accountName: method.accountName,
          recipientCode: method.recipientCode,
        },
        vaultLocked: vault.enabled,
        adminUid: admin.uid,
        adminName: admin.username,
      })
    } catch (err: any) {
      if (err instanceof DuplicateRequestError) return fail(err.message, 409)
      throw err
    }

    await writePayoutReferenceOnDateDoc({ eventId }, date, row.reference)
    if (vault.enabled) await supersedeOpenVaultHold(eventId, date, row.reference, admin.username)
    await applySuccessfulPayoutAnalytics(row)

    return ok({ message: "Payout recorded successfully", reference: row.reference })
  } catch (error) {
    console.error("POST /api/v1/event-data/admin-payout error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 }
    )
  }
}
