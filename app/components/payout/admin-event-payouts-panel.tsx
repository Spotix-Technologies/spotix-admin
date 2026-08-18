"use client"

/**
 * app/components/payout/admin-event-payouts-panel.tsx
 *
 * Replaces the old, minimal AdminPayoutsTab in event-data-tab.tsx.
 * Shared by all three role dashboards that expose an Event Data tab
 * (admin, customer-support, exec-assistant) — each just renders
 * <AdminEventPayoutsPanel eventId={...} adminUsername={...} canManage={...} />
 * in place of the old table.
 *
 * canManage gates the two money-moving actions (admin-payout, revert) —
 * both are restricted server-side to the "admin" role regardless of
 * what this prop says; it's only here so non-"admin" roles (customer
 * support, exec-assistant) see the read-only view without a button that
 * would just 403 if clicked.
 */

import { useState, useEffect, useCallback } from "react"
import {
  Wallet, Loader2, AlertCircle, Clock, XCircle, CheckCircle2,
  ChevronRight, ShieldAlert, RotateCcw, X, Lock,
} from "lucide-react"
import { AdminPayDialog, RevertDialog } from "./admin-payout-dialogs"

interface TxnRecord {
  date: string
  ticketCount?: number
  ticketSales?: number
  updatedAt?: string
  payoutReference?: string
}

interface PayoutRecord {
  reference: string
  eventId: string
  userId: string
  date: string
  amount: number
  bankName: string
  accountNumber: string
  accountName: string
  status: "initializing" | "processing" | "successful" | "failed"
  failureReason: string | null
  adminInitiated: boolean
  adminInitiatedByName: string | null
  createdAt: string | null
  resolvedAt: string | null
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  initializing: { label: "Initializing", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  processing:   { label: "Processing",   bg: "bg-blue-50",  text: "text-blue-700",  border: "border-blue-200", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  successful:   { label: "Successful",   bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed:       { label: "Failed",       bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: <XCircle className="w-3 h-3" /> },
}

export default function AdminEventPayoutsPanel({
  eventId, adminUsername, canManage,
}: { eventId: string; adminUsername: string; canManage: boolean }) {
  const [transactions, setTransactions] = useState<TxnRecord[]>([])
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [payDialog, setPayDialog] = useState<TxnRecord | null>(null)
  const [revertDialog, setRevertDialog] = useState<PayoutRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [txRes, poRes] = await Promise.all([
        fetch(`/api/v1/event-data/transactions?eventId=${eventId}`),
        fetch(`/api/v1/event-data/payouts?eventId=${eventId}`),
      ])
      const txJson = await txRes.json()
      const poJson = await poRes.json()
      if (!txRes.ok) throw new Error(txJson.error || "Failed to load transactions")
      if (!poRes.ok) throw new Error(poJson.error || "Failed to load payouts")
      setTransactions(txJson.transactions ?? [])
      setPayouts(poJson.payouts ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payout data")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  // Latest non-failed payout per date (mirrors the unique-index rule:
  // failed doesn't reserve a date, so it shouldn't shadow a "pay out"
  // button either).
  function latestBlockingPayout(date: string): PayoutRecord | undefined {
    return payouts
      .filter((p) => p.date === date && p.status !== "failed")
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#6b2fa5] mx-auto" />
          <p className="text-sm text-slate-500">Loading payout data…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-2.5 text-sm text-red-500">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {payDialog && (
        <AdminPayDialog
          scope="event"
          id={eventId}
          date={payDialog.date}
          adminUsername={adminUsername}
          onClose={() => setPayDialog(null)}
          onSuccess={() => { setPayDialog(null); load() }}
        />
      )}
      {revertDialog && (
        <RevertDialog
          scope="event"
          id={eventId}
          payout={revertDialog}
          onClose={() => setRevertDialog(null)}
          onSuccess={() => { setRevertDialog(null); load() }}
        />
      )}

      {/* ── Transactions ── */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Transaction Dates</h3>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
            <Wallet className="w-8 h-8 text-slate-300" />
            <p className="text-sm">No transaction dates recorded for this event yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-100">
            {transactions.map((t) => {
              const blocking = latestBlockingPayout(t.date)
              const cfg = blocking ? STATUS_CONFIG[blocking.status] : null
              return (
                <div key={t.date} className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.date}</p>
                    <p className="text-xs text-slate-500">
                      {t.ticketCount ?? 0} ticket{(t.ticketCount ?? 0) !== 1 ? "s" : ""} · ₦{Number(t.ticketSales ?? 0).toLocaleString()}
                    </p>
                  </div>
                  {blocking && cfg ? (
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      {blocking.adminInitiated && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border bg-purple-50 text-purple-700 border-purple-200">
                          <ShieldAlert className="w-3 h-3" />
                          Admin
                        </span>
                      )}
                    </div>
                  ) : canManage ? (
                    <button
                      onClick={() => setPayDialog(t)}
                      disabled={!t.ticketSales}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#6b2fa5] text-white hover:bg-[#5a2589] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      Pay Out
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Ready</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Payout history ── */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Payout History</h3>
        {payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
            <Wallet className="w-8 h-8 text-slate-300" />
            <p className="text-sm">No payouts found for this event.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payouts.map((p) => {
              const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.initializing
              return (
                <div key={p.reference} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800">{p.date}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      {p.adminInitiated ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border bg-purple-50 text-purple-700 border-purple-200">
                          <ShieldAlert className="w-3 h-3" />
                          Paid by {p.adminInitiatedByName ?? "Admin"}
                        </span>
                      ) : null}
                      {/* No adminInitiated field / false → shown as normal, no special badge. Backward compatible with every pre-existing row. */}
                    </div>
                    <p className="text-xs text-slate-500">₦{Number(p.amount).toLocaleString()} · {p.bankName} · •••• {p.accountNumber?.slice(-4)}</p>
                    <p className="text-[11px] font-mono text-slate-400">{p.reference}</p>
                    {p.status === "failed" && p.failureReason && <p className="text-xs text-red-600">{p.failureReason}</p>}
                  </div>
                  {canManage && (
                    <button
                      onClick={() => setRevertDialog(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Revert
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
