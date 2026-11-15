/**
 * /api/v1/affiliates   (full admins only)
 *
 * GET ?after=<ms>&q=      → { settings?, affiliates[], nextCursor }  25/page, newest first.
 *                             q = exact email or affiliate code (no scans)
 * GET ?code=SPX123          → { affiliate, events[], withdrawals[] }   (detail)
 * PATCH { action: "updateSettings", ratePerTicket, referralBonus }
 * PATCH { action: "togglePayoutsGlobal", enabled }
 * PATCH { action: "toggleAffiliatePayouts", code, disabled }
 *
 * Firestore:
 *   admin/affiliateSettings        { ratePerTicket, referralBonus, payoutsEnabled }
 *   Affiliates/{code}              public card (name, eventCount)
 *   affiliateProfiles/{code}       private profile + onboarding answers (Firestore)
 *   affiliate_withdrawals / affiliate_wallet_credits   money ledger (Supabase)
 */
import { type NextRequest, NextResponse } from "next/server"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"
const json = (body: object, status = 200) => NextResponse.json({ ...body, developer: DEV_TAG }, { status })

const iso = (v: any): string | null => (v?.toDate ? v.toDate().toISOString() : typeof v === "string" ? v : null)

async function guard(request: NextRequest) {
  const result = await verifyAdminAccess(request, ["admin"])
  if ("error" in result) {
    const res = result.error as NextResponse
    const body = (await res.json()) as any
    return { error: json({ error: body.error || "Forbidden" }, res.status) }
  }
  return { admin: result }
}

async function getSettings() {
  const d = (await adminDb.collection("admin").doc("affiliateSettings").get()).data() ?? {}
  return {
    ratePerTicket: Number(d.ratePerTicket) || 0,
    referralBonus: Number(d.referralBonus) || 0,
    payoutsEnabled: d.payoutsEnabled !== false,
  }
}

export async function GET(request: NextRequest) {
  try {
    const g = await guard(request)
    if ("error" in g) return g.error

    const code = new URL(request.url).searchParams.get("code")?.trim()

    if (code) {
      const [priv, pub] = await Promise.all([
        adminDb.collection("affiliateProfiles").doc(code).get(),
        adminDb.collection("Affiliates").doc(code).get(),
      ])
      if (!priv.exists) return json({ error: "Affiliate not found" }, 404)
      const p = priv.data()!

      // Money lives in Supabase (affiliate_withdrawals / affiliate_wallet_credits)
      const [wRes, cRes] = await Promise.all([
        supabaseAdmin.from("affiliate_withdrawals").select("*").eq("affiliate_code", code).order("created_at", { ascending: false }).limit(100),
        supabaseAdmin.from("affiliate_wallet_credits").select("amount").eq("affiliate_code", code),
      ])
      if (wRes.error) throw wRes.error
      if (cRes.error) throw cRes.error
      const ledger = wRes.data ?? []
      const live = new Map<string, string>()
      for (const w of ledger) if (w.kind === "event" && w.status !== "failed") live.set(w.event_id, w.status)

      const links = await adminDb.collection("Affiliates").doc(code).collection("affiliatedEvents").get()
      const events = await Promise.all(
        links.docs.map(async (l) => {
          const ev = await adminDb.collection("events").doc(l.id).get()
          const e = ev.data() ?? {}
          const rate = Number(e.affiliateRate ?? l.data().rate ?? 0)
          return {
            eventId: l.id,
            eventName: e.eventName ?? l.data().eventName ?? "Untitled",
            eventEndDate: e.eventEndDate ?? e.eventDate ?? null,
            ticketsSold: Number(e.ticketsSold) || 0,
            rate,
            earned: (Number(e.ticketsSold) || 0) * rate,
            payoutStatus: live.get(l.id) ?? null,
          }
        })
      )

      const withdrawals = ledger.map((w: any) => ({
        reference: w.reference, amount: Number(w.amount) || 0, kind: w.kind, status: w.status,
        createdAt: w.created_at, resolvedAt: w.resolved_at, bankName: w.bank_name, accountNumber: w.account_number,
      }))
      const referralEarned = (cRes.data ?? []).reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0)
      const referralSpent = ledger.filter((w: any) => w.kind === "referral" && w.status !== "failed").reduce((sum: number, w: any) => sum + (Number(w.amount) || 0), 0)
      const totalWithdrawn = ledger.filter((w: any) => w.status === "successful").reduce((sum: number, w: any) => sum + (Number(w.amount) || 0), 0)

      return json({
        success: true,
        affiliate: {
          code,
          name: pub.data()?.name ?? p.name ?? "",
          email: p.email ?? "",
          uid: p.uid ?? "",
          createdAt: iso(p.createdAt),
          onboardingCompleted: p.onboardingCompleted === true,
          onboarding: p.onboarding ?? null,
          referredByCode: p.referredByCode ?? null,
          referralCount: Number(p.referralCount) || 0,
          referralBalance: Math.max(0, referralEarned - referralSpent),
          referralEarned,
          totalWithdrawn,
          payoutsDisabled: p.payoutsDisabled === true,
          eventCount: Number(pub.data()?.eventCount) || 0,
        },
        events,
        withdrawals,
      })
    }

    // ── List / search ────────────────────────────────────────────────────────
    // Cheap by design: one read per row (name lives on the private profile),
    // 25 per page, and search is an exact Firestore lookup — never a scan.
    const sp = new URL(request.url).searchParams
    const q = sp.get("q")?.trim() ?? ""
    const after = Number(sp.get("after")) || 0
    const PAGE = 25

    const toRow = (id: string, p: FirebaseFirestore.DocumentData) => ({
      code: id,
      name: p.name ?? "",
      email: p.email ?? "",
      createdAt: iso(p.createdAt),
      onboardingCompleted: p.onboardingCompleted === true,
      referralCount: Number(p.referralCount) || 0,
      payoutsDisabled: p.payoutsDisabled === true,
      state: p.onboarding?.state ?? null,
    })

    const settings = after || q ? undefined : await getSettings()

    if (q) {
      let docs: FirebaseFirestore.DocumentSnapshot[] = []
      if (q.includes("@")) {
        docs = (await adminDb.collection("affiliateProfiles").where("email", "==", q.toLowerCase()).limit(5).get()).docs
      } else {
        const one = await adminDb.collection("affiliateProfiles").doc(q.toUpperCase()).get()
        docs = one.exists ? [one] : []
      }
      return json({ success: true, affiliates: docs.map((d) => toRow(d.id, d.data()!)), nextCursor: null, ...(settings ? { settings } : {}) })
    }

    let query: FirebaseFirestore.Query = adminDb.collection("affiliateProfiles").orderBy("createdAt", "desc")
    if (after) query = query.startAfter(Timestamp.fromMillis(after))
    const snap = await query.limit(PAGE + 1).get()
    const page = snap.docs.slice(0, PAGE)
    const hasMore = snap.docs.length > PAGE
    const last = page[page.length - 1]?.data().createdAt as FirebaseFirestore.Timestamp | undefined
    return json({
      success: true,
      affiliates: page.map((d) => toRow(d.id, d.data())),
      nextCursor: hasMore && last ? last.toMillis() : null,
      ...(settings ? { settings } : {}),
    })
  } catch (err) {
    console.error("[GET /api/v1/affiliates]", err)
    return json({ error: "Failed to load affiliates" }, 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const g = await guard(request)
    if ("error" in g) return g.error
    const { admin } = g

    const body = await request.json()
    const settingsRef = adminDb.collection("admin").doc("affiliateSettings")
    const audit = { by: admin.username, byUid: admin.uid, at: new Date().toISOString() }

    if (body.action === "updateSettings") {
      const rate = Number(body.ratePerTicket)
      const bonus = Number(body.referralBonus)
      if (!Number.isFinite(rate) || rate < 0 || rate > 100000) return json({ error: "ratePerTicket must be a valid amount" }, 400)
      if (!Number.isFinite(bonus) || bonus < 0 || bonus > 1000000) return json({ error: "referralBonus must be a valid amount" }, 400)
      await settingsRef.set({ ratePerTicket: rate, referralBonus: bonus, updatedAt: FieldValue.serverTimestamp(), updatedBy: audit.by }, { merge: true })
      await settingsRef.collection("history").add({ type: "settings", ratePerTicket: rate, referralBonus: bonus, ...audit })
      return json({ success: true, settings: await getSettings() })
    }

    if (body.action === "togglePayoutsGlobal") {
      if (typeof body.enabled !== "boolean") return json({ error: "enabled (boolean) required" }, 400)
      await settingsRef.set({ payoutsEnabled: body.enabled, updatedAt: FieldValue.serverTimestamp(), updatedBy: audit.by }, { merge: true })
      await settingsRef.collection("history").add({ type: "payoutsGlobal", enabled: body.enabled, ...audit })
      return json({ success: true, settings: await getSettings() })
    }

    if (body.action === "toggleAffiliatePayouts") {
      const code = String(body.code || "").trim()
      if (!code || typeof body.disabled !== "boolean") return json({ error: "code and disabled (boolean) required" }, 400)
      const ref = adminDb.collection("affiliateProfiles").doc(code)
      if (!(await ref.get()).exists) return json({ error: "Affiliate not found" }, 404)
      await ref.update({ payoutsDisabled: body.disabled, payoutsDisabledAt: FieldValue.serverTimestamp(), payoutsDisabledBy: audit.by })
      return json({ success: true })
    }

    return json({ error: `Unknown action: ${body.action}` }, 400)
  } catch (err) {
    console.error("[PATCH /api/v1/affiliates]", err)
    return json({ error: "Failed to update" }, 500)
  }
}
