/**
 * app/lib/otta.ts
 *
 * OTTA = Overhead Timed Transfer Authorization.
 *
 * An admin can generate a short-lived, single-use key and hand it to
 * another admin, who can then enter it in place of that admin's own
 * manual approval — either on a Transfers approval (see
 * app/api/v1/admin/transfer/route.ts) or on a spotix-booker Vault
 * payout sign-off (see spotix-booker's app/lib/otta.ts + app/api/payout/vault
 * PATCH handler, which is a deliberate mirror of the verify/consume logic
 * here so both apps agree on the same Firestore collection).
 *
 * Storage: Firestore `ottaKeys/{keyId}`. The plain key is NEVER stored —
 * only a bcrypt hash of it, same one-way pattern spotix-booker already
 * uses for Vault Keys (see spotix-booker/app/api/payout/vault/route.ts).
 * Because bcrypt hashes aren't directly queryable, verification pulls the
 * small set of still-live candidate keys (not used, not revoked, not yet
 * expired) and bcrypt.compare()s each — fine in practice since a key only
 * lives for up to 120 minutes, so that candidate set is always small.
 *
 * Doc shape:
 *   keyHash          bcrypt hash of the 10-char alphanumeric key
 *   ownerUid          the admin who generated it
 *   ownerName         display name, snapshotted at creation
 *   maxAmount         highest amount (₦) this key can authorize
 *   durationMinutes   requested lifetime, 1–120
 *   createdAt         Firestore Timestamp
 *   expiresAt         Firestore Timestamp = createdAt + durationMinutes
 *   used              boolean
 *   usedAt            Firestore Timestamp | null
 *   usedForType       "transfer" | "vault" | null
 *   usedForId         transferId or vaultHold id | null
 *   revoked           boolean
 *   revokedAt         Firestore Timestamp | null
 */

import { adminDb } from "@/lib/firebase-admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import bcrypt from "bcryptjs"

const MAX_DURATION_MINUTES = 120
const KEY_LENGTH = 10
const KEY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

function randomOttaKey(): string {
  let out = ""
  for (let i = 0; i < KEY_LENGTH; i++) {
    out += KEY_ALPHABET[Math.floor(Math.random() * KEY_ALPHABET.length)]
  }
  return out
}

export interface OttaKeySummary {
  id: string
  maxAmount: number
  durationMinutes: number
  createdAt: string
  expiresAt: string
  used: boolean
  usedAt: string | null
  usedForType: "transfer" | "vault" | null
  revoked: boolean
  status: "active" | "used" | "expired" | "revoked"
}

function toIso(ts: any): string {
  if (!ts) return ""
  if (typeof ts === "string") return ts
  try { return ts.toDate().toISOString() } catch { return "" }
}

function computeStatus(d: any): OttaKeySummary["status"] {
  if (d.revoked) return "revoked"
  if (d.used) return "used"
  const expiresAt = d.expiresAt?.toDate?.() ?? new Date(d.expiresAt)
  if (expiresAt.getTime() < Date.now()) return "expired"
  return "active"
}

/** Generates and stores a new OTTA key. Returns the PLAIN key exactly once — it is never retrievable again. */
export async function generateOttaKey(params: {
  ownerUid: string
  ownerName: string
  maxAmount: number
  durationMinutes: number
}): Promise<{ id: string; plainKey: string; expiresAt: string }> {
  const durationMinutes = Math.min(MAX_DURATION_MINUTES, Math.max(1, Math.floor(params.durationMinutes)))
  const plainKey = randomOttaKey()
  const keyHash = await bcrypt.hash(plainKey, 10)

  const now = new Date()
  const expiresAt = new Date(now.getTime() + durationMinutes * 60_000)

  const docRef = await adminDb.collection("ottaKeys").add({
    keyHash,
    ownerUid: params.ownerUid,
    ownerName: params.ownerName,
    maxAmount: params.maxAmount,
    durationMinutes,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    used: false,
    usedAt: null,
    usedForType: null,
    usedForId: null,
    revoked: false,
    revokedAt: null,
  })

  return { id: docRef.id, plainKey, expiresAt: expiresAt.toISOString() }
}

export interface OttaVerifyResult {
  ok: boolean
  error?: string
  keyId?: string
  ownerUid?: string
  ownerName?: string
}

/**
 * Verifies a plain OTTA key against every still-live candidate, checks it
 * covers `amount`, and — if `consume` is true (the default) — atomically
 * marks it used so it can never be replayed. Pass consume=false only for
 * a dry-run check.
 */
export async function verifyOttaKey(
  plainKey: string,
  amount: number,
  usedFor: { type: "transfer" | "vault"; id: string },
  consume = true,
  enteredByUid?: string,
): Promise<OttaVerifyResult> {
  const trimmed = String(plainKey ?? "").trim().toUpperCase()
  if (!trimmed) return { ok: false, error: "OTTA key is required" }

  const now = Timestamp.now()
  const candidatesSnap = await adminDb
    .collection("ottaKeys")
    .where("used", "==", false)
    .where("revoked", "==", false)
    .get()

  for (const doc of candidatesSnap.docs) {
    const d = doc.data()
    const matches = await bcrypt.compare(trimmed, d.keyHash)
    if (!matches) continue

    // Found the key — every remaining check is now specific to THIS key,
    // so we return immediately rather than continuing to scan.
    if (enteredByUid && d.ownerUid === enteredByUid) {
      return { ok: false, error: "Nice try, you can't obviously use a key you generated genius" }
    }
    if (d.expiresAt && d.expiresAt.toMillis() < now.toMillis()) {
      return { ok: false, error: "This OTTA key has expired" }
    }
    if (typeof d.maxAmount === "number" && amount > d.maxAmount) {
      return { ok: false, error: "This OTTA key can't validate this amount" }
    }

    if (consume) {
      await doc.ref.update({
        used: true,
        usedAt: FieldValue.serverTimestamp(),
        usedForType: usedFor.type,
        usedForId: usedFor.id,
      })
    }

    return { ok: true, keyId: doc.id, ownerUid: d.ownerUid, ownerName: d.ownerName }
  }

  return { ok: false, error: "Invalid OTTA key" }
}

export async function listMyOttaKeys(ownerUid: string): Promise<OttaKeySummary[]> {
  const snap = await adminDb.collection("ottaKeys").where("ownerUid", "==", ownerUid).orderBy("createdAt", "desc").limit(50).get()
  return snap.docs.map((doc) => {
    const d = doc.data()
    return {
      id: doc.id,
      maxAmount: d.maxAmount ?? 0,
      durationMinutes: d.durationMinutes ?? 0,
      createdAt: toIso(d.createdAt),
      expiresAt: toIso(d.expiresAt),
      used: d.used === true,
      usedAt: d.usedAt ? toIso(d.usedAt) : null,
      usedForType: d.usedForType ?? null,
      revoked: d.revoked === true,
      status: computeStatus(d),
    }
  })
}

export async function revokeOttaKey(ownerUid: string, keyId: string): Promise<{ ok: boolean; error?: string }> {
  const ref = adminDb.collection("ottaKeys").doc(keyId)
  const snap = await ref.get()
  if (!snap.exists) return { ok: false, error: "OTTA key not found" }
  const d = snap.data()!
  if (d.ownerUid !== ownerUid) return { ok: false, error: "You can only revoke your own OTTA keys" }
  if (d.used) return { ok: false, error: "This key has already been used and can't be revoked" }
  if (d.revoked) return { ok: false, error: "This key is already revoked" }

  await ref.update({ revoked: true, revokedAt: FieldValue.serverTimestamp() })
  return { ok: true }
}
