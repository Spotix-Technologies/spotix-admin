/**
 * POST /api/v1/verification/[verificationId]/reject
 *   Body: { document: "nin" | "selfie" | "proofOfAddress", problem: string, suggestion?: string }
 *
 *   Rejects a single uploaded document on a verification request. The
 *   document's status is reset to "pending" (so it no longer counts toward
 *   readyToVerify) and a rejection reason is attached to it. The other two
 *   documents are untouched. The booker is emailed the problem + suggestion,
 *   and sees the same on their verification page.
 *
 * Access: role "admin", "customer-support", or "exec-assistant" only.
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { FieldValue } from "firebase-admin/firestore"

const DEV = "API developed and maintained by Spotix Technologies"

const DOCUMENT_KEYS = ["nin", "selfie", "proofOfAddress"] as const
type DocumentKey = (typeof DOCUMENT_KEYS)[number]

const DOCUMENT_LABELS: Record<DocumentKey, string> = {
  nin: "National ID (NIN)",
  selfie: "Selfie",
  proofOfAddress: "Proof of Address",
}

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV }, { status })
}

// Best-effort rejection email: the document has already been marked
// rejected by the time this is called, so a failure here must never
// surface as a failed rejection to the admin who just did it — same
// fire-and-forget philosophy as the verify route's approval email.
async function notifyBookerVerificationRejected(params: {
  email: string
  name: string
  document: DocumentKey
  problem: string
  suggestion: string
}) {
  try {
    const BACKEND_URL = process.env.BACKEND_URL
    if (!BACKEND_URL) {
      console.warn("[verification/reject] BACKEND_URL is not configured — rejection email not sent")
      return
    }
    const res = await fetch(`${BACKEND_URL}/v1/notify/booker-verification-rejected`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      console.warn("[verification/reject] rejection email failed:", await res.text().catch(() => ""))
    }
  } catch (err) {
    console.error("[verification/reject] rejection email error:", err)
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ verificationId: string }> }) {
  const admin = await verifyAdminAccess(request, ["admin", "customer-support", "exec-assistant"])
  if ("error" in admin) return admin.error

  const { verificationId } = await params

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return fail("Invalid JSON body", 400)
  }

  const document = body?.document as DocumentKey
  const problem = String(body?.problem ?? "").trim()
  const suggestion = String(body?.suggestion ?? "").trim()

  if (!DOCUMENT_KEYS.includes(document)) {
    return fail(`document must be one of: ${DOCUMENT_KEYS.join(", ")}`, 400)
  }
  if (!problem) return fail("problem is required", 400)

  const ref = adminDb.collection("verification").doc(verificationId)
  const snap = await ref.get()
  if (!snap.exists) return fail("Verification request not found", 404)

  const data = snap.data()!
  if (data.verificationState === "Verified") {
    return fail("This booker is already verified", 400)
  }
  if (data[document]?.status !== "completed") {
    return fail(`${DOCUMENT_LABELS[document]} has not been uploaded, so it can't be rejected`, 400)
  }
  if (!data.uid) return fail("This verification request is not linked to a user", 400)

  const rejection = {
    problem,
    suggestion: suggestion || "Please re-upload a clearer copy of this document.",
    rejectedAt: FieldValue.serverTimestamp(),
    rejectedBy: admin.username,
  }

  // Reset just this document back to "pending" (so it drops out of
  // readyToVerify until fixed) and attach the rejection reason. Sibling
  // documents and the top-level verificationState-adjacent fields are
  // untouched via dot-path updates.
  await ref.update({
    [`${document}.status`]: "pending",
    [`${document}.rejection`]: rejection,
    verificationState: "Not Verified",
  })

  const userSnap = await adminDb.collection("users").doc(data.uid).get()
  const userData = userSnap.data()

  if (userData?.email) {
    await notifyBookerVerificationRejected({
      email: userData.email,
      name: userData.fullName || userData.username || "there",
      document,
      problem,
      suggestion: rejection.suggestion,
    })
  }

  return ok({ message: `${DOCUMENT_LABELS[document]} rejected`, document })
}
