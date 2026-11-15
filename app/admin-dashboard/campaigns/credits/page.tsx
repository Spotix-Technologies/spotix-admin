"use client"

/**
 * app/admin-dashboard/campaigns/credits/page.tsx
 *
 * Manual funding of a booker's EMAIL and SMS credits. The booker is found by
 * their account EMAIL (not an event, not a user id) — both credit balances
 * belong to the account, so one top-up works for every event they run.
 *
 * Shows both balances and the 15 most recent credit transactions (filterable
 * Email / SMS / both) so an admin can see what happened before adding more.
 * Top-ups are admin-only, need a reason, and are ledgered as "manual".
 */

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Search, PlusCircle, Wallet, Mail, MessageSquareText } from "lucide-react"

interface Balance { available: number; reserved: number; consumed: number }
interface FoundUser { uid: string; email: string; username: string | null; fullName: string | null }
interface Txn {
  id: string
  kind: "email" | "sms"
  txnType: "purchase" | "used" | "manual" | "refund" | "free"
  direction: "added" | "deducted" | "reserved"
  credits: number
  reference: string | null
  reason: string | null
  createdAt: string
}
type Filter = "all" | "email" | "sms"

const VALUE_STYLES: Record<Txn["direction"], string> = {
  added: "bg-green-100 text-green-700",
  deducted: "bg-red-100 text-red-700",
  reserved: "bg-yellow-100 text-yellow-800",
}
const TYPE_LABELS: Record<Txn["txnType"], string> = {
  purchase: "Purchase", used: "Used", manual: "Manual (admin)", refund: "Refund", free: "Free credit",
}

const inputClass = "border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]"

function fmtDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
}

function BalanceCard({ label, icon, balance }: { label: string; icon: React.ReactNode; balance: Balance }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <p className="text-sm text-slate-500 flex items-center gap-2">{icon} {label}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1">
        {balance.available.toLocaleString()} <span className="text-base font-normal text-slate-400">available</span>
      </p>
      <p className="text-xs text-slate-400 mt-1">
        {balance.reserved.toLocaleString()} reserved · {balance.consumed.toLocaleString()} used
      </p>
    </div>
  )
}

export default function AdminCampaignCreditsPage() {
  const [emailInput, setEmailInput] = useState("")
  const [lookupEmail, setLookupEmail] = useState("")   // the email actually looked up (top-ups use this, not the live input)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<FoundUser | null>(null)
  const [emailCredits, setEmailCredits] = useState<Balance | null>(null)
  const [smsCredits, setSmsCredits] = useState<Balance | null>(null)

  const [filter, setFilter] = useState<Filter>("all")
  const [txns, setTxns] = useState<Txn[]>([])
  const [txnLoading, setTxnLoading] = useState(false)

  const [kind, setKind] = useState<"email" | "sms">("email")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [topupMsg, setTopupMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function loadTransactions(forEmail: string, forFilter: Filter) {
    setTxnLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/campaigns/credits/transactions?email=${encodeURIComponent(forEmail)}&kind=${forFilter}`)
      const data = await res.json()
      if (data.success) setTxns(data.transactions || [])
    } finally {
      setTxnLoading(false)
    }
  }

  async function lookup() {
    const email = emailInput.trim()
    if (!email) return
    setLoading(true)
    setError(null)
    setUser(null)
    setTopupMsg(null)
    try {
      const res = await fetch(`/api/v1/admin/campaigns/credits/user?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || "Lookup failed")
        return
      }
      setUser(data.user)
      setEmailCredits(data.emailCredits)
      setSmsCredits(data.smsCredits)
      setLookupEmail(data.user.email)
      setFilter("all")
      await loadTransactions(data.user.email, "all")
    } catch {
      setError("Lookup failed")
    } finally {
      setLoading(false)
    }
  }

  function changeFilter(next: Filter) {
    setFilter(next)
    if (lookupEmail) loadTransactions(lookupEmail, next)
  }

  async function topUp() {
    const delta = Number(amount)
    if (!user || !Number.isInteger(delta) || delta === 0 || !reason.trim()) {
      setTopupMsg({ ok: false, text: "Enter a whole-number amount (not zero) and a reason." })
      return
    }
    const verb = delta > 0 ? `Add ${delta.toLocaleString()}` : `Remove ${Math.abs(delta).toLocaleString()}`
    if (!window.confirm(`${verb} ${kind === "email" ? "email" : "SMS"} credits ${delta > 0 ? "to" : "from"} ${user.email}?`)) return

    setSubmitting(true)
    setTopupMsg(null)
    try {
      const res = await fetch("/api/v1/admin/campaigns/credits/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lookupEmail, kind, amount: delta, reason: reason.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setTopupMsg({ ok: false, text: data.error || "Failed" })
        return
      }
      if (kind === "email") setEmailCredits(data.credits); else setSmsCredits(data.credits)
      setTopupMsg({ ok: true, text: `Done — ${kind === "email" ? "email" : "SMS"} balance is now ${data.credits.available.toLocaleString()} available.` })
      setAmount("")
      setReason("")
      await loadTransactions(lookupEmail, filter)
    } catch {
      setTopupMsg({ ok: false, text: "Failed" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-16 space-y-6">
      <Link href="/admin-dashboard/campaigns" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6b2fa5] hover:text-[#5a1f8a] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center shrink-0">
          <Wallet className="w-4 h-4 text-[#6b2fa5]" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Campaign credits</h1>
          <p className="text-slate-500 text-sm mt-0.5">Find a booker by email to see their balances and top up email or SMS credits</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="booker@example.com"
          className={`${inputClass} flex-1 rounded-xl px-3.5 py-2.5`}
        />
        <button
          onClick={lookup}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6b2fa5] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#5a1f8a] transition-colors shrink-0 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Look up
        </button>
      </div>

      {error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      )}

      {user && emailCredits && smsCredits && (
        <>
          <p className="text-sm text-slate-500">
            Account: <span className="font-semibold text-slate-800">{user.fullName || user.username || user.email}</span>
            {user.username && user.fullName ? <span className="text-slate-400"> (@{user.username})</span> : null}
            <span className="text-slate-400"> · {user.email}</span>
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <BalanceCard label="Email credits" icon={<Mail className="w-4 h-4 text-[#6b2fa5]" />} balance={emailCredits} />
            <BalanceCard label="SMS credits" icon={<MessageSquareText className="w-4 h-4 text-[#6b2fa5]" />} balance={smsCredits} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <p className="font-semibold text-slate-800 flex items-center gap-2"><PlusCircle className="w-4 h-4 text-[#6b2fa5]" /> Top up credits</p>
            <div className="grid sm:grid-cols-4 gap-2">
              <select value={kind} onChange={(e) => setKind(e.target.value as "email" | "sms")} className={inputClass}>
                <option value="email">Email credits</option>
                <option value="sms">SMS credits</option>
              </select>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="1" placeholder="Credits (− to remove)" className={inputClass} />
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" className={`${inputClass} sm:col-span-2`} maxLength={500} />
            </div>
            <p className="text-xs text-slate-400">Credits go to this account and can be used on any of their events. The change is logged as a manual transaction under your name.</p>
            <button
              onClick={topUp}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6b2fa5] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#5a1f8a] transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Apply
            </button>
            {topupMsg && <p className={`text-sm ${topupMsg.ok ? "text-green-700" : "text-red-600"}`}>{topupMsg.text}</p>}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">Transactions</p>
                <p className="text-xs text-slate-400 mt-0.5">The 15 most recent</p>
              </div>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                {(["all", "email", "sms"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => changeFilter(f)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors capitalize ${filter === f ? "bg-white text-[#6b2fa5] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {f === "sms" ? "SMS" : f}
                  </button>
                ))}
              </div>
            </div>

            {txns.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-slate-400">{txnLoading ? "Loading…" : "No transactions yet."}</p>
            ) : (
              <div className={`overflow-x-auto ${txnLoading ? "opacity-50" : ""}`}>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 border-y border-slate-200">
                    <tr>
                      <th className="text-left font-medium px-5 py-2">Date</th>
                      <th className="text-left font-medium px-5 py-2">Campaign</th>
                      <th className="text-left font-medium px-5 py-2">Credits</th>
                      <th className="text-left font-medium px-5 py-2">Type</th>
                      <th className="text-left font-medium px-5 py-2">Txn ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {txns.map((t) => (
                      <tr key={`${t.kind}-${t.id}`}>
                        <td className="px-5 py-2.5 text-slate-600 text-xs whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                        <td className="px-5 py-2.5">
                          <span className={`inline-block text-xs rounded-full px-2.5 py-0.5 font-semibold ${t.kind === "email" ? "bg-[#6b2fa5]/10 text-[#6b2fa5]" : "bg-blue-100 text-blue-700"}`}>
                            {t.kind === "email" ? "Email" : "SMS"}
                          </span>
                        </td>
                        <td className="px-5 py-2.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${VALUE_STYLES[t.direction]}`}>
                            {t.direction === "added" ? "+" : t.direction === "deducted" ? "−" : ""}{t.credits.toLocaleString()}
                            {t.direction === "reserved" && <span className="font-medium opacity-80">reserved</span>}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-slate-700 text-xs font-medium whitespace-nowrap">
                          {TYPE_LABELS[t.txnType] || t.txnType}
                          {t.reason && t.txnType === "manual" && <span className="block text-slate-400 font-normal max-w-[220px] truncate" title={t.reason}>{t.reason}</span>}
                        </td>
                        <td className="px-5 py-2.5 text-slate-500 text-xs font-mono whitespace-nowrap">{t.reference || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
