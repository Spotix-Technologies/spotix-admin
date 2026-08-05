/**
 * POST /api/v1/agent-verification/[userId]/reject
 *   Body: { reason?: string }
 * Access: role "admin" or "customer-support" only.
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await verifyAdminAccess(request, ["admin", "customer-support"])
  if ("error" in admin) return admin.error

  const { userId } = await params
  const ref = adminDb.collection("agentsVerification").doc(userId)
  const snap = await ref.get()
  if (!snap.exists) return fail("Agent verification request not found", 404)
  if (snap.data()!.status === "verified") return fail("This agent is already verified", 400)

  let reason = ""
  try {
    const body = await request.json()
    reason = body?.reason || ""
  } catch {
    // no body — that's fine, reason is optional
  }

  await ref.update({
    status: "rejected",
    rejectionReason: reason || "Documents could not be verified",
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: admin.username,
  })

  await adminDb.collection("users").doc(userId).update({ verificationStatus: "rejected" })

  return ok({ message: "Agent verification rejected" })
}
