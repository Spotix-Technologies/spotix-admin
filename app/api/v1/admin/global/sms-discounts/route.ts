import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// admin/global/smsDiscounts/{id} — { code, percent, active, expiresAt? }
// A discount takes a percentage off the SMS CREDIT price only. VAT (the
// Paystack fee) is never discounted — see spotix-backend v1/lib/sms/pricing.js.
const DISCOUNTS_REF = adminDb.collection("admin").doc("global").collection("smsDiscounts")

function toIso(v: any): string | null {
  if (!v) return null
  if (typeof v?.toDate === "function") return v.toDate().toISOString()
  return typeof v === "string" ? v : null
}

export async function GET(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const snap = await DISCOUNTS_REF.get()
  const discounts = snap.docs
    .map((d) => {
      const x = d.data()
      return { id: d.id, code: x.code, percent: x.percent, active: x.active !== false, expiresAt: toIso(x.expiresAt) }
    })
    .sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)))
  return NextResponse.json({ success: true, discounts })
}

export async function POST(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const body = await request.json().catch(() => ({}))
  const code = String(body?.code ?? "").trim().toUpperCase()
  const percent = Number(body?.percent)
  const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : null

  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
    return NextResponse.json({ success: false, error: "Code must be 3–24 letters, numbers, - or _" }, { status: 400 })
  }
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return NextResponse.json({ success: false, error: "Percentage must be between 0 and 100" }, { status: 400 })
  }
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ success: false, error: "Invalid expiry date" }, { status: 400 })
  }

  // Codes are looked up by value, so they must be unique.
  const existing = await DISCOUNTS_REF.where("code", "==", code).limit(1).get()
  if (!existing.empty) {
    return NextResponse.json({ success: false, error: "That code already exists" }, { status: 409 })
  }

  const ref = await DISCOUNTS_REF.add({
    code,
    percent,
    active: true,
    ...(expiresAt ? { expiresAt } : {}),
    createdAt: FieldValue.serverTimestamp(),
    createdBy: adminResult.username || adminResult.uid,
  })
  return NextResponse.json({ success: true, id: ref.id })
}

export async function PATCH(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const body = await request.json().catch(() => ({}))
  const { id, active } = body || {}
  if (!id || typeof active !== "boolean") {
    return NextResponse.json({ success: false, error: "id and active are required" }, { status: 400 })
  }
  await DISCOUNTS_REF.doc(id).set({ active, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 })
  await DISCOUNTS_REF.doc(id).delete()
  return NextResponse.json({ success: true })
}
