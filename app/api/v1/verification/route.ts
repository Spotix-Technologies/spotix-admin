/**
 * GET /api/v1/verification
 *   Lists the first 10 verification requests (ordered by document ID) with
 *   the linked user's basic profile info, for admin review.
 *
 * GET /api/v1/verification?verificationId=xxx
 *   Looks up a single verification request by ID, for admins who already
 *   have a specific verification ID to review.
 *
 * Access: role "admin", "customer-support", or "exec-assistant" only.
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

async function buildVerificationEntry(doc: QueryDocumentSnapshot | DocumentSnapshot) {
  const data = doc.data()!
  let user: Record<string, unknown> | null = null
  if (data.uid) {
    const userSnap = await adminDb.collection("users").doc(data.uid).get()
    if (userSnap.exists) {
      const u = userSnap.data()!
      user = {
        username: u.username || "",
        fullName: u.fullName || "",
        email: u.email || "",
        phoneNumber: u.phoneNumber || "",
        dateOfBirth: u.dateOfBirth || "",
        bvt: u.bvt || null,
        isVerified: u.isVerified || false,
      }
    }
  }

  const docsComplete =
    data.nin?.status === "completed" &&
    data.selfie?.status === "completed" &&
    data.proofOfAddress?.status === "completed"

  return {
    verificationId: doc.id,
    ...data,
    readyToVerify: !!docsComplete && !!(data.address ?? "").trim() && data.verificationState !== "Verified",
    user,
  }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin", "customer-support", "exec-assistant"])
  if ("error" in admin) return admin.error

  const { searchParams } = new URL(request.url)
  const verificationId = searchParams.get("verificationId")?.trim()

  // Single lookup by ID
  if (verificationId) {
    const snap = await adminDb.collection("verification").doc(verificationId).get()
    if (!snap.exists) return fail("No verification request found with that ID", 404)
    return ok({ result: await buildVerificationEntry(snap) })
  }

  const snap = await adminDb.collection("verification").orderBy("__name__").limit(10).get()
  const requests = await Promise.all(snap.docs.map((d) => buildVerificationEntry(d)))

  return ok({ requests })
}
