/**
 * app/api/v1/event-data/vault-status/route.ts
 *
 * GET ?eventId=xxx → { holds: VaultHoldSummary[] }
 *
 * Reads the SAME `vaultHolds` Firestore collection spotix-booker writes to
 * (see spotix-booker/app/lib/payout-firestore.ts) so an admin can see
 * whether a booker event's Vault-gated payouts have been signed off by
 * every participant, without needing booker access.
 *
 * Access: admin only. This is a read-only view of Vault sign-off status —
 * signing off itself can only be done from the booker app by an actual
 * Vault participant with their Vault Key, and isn't replicated here.
 */

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  const eventId = new URL(request.url).searchParams.get("eventId")?.trim()
  if (!eventId) return fail("eventId is required", 400)

  const snap = await adminDb
    .collection("vaultHolds")
    .where("eventId", "==", eventId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get()

  const holds = snap.docs.map((d) => {
    const h = d.data()
    const participants: string[] = h.vaultParticipants ?? []
    const submissions: Record<string, boolean> = h.vaultSubmissions ?? {}
    const submissionLog: Record<string, string> = h.vaultSubmissionLog ?? {}
    return {
      id: d.id,
      date: h.date,
      amount: h.amount,
      status: h.status,
      initiatedByName: h.initiatedByName ?? "Unknown",
      initiatedByEmail: h.initiatedByEmail ?? "",
      signOffs: participants.map((uid) => ({
        uid,
        signed: submissions[uid] === true,
        signedAt: submissionLog[uid] ?? null,
      })),
      signedCount: participants.filter((uid) => submissions[uid] === true).length,
      totalParticipants: participants.length,
      releasedReference: h.releasedReference ?? null,
    }
  })

  return ok({ holds })
}
