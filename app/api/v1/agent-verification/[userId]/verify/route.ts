/**
 * POST /api/v1/agent-verification/[userId]/verify
 *   Approves an agent verification request. Generates an Agent ID in the
 *   form AG-{4 random digits}-{2 random letters}, retrying on the rare
 *   collision, then:
 *     - creates agents/{agentId} with the agent's bio data
 *     - updates users/{uid} with agentId + verificationStatus: "verified"
 *       (the agent app's JWT refresh picks this up within one access-token
 *       lifetime — see spotix-agent's auth/refresh/route.ts)
 *     - updates agentsVerification/{userId} to status: "verified"
 *
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

function generateAgentId(): string {
  const digits = "0123456789"
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ" // no ambiguous chars
  let num = ""
  for (let i = 0; i < 4; i++) num += digits[Math.floor(Math.random() * digits.length)]
  let letterPart = ""
  for (let i = 0; i < 2; i++) letterPart += letters[Math.floor(Math.random() * letters.length)]
  return `AG-${num}-${letterPart}`
}

async function generateUniqueAgentId(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateAgentId()
    const existing = await adminDb.collection("agents").doc(candidate).get()
    if (!existing.exists) return candidate
  }
  throw new Error("Could not generate a unique Agent ID after several attempts")
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await verifyAdminAccess(request, ["admin", "customer-support"])
  if ("error" in admin) return admin.error

  const { userId } = await params
  const ref = adminDb.collection("agentsVerification").doc(userId)
  const snap = await ref.get()
  if (!snap.exists) return fail("Agent verification request not found", 404)

  const data = snap.data()!
  if (data.status === "verified") return fail("This agent is already verified", 400)

  const requiredDocs = ["selfieUrl", "proofOfAddressUrl", "documentImageUrl", "documentType", "documentNumber"]
  const missing = requiredDocs.filter((k) => !data[k])
  if (missing.length > 0) {
    return fail(`Missing required verification data: ${missing.join(", ")}`, 400)
  }

  let agentId: string
  try {
    agentId = await generateUniqueAgentId()
  } catch (e: any) {
    return fail(e.message || "Failed to generate Agent ID", 500)
  }

  const batch = adminDb.batch()

  batch.set(adminDb.collection("agents").doc(agentId), {
    agentId,
    userId,
    fullName: data.fullName || "",
    email: data.email || "",
    phone: data.phone || null,
    selfieUrl: data.selfieUrl,
    documentType: data.documentType,
    documentNumber: data.documentNumber,
    documentImageUrl: data.documentImageUrl,
    verifiedAt: FieldValue.serverTimestamp(),
    verifiedBy: admin.username,
    verifiedByUid: admin.uid,
  })

  batch.update(adminDb.collection("users").doc(userId), {
    agentId,
    verificationStatus: "verified",
  })

  batch.update(ref, {
    status: "verified",
    agentId,
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: admin.username,
    rejectionReason: null,
  })

  await batch.commit()

  return ok({ message: "Agent verified successfully", agentId })
}
