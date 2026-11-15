"use client"

/**
 * app/admin-dashboard/campaigns/pricing/page.tsx — spec §11.
 * CRUD over admin/global/emailCreditPackages via
 * app/api/v1/admin/global/email-credit-packages.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Trash2, Plus, Tag, ArrowLeft } from "lucide-react"
import { SmsPricingSection } from "./sms-pricing-section"

interface Package {
  id: string
  credit_amount: number
  price: number
  active: boolean
}

export default function PricingPage() {
  const [packages, setPackages] = useState<Package[] | null>(null)
  const [creditAmount, setCreditAmount] = useState("")
  const [price, setPrice] = useState("")
  const [saving, setSaving] = useState(false)

  function load() {
    fetch("/api/v1/admin/global/email-credit-packages")
      .then((r) => r.json())
      .then((data) => { if (data.success) setPackages(data.packages) })
  }
  useEffect(load, [])

  async function addPackage() {
    if (!creditAmount || !price) return
    setSaving(true)
    try {
      await fetch("/api/v1/admin/global/email-credit-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credit_amount: Number(creditAmount),
          price: Number(price),
          active: true,
        }),
      })
      setCreditAmount(""); setPrice("")
      load()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(pkg: Package) {
    await fetch("/api/v1/admin/global/email-credit-packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pkg.id, active: !pkg.active }),
    })
    load()
  }

  async function remove(id: string) {
    if (!confirm("Delete this package?")) return
    await fetch(`/api/v1/admin/global/email-credit-packages?id=${id}`, { method: "DELETE" })
    load()
  }

  const inputClass = "border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]"

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-16 space-y-6">
      <Link href="/admin-dashboard/campaigns" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6b2fa5] hover:text-[#5a1f8a] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center shrink-0">
          <Tag className="w-4 h-4 text-[#6b2fa5]" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Campaign Credit Pricing</h1>
          <p className="text-slate-500 text-sm mt-0.5">Email credit packages and bulk SMS pricing — analytics are included with every email package</p>
        </div>
      </div>

      {!packages ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#6b2fa5]/30 border-t-[#6b2fa5] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {packages.map((pkg) => (
            <div key={pkg.id} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="font-semibold text-slate-900 text-sm">{Number(pkg.credit_amount ?? 0).toLocaleString()} credits</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {Number.isFinite(Number(pkg.price)) && pkg.price > 0
                    ? `₦${Number(pkg.price).toLocaleString()}`
                    : <span className="text-red-500">No price set — bookers can&apos;t buy this package. Delete it and re-add.</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={pkg.active}
                    onChange={() => toggleActive(pkg)}
                    className="rounded border-slate-300 text-[#6b2fa5] focus:ring-[#6b2fa5]"
                  /> Active
                </label>
                <button onClick={() => remove(pkg.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {packages.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No packages configured yet.</p>}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <p className="font-semibold text-slate-800 flex items-center gap-2"><Plus className="w-4 h-4 text-[#6b2fa5]" /> Add email package</p>
        <div className="grid grid-cols-2 gap-2">
          <input value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} type="number" placeholder="Credits" className={inputClass} />
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="Price (₦)" className={inputClass} />
        </div>
        <button
          disabled={saving}
          onClick={addPackage}
          className="rounded-xl bg-[#6b2fa5] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#5a1f8a] transition-colors disabled:opacity-40"
        >
          Add
        </button>
      </div>

      <hr className="border-slate-200" />
      <SmsPricingSection />
    </div>
  )
}
