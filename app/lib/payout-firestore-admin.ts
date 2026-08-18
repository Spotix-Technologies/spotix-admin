/**
 * lib/payout-firestore-admin.ts
 *
 * Firestore-side responsibilities for the admin payout feature. Mirrors
 * conventions already established in spotix-booker's
 * app/lib/payout-firestore.ts and spotix-backend's v1/payout.js — kept
 * consistent so the same date doc / analytics shape works regardless of
 * which app touched it.
 */

import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import type { PayoutRow } from "@/lib/payout-admin-db"

// ── Transaction listing (mirrors booker's GET ?action=list) ────────────────

export async function listEventTransactions(eventId: string) {
  const snap = await adminDb.collection("admin").doc("events").collection(eventId).get()
  return snap.docs.map((doc) => ({ date: doc.id, ...doc.data() })).sort((a: any, b: any) => a.date.localeCompare(b.date))
}

export async function listPollTransactions(pollId: string) {
  const snap = await adminDb.collection("admin").doc("votes").collection(pollId).get()
  return snap.docs.map((doc) => ({ date: doc.id, ...doc.data() })).sort((a: any, b: any) => a.date.localeCompare(b.date))
}

// ── Date-doc reference stamping ─────────────────────────────────────────────

export async function writePayoutReferenceOnDateDoc(scope: { eventId?: string; pollId?: string }, date: string, reference: string) {
  const root = scope.eventId ? "events" : "votes"
  const id = scope.eventId ?? scope.pollId!
  const ref = adminDb.collection("admin").doc(root).collection(id).doc(date)
  try {
    await ref.update({ payoutReference: reference, payoutReferenceAt: FieldValue.serverTimestamp() })
  } catch (err) {
    console.warn(`[payout-firestore-admin] Failed to stamp reference on ${root}/${id}/${date}:`, err)
  }
}

/** Revert: clears the reference so the Transactions view stops pointing at a deleted row. */
export async function clearPayoutReferenceOnDateDoc(scope: { eventId?: string; pollId?: string }, date: string) {
  const root = scope.eventId ? "events" : "votes"
  const id = scope.eventId ?? scope.pollId!
  const ref = adminDb.collection("admin").doc(root).collection(id).doc(date)
  try {
    await ref.update({ payoutReference: FieldValue.delete(), payoutReferenceAt: FieldValue.delete() })
  } catch (err) {
    console.warn(`[payout-firestore-admin] Failed to clear reference on ${root}/${id}/${date}:`, err)
  }
}

// ── Payout method lookup ────────────────────────────────────────────────────

export interface PayoutMethodSummary {
  id: string
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  recipientCode: string | null
  primary: boolean
}

/**
 * Admins can never SET a payout method — only look one up, and only act
 * on it when the booker has EXACTLY one on file. Returns every method
 * found (so the UI can explain "this booker has 3 methods, pick one in
 * their own dashboard instead" rather than just failing silently) plus
 * `usable`, which is the single method when count === 1.
 */
export async function getSinglePayoutMethod(ownerUid: string): Promise<{ methods: PayoutMethodSummary[]; usable: PayoutMethodSummary | null }> {
  const snap = await adminDb.collection("payoutMethods").doc(ownerUid).collection("methods").get()
  const methods: PayoutMethodSummary[] = snap.docs.map((d) => {
    const m = d.data()
    return {
      id: d.id,
      bankName: m.bankName ?? "",
      bankCode: m.bankCode ?? "",
      accountNumber: m.accountNumber ?? "",
      accountName: m.accountName ?? "",
      recipientCode: m.recipientCode ?? null,
      primary: m.primary === true,
    }
  })
  return { methods, usable: methods.length === 1 ? methods[0] : null }
}

// ── Vault check ──────────────────────────────────────────────────────────

export async function getVaultStatus(eventId: string): Promise<{ enabled: boolean }> {
  const snap = await adminDb.collection("vaults").doc(eventId).get()
  return { enabled: snap.exists && snap.data()?.enabledVault === true }
}

/**
 * Best-effort: if an admin pays out a date that has an unresolved Vault
 * hold sitting on it, that hold is now moot (the money already moved via
 * the admin path) — mark it cancelled with a note, rather than leaving
 * it to confuse Vault participants or fail later when they try to
 * release it into an already-occupied date.
 */
export async function supersedeOpenVaultHold(eventId: string, date: string, reference: string, adminName: string) {
  try {
    const snap = await adminDb
      .collection("vaultHolds")
      .where("eventId", "==", eventId)
      .where("date", "==", date)
      .where("status", "==", "vault_pending")
      .limit(1)
      .get()
    if (snap.empty) return
    const doc = snap.docs[0]
    await doc.ref.update({
      status: "cancelled",
      cancelledAt: FieldValue.serverTimestamp(),
      cancelledByName: `${adminName} (Admin)`,
      logs: FieldValue.arrayUnion({
        type: "superseded",
        at: new Date().toISOString(),
        message: `Superseded by an admin-initiated payout (ref ${reference}) — this Vault hold no longer applies.`,
      }),
    })
  } catch (err) {
    console.warn(`[payout-firestore-admin] Failed to supersede vault hold for ${eventId}/${date}:`, err)
  }
}

// ── Analytics apply / reverse ───────────────────────────────────────────────
// Mirrors spotix-backend/v1/payout.js's webhook analytics exactly, since
// an admin-initiated row is born "successful" and no webhook will ever
// fire for it — this IS the only place those increments happen for that
// row. revertPayoutAnalytics is the exact inverse, used only when
// reverting a row that had reached "successful".

function getWATDateParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" })
  const parts = formatter.formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  const year = get("year")
  const month = `${year}-${get("month")}`
  const day = `${month}-${get("day")}`
  return { year, month, day }
}

export async function applySuccessfulPayoutAnalytics(row: PayoutRow) {
  const { year, month, day } = getWATDateParts()
  const payload = { payout: FieldValue.increment(row.amount), payoutCount: FieldValue.increment(1), lastUpdated: FieldValue.serverTimestamp() }

  const batch = adminDb.batch()
  const base = adminDb.collection("admin").doc("analytics")
  batch.set(base.collection("daily").doc(day), payload, { merge: true })
  batch.set(base.collection("monthly").doc(month), payload, { merge: true })
  batch.set(base.collection("yearly").doc(year), payload, { merge: true })
  batch.update(adminDb.collection("users").doc(row.user_id), { totalPaidOut: FieldValue.increment(row.amount) })

  if (row.is_poll && row.poll_id) {
    batch.update(adminDb.collection("voting").doc(row.poll_id), { totalPaidOut: FieldValue.increment(row.amount) })
  } else if (row.is_event && row.event_id) {
    batch.update(adminDb.collection("events").doc(row.event_id), { totalPaidOut: FieldValue.increment(row.amount) })
  }

  await batch.commit()
}

/** Exact inverse of applySuccessfulPayoutAnalytics — used when reverting a "successful" row. */
export async function reverseSuccessfulPayoutAnalytics(row: PayoutRow) {
  const { year, month, day } = getWATDateParts()
  const payload = { payout: FieldValue.increment(-row.amount), payoutCount: FieldValue.increment(-1), lastUpdated: FieldValue.serverTimestamp() }

  const batch = adminDb.batch()
  const base = adminDb.collection("admin").doc("analytics")
  batch.set(base.collection("daily").doc(day), payload, { merge: true })
  batch.set(base.collection("monthly").doc(month), payload, { merge: true })
  batch.set(base.collection("yearly").doc(year), payload, { merge: true })
  batch.update(adminDb.collection("users").doc(row.user_id), { totalPaidOut: FieldValue.increment(-row.amount) })

  if (row.is_poll && row.poll_id) {
    batch.update(adminDb.collection("voting").doc(row.poll_id), { totalPaidOut: FieldValue.increment(-row.amount) })
  } else if (row.is_event && row.event_id) {
    batch.update(adminDb.collection("events").doc(row.event_id), { totalPaidOut: FieldValue.increment(-row.amount) })
  }

  await batch.commit()
}
