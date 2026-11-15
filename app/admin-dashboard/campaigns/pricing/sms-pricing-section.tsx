"use client"

/**
 * Bulk SMS pricing — base price per SMS, MOQ, volume thresholds and discount
 * codes. Unlike email (fixed packages) SMS credits are bought as any quantity
 * ≥ MOQ, billed per number sent; the booker's price is worked out from these
 * thresholds, VAT (Paystack's fee) is added on top, and a discount code takes
 * a percentage off the credit price only — never off VAT.
 */

import { useEffect, useState } from "react"
import { Loader2, Trash2, Plus, MessageSquareText, Percent } from "lucide-react"

interface Tier { minQty: string; price: string }
interface Discount { id: string; code: string; percent: number; active: boolean; expiresAt: string | null }

const naira = (n: number) => `₦${Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const inputClass = "border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]"

export function SmsPricingSection() {
  const [loaded, setLoaded] = useState(false)
  const [basePrice, setBasePrice] = useState("")
  const [moq, setMoq] = useState("")
  const [tiers, setTiers] = useState<Tier[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const [discounts, setDiscounts] = useState<Discount[] | null>(null)
  const [code, setCode] = useState("")
  const [percent, setPercent] = useState("")
  const [expires, setExpires] = useState("")
  const [discountMsg, setDiscountMsg] = useState<string | null>(null)

  function loadConfig() {
    fetch("/api/v1/admin/global/sms-pricing")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return
        const c = data.config
        setBasePrice(c.basePrice ? String(c.basePrice) : "")
        setMoq(c.moq ? String(c.moq) : "")
        setTiers((c.tiers || []).map((t: any) => ({ minQty: String(t.minQty), price: String(t.price) })))
      })
      .finally(() => setLoaded(true))
  }
  function loadDiscounts() {
    fetch("/api/v1/admin/global/sms-discounts")
      .then((r) => r.json())
      .then((data) => { if (data.success) setDiscounts(data.discounts) })
  }
  useEffect(() => { loadConfig(); loadDiscounts() }, [])

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/v1/admin/global/sms-pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basePrice: Number(basePrice),
          moq: Number(moq),
          tiers: tiers.filter((t) => t.minQty || t.price).map((t) => ({ minQty: Number(t.minQty), price: Number(t.price) })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ ok: true, text: "Pricing saved — bookers see it immediately." })
        loadConfig()
      } else {
        setMessage({ ok: false, text: data.error || "Couldn't save pricing" })
      }
    } finally {
      setSaving(false)
    }
  }

  async function addDiscount() {
    setDiscountMsg(null)
    const res = await fetch("/api/v1/admin/global/sms-discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, percent: Number(percent), expiresAt: expires || undefined }),
    })
    const data = await res.json()
    if (data.success) { setCode(""); setPercent(""); setExpires(""); loadDiscounts() }
    else setDiscountMsg(data.error || "Couldn't add discount")
  }
  async function toggleDiscount(d: Discount) {
    await fetch("/api/v1/admin/global/sms-discounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, active: !d.active }),
    })
    loadDiscounts()
  }
  async function removeDiscount(id: string) {
    if (!confirm("Delete this discount code?")) return
    await fetch(`/api/v1/admin/global/sms-discounts?id=${id}`, { method: "DELETE" })
    loadDiscounts()
  }

  const sortedTiers = [...tiers].sort((a, b) => Number(a.minQty) - Number(b.minQty))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pt-4">
        <div className="w-9 h-9 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center shrink-0">
          <MessageSquareText className="w-4 h-4 text-[#6b2fa5]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Bulk SMS Pricing</h2>
          <p className="text-slate-500 text-sm mt-0.5">Billed per number sent. Set a base price, a minimum order, and discounts at higher volumes.</p>
        </div>
      </div>

      {!loaded ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[#6b2fa5]/30 border-t-[#6b2fa5] rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-600 space-y-1">
              <span className="font-medium">Normal price per SMS (₦)</span>
              <input value={basePrice} onChange={(e) => setBasePrice(e.target.value)} type="number" step="0.01" min="0" placeholder="e.g. 4.50" className={`${inputClass} w-full`} />
            </label>
            <label className="text-sm text-slate-600 space-y-1">
              <span className="font-medium">MOQ — minimum credits per order</span>
              <input value={moq} onChange={(e) => setMoq(e.target.value)} type="number" step="1" min="1" placeholder="e.g. 50" className={`${inputClass} w-full`} />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Volume thresholds</p>
            <p className="text-xs text-slate-400">An order of at least this many credits is priced at the lower rate for the <em>whole</em> order.</p>
            {tiers.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={t.minQty} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, minQty: e.target.value } : x))} type="number" min="1" placeholder="From (credits)" className={`${inputClass} flex-1`} />
                <input value={t.price} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} type="number" step="0.01" min="0" placeholder="Price per SMS (₦)" className={`${inputClass} flex-1`} />
                <button onClick={() => setTiers((p) => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={() => setTiers((p) => [...p, { minQty: "", price: "" }])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6b2fa5] hover:text-[#5a1f8a]"><Plus className="w-4 h-4" /> Add threshold</button>
          </div>

          {Number(basePrice) > 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600 space-y-0.5">
              <p className="font-semibold text-slate-700 mb-1">What bookers will see</p>
              <p>{Number(moq) || 1}{sortedTiers[0]?.minQty ? ` – ${Number(sortedTiers[0].minQty) - 1}` : "+"} credits: {naira(Number(basePrice))} each</p>
              {sortedTiers.filter((t) => t.minQty && t.price).map((t, i, arr) => (
                <p key={i}>{Number(t.minQty).toLocaleString()}{arr[i + 1] ? ` – ${(Number(arr[i + 1].minQty) - 1).toLocaleString()}` : "+"} credits: {naira(Number(t.price))} each</p>
              ))}
              <p className="text-slate-400 pt-1">VAT (Paystack fee) is added on top at checkout.</p>
            </div>
          )}

          {message && <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}
          <button disabled={saving} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-[#6b2fa5] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#5a1f8a] transition-colors disabled:opacity-40">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save SMS pricing
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          <p className="font-semibold text-slate-800 flex items-center gap-2"><Percent className="w-4 h-4 text-[#6b2fa5]" /> Discount codes</p>
          <p className="text-xs text-slate-400 mt-0.5">A percentage off the SMS credit price. VAT is never discounted.</p>
        </div>
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {(discounts || []).map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-mono font-semibold text-sm text-slate-900">{d.code} <span className="font-sans font-normal text-slate-500">· {d.percent}% off</span></p>
                {d.expiresAt && <p className="text-xs text-slate-400 mt-0.5">Expires {new Date(d.expiresAt).toLocaleDateString()}</p>}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input type="checkbox" checked={d.active} onChange={() => toggleDiscount(d)} className="rounded border-slate-300 text-[#6b2fa5] focus:ring-[#6b2fa5]" /> Active
                </label>
                <button onClick={() => removeDiscount(d.id)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {discounts && discounts.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-400">No discount codes yet.</p>}
        </div>
        <div className="border-t border-slate-100 p-5 space-y-2 bg-slate-50/50">
          <div className="grid grid-cols-3 gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CODE" className={`${inputClass} font-mono`} />
            <input value={percent} onChange={(e) => setPercent(e.target.value)} type="number" min="1" max="100" placeholder="% off" className={inputClass} />
            <input value={expires} onChange={(e) => setExpires(e.target.value)} type="date" className={inputClass} title="Optional expiry" />
          </div>
          {discountMsg && <p className="text-xs text-red-600">{discountMsg}</p>}
          <button onClick={addDiscount} disabled={!code || !percent} className="rounded-xl bg-[#6b2fa5] text-white px-4 py-2 text-sm font-semibold hover:bg-[#5a1f8a] transition-colors disabled:opacity-40">Add discount</button>
        </div>
      </div>
    </div>
  )
}
