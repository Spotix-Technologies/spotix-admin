"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Handshake, Search, Loader2, X, Power, Save, Users, CalendarDays,
  Wallet, CheckCircle2, AlertCircle, ShieldOff, ShieldCheck, RefreshCw,
} from "lucide-react"

interface Settings { ratePerTicket: number; referralBonus: number; payoutsEnabled: boolean }
interface Row {
  code: string; name: string; email: string; createdAt: string | null
  onboardingCompleted: boolean; referralCount: number
  payoutsDisabled: boolean; state: string | null
}
interface Detail {
  affiliate: Row & {
    uid: string; eventCount: number; totalWithdrawn: number; referredByCode: string | null; referralBalance: number; referralEarned: number
    onboarding: { heardFrom?: string; heardFromOther?: string; isStudent?: boolean; state?: string } | null
  }
  events: { eventId: string; eventName: string; eventEndDate: string | null; ticketsSold: number; rate: number; earned: number; payoutStatus: string | null }[]
  withdrawals: { reference: string; amount: number; kind: string; status: string; createdAt: string | null; bankName?: string; accountNumber?: string }[]
}

const naira = (n: number) => `₦${(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—")

export function AffiliatesClient() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [activeQuery, setActiveQuery] = useState("")
  const [cursor, setCursor] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [rate, setRate] = useState("")
  const [bonus, setBonus] = useState("")
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [openCode, setOpenCode] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [toggling, setToggling] = useState(false)

  const flash = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async (q = "") => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/affiliates${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      if (j.settings) {
        setSettings(j.settings)
        setRate(String(j.settings.ratePerTicket))
        setBonus(String(j.settings.referralBonus))
      }
      setRows(j.affiliates)
      setCursor(j.nextCursor)
      setActiveQuery(q)
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to load", false)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = async () => {
    if (!cursor) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/v1/affiliates?after=${cursor}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setRows((r) => [...r, ...j.affiliates])
      setCursor(j.nextCursor)
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to load more", false)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!openCode) { setDetail(null); return }
    setDetailLoading(true)
    fetch(`/api/v1/affiliates?code=${encodeURIComponent(openCode)}`)
      .then((r) => r.json())
      .then((j) => setDetail(j.affiliate ? j : null))
      .finally(() => setDetailLoading(false))
  }, [openCode])

  const patch = async (payload: object) => {
    const res = await fetch("/api/v1/affiliates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const j = await res.json()
    if (!res.ok) throw new Error(j.error || "Failed")
    return j
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const j = await patch({ action: "updateSettings", ratePerTicket: Number(rate), referralBonus: Number(bonus) })
      setSettings(j.settings)
      flash("Saved. The new per-ticket amount applies to events linked from now on")
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false) }
    finally { setSaving(false) }
  }

  const toggleGlobal = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const j = await patch({ action: "togglePayoutsGlobal", enabled: !settings.payoutsEnabled })
      setSettings(j.settings)
      flash(j.settings.payoutsEnabled ? "Affiliate payouts enabled for everyone" : "Affiliate payouts disabled for everyone")
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false) }
    finally { setSaving(false) }
  }

  const toggleOne = async () => {
    if (!detail) return
    setToggling(true)
    try {
      const disabled = !detail.affiliate.payoutsDisabled
      await patch({ action: "toggleAffiliatePayouts", code: detail.affiliate.code, disabled })
      setDetail({ ...detail, affiliate: { ...detail.affiliate, payoutsDisabled: disabled } })
      setRows((r) => r.map((x) => (x.code === detail.affiliate.code ? { ...x, payoutsDisabled: disabled } : x)))
      flash(disabled ? "Payouts disabled for this affiliate" : "Payouts enabled for this affiliate")
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false) }
    finally { setToggling(false) }
  }

  const filtered = rows

  const dirty = settings && (Number(rate) !== settings.ratePerTicket || Number(bonus) !== settings.referralBonus)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6b2fa5]/10 flex items-center justify-center">
            <Handshake className="w-5 h-5 text-[#6b2fa5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Affiliates</h1>
            <p className="text-sm text-slate-500">Pay rates, payouts and everyone in the programme</p>
          </div>
        </div>
        <button onClick={() => load(activeQuery)} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Settings */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Earnings settings</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-600">Flat amount per ticket sold (₦)</span>
              <input type="number" min={0} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]" />
              <span className="text-[11px] text-slate-400">Locked onto an event when its affiliate is linked. Changing it only affects events linked afterwards.</span>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-600">Referral bonus (₦)</span>
              <input type="number" min={0} inputMode="decimal" value={bonus} onChange={(e) => setBonus(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]" />
              <span className="text-[11px] text-slate-400">Paid into the referrer&apos;s wallet when the person they referred finishes onboarding.</span>
            </label>
          </div>
          <button onClick={saveSettings} disabled={!dirty || saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6b2fa5] hover:bg-[#5a2589] text-white text-sm font-medium disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-slate-800">Payouts</h2>
          <p className="text-sm text-slate-500">
            {settings?.payoutsEnabled ? "Affiliates can withdraw when eligible." : "All affiliate withdrawals are paused."}
          </p>
          <button onClick={toggleGlobal} disabled={!settings || saving}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 ${settings?.payoutsEnabled ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
            <Power className="w-4 h-4" /> {settings?.payoutsEnabled ? "Disable for all" : "Enable for all"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <form
          onSubmit={(e) => { e.preventDefault(); load(query.trim()) }}
          className="p-4 border-b border-slate-100 flex items-center gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by exact email or affiliate code"
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]" />
          </div>
          <button type="submit" disabled={loading || !query.trim()} className="px-4 py-2.5 rounded-lg bg-[#6b2fa5] hover:bg-[#5a2589] text-white text-sm font-medium disabled:opacity-40">Search</button>
          {activeQuery && (
            <button type="button" onClick={() => { setQuery(""); load("") }} className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Clear</button>
          )}
        </form>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">{activeQuery ? "No affiliate matches that email or code" : "No affiliates yet"}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <li key={r.code}>
                <button onClick={() => setOpenCode(r.code)} className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50">
                  <div className="w-9 h-9 rounded-full bg-[#6b2fa5]/10 text-[#6b2fa5] font-semibold text-sm flex items-center justify-center shrink-0">
                    {(r.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.name || "Unnamed"}</p>
                    <p className="text-xs text-slate-400 truncate">{r.email} · <span className="font-mono">{r.code}</span></p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                    <span>{r.state ?? "—"}</span>
                    <span>{r.referralCount} referral{r.referralCount === 1 ? "" : "s"}</span>
                  </div>
                  {r.payoutsDisabled && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Payouts off</span>}
                  {!r.onboardingCompleted && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Onboarding</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {cursor && !loading && (
          <div className="p-4 border-t border-slate-100 text-center">
            <button onClick={loadMore} disabled={loadingMore} className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>

      {/* Drawer */}
      {openCode && (
        <div className="fixed inset-0 z-[9999] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpenCode(null)} />
          <aside className="relative w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
              <h3 className="font-semibold text-slate-800">Affiliate details</h3>
              <button onClick={() => setOpenCode(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {detailLoading || !detail ? (
              <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : (
              <div className="p-5 space-y-6">
                <div>
                  <p className="text-lg font-bold text-slate-900">{detail.affiliate.name}</p>
                  <p className="text-sm text-slate-500">{detail.affiliate.email}</p>
                  <p className="text-xs font-mono text-[#6b2fa5] mt-1">{detail.affiliate.code}</p>
                  <p className="text-xs text-slate-400 mt-1">Joined {date(detail.affiliate.createdAt)}{detail.affiliate.referredByCode ? ` · referred by ${detail.affiliate.referredByCode}` : ""}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: CalendarDays, label: "Events", value: String(detail.affiliate.eventCount) },
                    { icon: Users, label: "Referrals", value: String(detail.affiliate.referralCount) },
                    { icon: Wallet, label: "Referral wallet", value: naira(detail.affiliate.referralBalance) },
                    { icon: CheckCircle2, label: "Withdrawn", value: naira(detail.affiliate.totalWithdrawn) },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-200 p-3">
                      <s.icon className="w-4 h-4 text-slate-400 mb-1" />
                      <p className="text-sm font-bold text-slate-800">{s.value}</p>
                      <p className="text-[11px] text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                <button onClick={toggleOne} disabled={toggling}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${detail.affiliate.payoutsDisabled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                  {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : detail.affiliate.payoutsDisabled ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                  {detail.affiliate.payoutsDisabled ? "Enable payouts for this affiliate" : "Disable payouts for this affiliate"}
                </button>

                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Onboarding answers</h4>
                  {detail.affiliate.onboarding ? (
                    <dl className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-sm">
                      <div className="flex justify-between gap-3 px-3 py-2"><dt className="text-slate-500">Heard about us</dt><dd className="text-slate-800 text-right">{detail.affiliate.onboarding.heardFrom}{detail.affiliate.onboarding.heardFromOther ? ` — ${detail.affiliate.onboarding.heardFromOther}` : ""}</dd></div>
                      <div className="flex justify-between gap-3 px-3 py-2"><dt className="text-slate-500">Student</dt><dd className="text-slate-800">{detail.affiliate.onboarding.isStudent ? "Yes" : "No"}</dd></div>
                      <div className="flex justify-between gap-3 px-3 py-2"><dt className="text-slate-500">State</dt><dd className="text-slate-800">{detail.affiliate.onboarding.state}</dd></div>
                    </dl>
                  ) : (
                    <p className="text-sm text-slate-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Hasn&apos;t completed onboarding yet</p>
                  )}
                </section>

                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Affiliated events</h4>
                  {detail.events.length === 0 ? <p className="text-sm text-slate-400">None yet</p> : (
                    <ul className="space-y-2">
                      {detail.events.map((e) => (
                        <li key={e.eventId} className="rounded-xl border border-slate-200 p-3">
                          <p className="text-sm font-medium text-slate-800 truncate">{e.eventName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{e.ticketsSold} tickets × {naira(e.rate)} = <span className="font-semibold text-slate-700">{naira(e.earned)}</span></p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Ends {date(e.eventEndDate)}{e.payoutStatus ? ` · payout ${e.payoutStatus}` : ""}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Withdrawals</h4>
                  {detail.withdrawals.length === 0 ? <p className="text-sm text-slate-400">None yet</p> : (
                    <ul className="space-y-2">
                      {detail.withdrawals.map((w) => (
                        <li key={w.reference} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">{naira(w.amount)} <span className="text-xs text-slate-400 font-normal">· {w.kind}</span></p>
                            <p className="text-[11px] text-slate-400 truncate">{w.bankName} {w.accountNumber} · {date(w.createdAt)}</p>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${w.status === "successful" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : w.status === "failed" ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{w.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </aside>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 rounded-xl text-sm text-white shadow-lg ${toast.ok ? "bg-slate-900" : "bg-red-600"}`}>{toast.msg}</div>
      )}
    </div>
  )
}
