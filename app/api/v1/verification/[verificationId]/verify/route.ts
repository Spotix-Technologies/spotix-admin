/**
 * POST /api/v1/verification/[verificationId]/verify
 *   Issues a Booker Verification Tag (BVT) for the given verification
 *   request and stores it on users/{uid}. Only allowed once all required
 *   fields (NIN, selfie, proof of address, address) are present.
 *
 * Access: role "admin", "customer-support", or "exec-assistant" only.
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { FieldValue } from "firebase-admin/firestore"

const DEV = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV }, { status })
}

function generateBVT(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no ambiguous chars
  let code = ""
  for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `BVT-${code.slice(0, 5)}-${code.slice(5)}`
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ verificationId: string }> }) {
  const admin = await verifyAdminAccess(request, ["admin", "customer-support", "exec-assistant"])
  if ("error" in admin) return admin.error

  const { verificationId } = await params
  const ref = adminDb.collection("verification").doc(verificationId)
  const snap = await ref.get()
  if (!snap.exists) return fail("Verification request not found", 404)

  const data = snap.data()!
  const docsComplete =
    data.nin?.status === "completed" &&
    data.selfie?.status === "completed" &&
    data.proofOfAddress?.status === "completed"

  if (!docsComplete || !(data.address ?? "").trim()) {
    return fail("All fields (NIN, selfie, proof of address, and home address) must be uploaded before verifying", 400)
  }

  if (data.verificationState === "Verified") {
    return fail("This booker is already verified", 400)
  }

  if (!data.uid) return fail("This verification request is not linked to a user", 400)

  const bvt = generateBVT()

  await adminDb.collection("users").doc(data.uid).update({
    bvt,
    isVerified: true,
    verifiedAt: FieldValue.serverTimestamp(),
    verifiedBy: admin.username,
  })

  await ref.update({
    verificationState: "Verified",
    verifiedAt: FieldValue.serverTimestamp(),
    verifiedBy: admin.username,
    verifiedByUid: admin.uid,
    bvt,
  })

  return ok({ message: "Booker verified successfully", bvt })
}
