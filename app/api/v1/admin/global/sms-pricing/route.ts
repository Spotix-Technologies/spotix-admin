import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// admin/global/smsPricing/config — read by spotix-backend
// (v1/lib/sms/pricing.js) on every quote/purchase, so there's no cache to bust.
//
//   { basePrice: 4.5, moq: 50, tiers: [{ minQty: 200, price: 4 }, { minQty: 500, price: 3.8 }, ...] }
//
// Bulk SMS is billed per number sent. A tier means "an order of at least
// minQty credits is priced at `price` per SMS" (the whole order, not just the
// part above the threshold).
const CONFIG_REF = adminDb.collection("admin").doc("global").collection("smsPricing").doc("config")

export async function GET(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const snap = await CONFIG_REF.get()
  const data = snap.exists ? snap.data() || {} : {}
  return NextResponse.json({
    success: true,
    config: {
      basePrice: Number(data.basePrice) || 0,
      moq: Number(data.moq) || 1,
      tiers: Array.isArray(data.tiers) ? data.tiers : [],
    },
  })
}

export async function PUT(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const body = await request.json().catch(() => ({}))
  const basePrice = Number(body?.basePrice)
  const moq = Math.floor(Number(body?.moq))
  const rawTiers: any[] = Array.isArray(body?.tiers) ? body.tiers : []

  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return NextResponse.json({ success: false, error: "Base price must be greater than 0" }, { status: 400 })
  }
  if (!Number.isFinite(moq) || moq < 1) {
    return NextResponse.json({ success: false, error: "MOQ must be a whole number of at least 1" }, { status: 400 })
  }

  const tiers = rawTiers.map((t) => ({ minQty: Math.floor(Number(t?.minQty)), price: Number(t?.price) }))
  for (const t of tiers) {
    if (!Number.isFinite(t.minQty) || t.minQty < 1 || !Number.isFinite(t.price) || t.price <= 0) {
      return NextResponse.json({ success: false, error: "Every threshold needs a quantity ≥ 1 and a price > 0" }, { status: 400 })
    }
  }
  tiers.sort((a, b) => a.minQty - b.minQty)

  for (let i = 0; i < tiers.length; i++) {
    if (i > 0 && tiers[i].minQty === tiers[i - 1].minQty) {
      return NextResponse.json({ success: false, error: `Two thresholds share the quantity ${tiers[i].minQty}` }, { status: 400 })
    }
    if (tiers[i].minQty <= moq) {
      return NextResponse.json({ success: false, error: `Thresholds must be above the MOQ (${moq}) — orders below it can't be placed` }, { status: 400 })
    }
    if (tiers[i].price >= basePrice) {
      return NextResponse.json({ success: false, error: "A threshold price must be lower than the base price" }, { status: 400 })
    }
    if (i > 0 && tiers[i].price >= tiers[i - 1].price) {
      return NextResponse.json({ success: false, error: "Prices must keep dropping as quantities go up" }, { status: 400 })
    }
  }

  await CONFIG_REF.set({ basePrice, moq, tiers, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminResult.username || adminResult.uid }, { merge: false })
  return NextResponse.json({ success: true, config: { basePrice, moq, tiers } })
}
