/**
 * GET /api/v1/agent-verification
 *   Lists the first 10 pending agent verification requests, oldest first,
 *   for admin review.
 *
 * GET /api/v1/agent-verification?email=xxx
 *   Searches agentsVerification by the agent's email — per instruction 4,
 *   search is by email, not by verification/user ID.
 *
 * Access: role "admin" or "customer-support" only.
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import type { QueryDocumentSnapshot, DocumentSnapshot } from "firebase-admin/firestore"

const DEV = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV }, { status })
}

function toEntry(doc: QueryDocumentSnapshot | DocumentSnapshot) {
  const d = doc.data()!
  return {
    userId: doc.id,
    fullName: d.fullName || "",
    email: d.email || "",
    phone: d.phone || null,
    selfieUrl: d.selfieUrl || null,
    proofOfAddressUrl: d.proofOfAddressUrl || null,
    documentType: d.documentType || "",
    documentNumber: d.documentNumber || "",
    documentImageUrl: d.documentImageUrl || null,
    status: d.status || "pending",
    submittedAt: d.submittedAt?.toDate?.()?.toISOString() ?? null,
    rejectionReason: d.rejectionReason || null,
  }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin", "customer-support"])
  if ("error" in admin) return admin.error

  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")?.trim().toLowerCase()

  if (email) {
    const snap = await adminDb.collection("agentsVerification").where("email", "==", email).limit(5).get()
    if (snap.empty) return fail("No agent verification request found with that email", 404)
    return ok({ requests: snap.docs.map(toEntry) })
  }

  const snap = await adminDb
    .collection("agentsVerification")
    .where("status", "==", "pending")
    .orderBy("submittedAt", "asc")
    .limit(10)
    .get()

  return ok({ requests: snap.docs.map(toEntry) })
}
