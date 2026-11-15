import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { cacheDel, activePackagesCacheKey } from "@/lib/redis-admin"

// The backend (v1/lib/campaigns/packages.js) caches getActivePackages()
// for up to an hour (spec: hourly cache, single-flight refresh). Bust it
// immediately on any admin write here — same convention as
// invalidateCategoryTreeCacheAfterAdminEdit() — so a price/active change
// shows up right away instead of waiting out the TTL.
async function bustActivePackagesCache() {
  await cacheDel(activePackagesCacheKey())
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// admin/global/emailCreditPackages/{packageId} — same subcollection
// pattern as restrictedDate/restrictedDays in app/api/v1/admin/global
// (spec §11). v1/lib/campaigns/packages.js on the backend reads this
// same collection for the booker-facing checkout.
const PACKAGES_REF = adminDb.collection("admin").doc("global").collection("emailCreditPackages")

export async function GET(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const snap = await PACKAGES_REF.get()
  const packages = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => (a.credit_amount || 0) - (b.credit_amount || 0))
  return NextResponse.json({ success: true, packages })
}

export async function POST(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const body = await request.json().catch(() => ({}))
  const { credit_amount, price, active } = body || {}
  if (!credit_amount || !price) {
    return NextResponse.json({ success: false, error: "credit_amount and price are required" }, { status: 400 })
  }

  const docRef = await PACKAGES_REF.add({
    credit_amount,
    price,
    active: active !== false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await bustActivePackagesCache()
  return NextResponse.json({ success: true, id: docRef.id })
}

export async function PATCH(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const body = await request.json().catch(() => ({}))
  const { id, ...patch } = body || {}
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 })

  await PACKAGES_REF.doc(id).set({ ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  await bustActivePackagesCache()
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 })

  await PACKAGES_REF.doc(id).delete()
  await bustActivePackagesCache()
  return NextResponse.json({ success: true })
}
