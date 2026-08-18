/**
 * app/api/v1/admin-polls/admin-payout/route.ts
 * POST { pollId, date }
 *
 * Poll equivalent of event-data/admin-payout/route.ts — see that file
 * for the full rationale (amount re-derived server-side, "admin"-role
 * restriction, idempotency, no Paystack call). Polls have no Vault
 * feature, so there's no override step here.
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyFullAdmin } from "@/lib/verify-admin"
import { createAdminInitiatedPayout, hasActiveOrSuccessfulPayout } from "@/lib/payout-admin-db"
import { writePayoutReferenceOnDateDoc, getSinglePayoutMethod, applySuccessfulPayoutAnalytics } from "@/lib/payout-firestore-admin"
import { claimIdempotencyKey, DuplicateRequestError } from "@/lib/payout-idempotency"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
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

    let body: { pollId?: string; date?: string }
    try { body = await request.json() } catch { return fail("Invalid JSON", 400) }
    const { pollId, date } = body
    if (!pollId?.trim()) return fail("pollId is required", 400)
    if (!date?.trim()) return fail("date is required", 400)

    const pollSnap = await adminDb.collection("voting").doc(pollId).get()
    if (!pollSnap.exists) return fail("Poll not found", 404)
    const poll = pollSnap.data()!
    const ownerId = poll.creatorId ?? poll.organizerId
    if (!ownerId) return fail("Poll has no creator on file", 404)

    const dateDocRef = adminDb.collection("admin").doc("votes").collection(pollId).doc(date)
    const dateDoc = await dateDocRef.get()
    if (!dateDoc.exists) return fail("Transaction date record not found", 404)
    const amount = dateDoc.data()?.voteSales
    if (typeof amount !== "number" || amount <= 0) return fail("This date has no positive voteSales to pay out", 400)

    const alreadyActive = await hasActiveOrSuccessfulPayout({ pollId }, date)
    if (alreadyActive) return fail("A payout for this date already exists (active or successful).", 409)

    const { usable: method, methods } = await getSinglePayoutMethod(ownerId)
    if (!method) {
      return fail(
        methods.length === 0
          ? "This poll creator has no payout method on file. Admins cannot create one — they must add it themselves."
          : `This poll creator has ${methods.length} payout methods on file. Admin-initiated payout is only available when exactly one method exists.`,
        400
      )
    }

    let row
    try {
      row = await createAdminInitiatedPayout({
        isEvent: false,
        isPoll: true,
        pollId,
        pollName: poll.pollName ?? "",
        payDate: date,
        beneficiaryUserId: ownerId,
        amount,
        method: {
          methodId: method.id,
          bankName: method.bankName,
          bankCode: method.bankCode,
          accountNumber: method.accountNumber,
          accountName: method.accountName,
          recipientCode: method.recipientCode,
        },
        vaultLocked: false,
        adminUid: admin.uid,
        adminName: admin.username,
      })
    } catch (err: any) {
      if (err instanceof DuplicateRequestError) return fail(err.message, 409)
      throw err
    }

    await writePayoutReferenceOnDateDoc({ pollId }, date, row.reference)
    await applySuccessfulPayoutAnalytics(row)

    return ok({ message: "Payout recorded successfully", reference: row.reference })
  } catch (error) {
    console.error("POST /api/v1/admin-polls/admin-payout error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 }
    )
  }
}
