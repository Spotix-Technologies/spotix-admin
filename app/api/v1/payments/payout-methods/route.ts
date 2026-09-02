/**
 * app/api/v1/payments/payout-methods/route.ts
 *
 * Self-service bank details for the calling admin — the same
 * `payoutMethods/{uid}/methods` Firestore collection booker/attendee
 * payout methods already live in (see lib/payout-firestore-admin.ts's
 * getSinglePayoutMethod, which is what app/api/v1/payments/withdraw
 * reads from). Team members manage their OWN methods here; nobody else
 * (not even the admin who creates a disbursement) can set or see
 * another admin's bank details.
 *
 * GET              → list my methods
 * POST             → add a new one. Body: { accountNumber, bankCode, bankName, setPrimary? }
 *                    Account name is resolved + verified via Paystack
 *                    (through spotix-backend) before saving — never
 *                    trusts client-supplied account names.
 * PATCH            → set primary. Body: { methodId }
 * DELETE           → remove one. Body: { methodId }
 *
 * Access: any registered admin role.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { resolveAccount, PaystackError } from "@/lib/paystack-admin"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request)
  if ("error" in admin) return admin.error

  const snap = await adminDb.collection("payoutMethods").doc(admin.uid).collection("methods").orderBy("createdAt", "desc").get()
  const methods = snap.docs.map((d) => {
    const m = d.data()
    return {
      id: d.id,
      accountName: m.accountName ?? "",
      accountNumber: m.accountNumber ?? "",
      bankCode: m.bankCode ?? "",
      bankName: m.bankName ?? "",
      createdAt: m.createdAt?.toDate?.()?.toISOString?.() ?? m.createdAt ?? "",
      primary: m.primary === true,
    }
  })
  return ok({ methods })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdminAccess(request)
  if ("error" in admin) return admin.error

  let body: Record<string, any>
  try { body = await request.json() } catch { return fail("Invalid JSON", 400) }

  const accountNumber = String(body.accountNumber ?? "").trim()
  const bankCode = String(body.bankCode ?? "").trim()
  const bankName = String(body.bankName ?? "").trim()
  if (accountNumber.length !== 10) return fail("accountNumber must be 10 digits", 400)
  if (!bankCode) return fail("bankCode is required", 400)
  if (!bankName) return fail("bankName is required", 400)

  let accountName: string
  try {
    const resolved = await resolveAccount(accountNumber, bankCode)
    accountName = resolved.accountName
  } catch (err) {
    const message = err instanceof PaystackError ? err.message : "Could not verify this bank account"
    return fail(message, 400)
  }

  const methodsRef = adminDb.collection("payoutMethods").doc(admin.uid).collection("methods")
  const existing = await methodsRef.get()
  const makePrimary = existing.empty || body.setPrimary === true

  const newDoc = methodsRef.doc()
  const batch = adminDb.batch()
  if (makePrimary) {
    existing.forEach((d) => batch.update(d.ref, { primary: false }))
  }
  batch.set(newDoc, {
    accountName,
    accountNumber,
    bankCode,
    bankName,
    primary: makePrimary,
    createdAt: FieldValue.serverTimestamp(),
  })
  await batch.commit()

  return ok({ method: { id: newDoc.id, accountName, accountNumber, bankCode, bankName, primary: makePrimary } }, 201)
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdminAccess(request)
  if ("error" in admin) return admin.error

  let body: Record<string, any>
  try { body = await request.json() } catch { return fail("Invalid JSON", 400) }

  const { methodId } = body
  if (!methodId?.trim()) return fail("methodId is required", 400)

  const methodsRef = adminDb.collection("payoutMethods").doc(admin.uid).collection("methods")
  const target = await methodsRef.doc(methodId).get()
  if (!target.exists) return fail("Payout method not found", 404)

  const all = await methodsRef.get()
  const batch = adminDb.batch()
  all.forEach((d) => batch.update(d.ref, { primary: d.id === methodId }))
  await batch.commit()

  return ok({ success: true })
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdminAccess(request)
  if ("error" in admin) return admin.error

  let body: Record<string, any>
  try { body = await request.json() } catch { return fail("Invalid JSON", 400) }

  const { methodId } = body
  if (!methodId?.trim()) return fail("methodId is required", 400)

  const methodRef = adminDb.collection("payoutMethods").doc(admin.uid).collection("methods").doc(methodId)
  const target = await methodRef.get()
  if (!target.exists) return fail("Payout method not found", 404)

  await methodRef.delete()
  return ok({ success: true })
}
