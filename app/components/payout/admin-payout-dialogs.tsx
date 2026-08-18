"use client"

/**
 * app/components/payout/admin-payout-dialogs.tsx
 *
 * Shared by both admin-event-payouts-panel.tsx and
 * admin-poll-payouts-panel.tsx — the admin-pay confirmation dialog
 * (including the Vault-override warning, event-only) and the revert
 * confirmation dialog (with status-aware warnings) are identical shapes
 * for both scopes, parameterized by `scope`.
 */

import { useState, useEffect } from "react"
import { Loader2, AlertCircle, X, Lock, RotateCcw } from "lucide-react"

interface PayoutRecord {
  reference: string
  date: string
  amount: number
  status: "initializing" | "processing" | "successful" | "failed"
}

/* ── Admin-pay confirmation dialog (shared shape for event/poll) ── */
export function AdminPayDialog({
  scope, id, date, adminUsername, onClose, onSuccess,
}: { scope: "event" | "poll"; id: string; date: string; adminUsername: string; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(true)
  const [method, setMethod] = useState<{ bankName: string; accountName: string; accountNumber: string } | null>(null)
  const [methodError, setMethodError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [vaultWarning, setVaultWarning] = useState(false)
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  useEffect(() => {
    const methodUrl = scope === "event" ? `/api/v1/event-data/payout-method?eventId=${id}` : `/api/v1/admin-polls/payout-method?pollId=${id}`
    fetch(methodUrl)
      .then((r) => r.json())
      .then((json) => {
        if (json.usable) setMethod(json.usable)
        else setMethodError(json.methods?.length ? `${json.methods.length} payout methods on file — admin payout needs exactly one.` : "No payout method on file for this account.")
      })
      .catch(() => setMethodError("Failed to load payout method"))
      .finally(() => setLoading(false))
  }, [scope, id])

  async function submit(confirmVaultOverride = false) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const url = scope === "event" ? "/api/v1/event-data/admin-payout" : "/api/v1/admin-polls/admin-payout"
      const body: Record<string, any> = scope === "event" ? { eventId: id, date, confirmVaultOverride } : { pollId: id, date }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.vaultEnabled && json.requiresConfirmation) { setVaultWarning(true); setSubmitting(false); return }
        throw new Error(json.error || "Failed to record payout")
      }
      onSuccess()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to record payout")
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-base text-slate-800">Record admin payout</h3>
            <p className="text-sm text-slate-500 mt-1">For {date} — settled by you outside Paystack.</p>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-600 mt-0.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#6b2fa5]" /></div>
          ) : methodError ? (
            <div className="flex items-start gap-2.5 p-3 rounded-lg text-xs bg-amber-50 border border-amber-200 text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {methodError}
            </div>
          ) : method ? (
            <>
              {vaultWarning && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-700">
                  <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>This event has an active Vault. Recording this payout now <strong>bypasses Vault sign-off entirely</strong> — any pending sign-off for this date will be marked superseded. Confirm to proceed anyway.</span>
                </div>
              )}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm space-y-1">
                <p className="text-slate-700"><span className="font-semibold">{method.bankName}</span></p>
                <p className="text-slate-500 text-xs">{method.accountName} · •••• {method.accountNumber.slice(-4)}</p>
              </div>
              <p className="text-xs text-slate-400">This will be recorded as an admin-initiated payout under your name ({adminUsername}) and marked successful immediately — no Paystack transfer is made by this action.</p>
              {submitError && <div className="flex items-start gap-2.5 p-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-700"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{submitError}</div>}
            </>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 px-6 pb-6">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
          {method && (
            <button
              onClick={() => submit(vaultWarning)}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 bg-[#6b2fa5] hover:bg-[#5a2589] text-white"
            >
              {submitting ? "Recording…" : vaultWarning ? "Override Vault & Pay" : "Confirm Payout"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Revert confirmation dialog ── */
export function RevertDialog({
  scope, id, payout, onClose, onSuccess,
}: { scope: "event" | "poll"; id: string; payout: PayoutRecord; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (reason.trim().length < 5) { setError("Please give a reason (at least 5 characters)."); return }
    setSubmitting(true)
    setError(null)
    try {
      const url = scope === "event" ? "/api/v1/event-data/revert-payout" : "/api/v1/admin-polls/revert-payout"
      const body = scope === "event" ? { eventId: id, reference: payout.reference, reason } : { pollId: id, reference: payout.reference, reason }
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to revert payout")
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revert payout")
      setSubmitting(false)
    }
  }

  const isSuccessful = payout.status === "successful"
  const isProcessing = payout.status === "processing"

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-red-100 bg-red-50 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-base text-red-700">Revert this payout?</h3>
            <p className="text-sm text-slate-500 mt-1">{payout.date} · ₦{Number(payout.amount).toLocaleString()} · {payout.reference}</p>
          </div>
          <button onClick={onClose} disabled={submitting} className="text-slate-400 hover:text-slate-600 mt-0.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-700">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            This permanently deletes the payout record and frees the date up for a new payout request. A full snapshot is archived for audit purposes, but this can't be undone from here.
          </div>

          {isSuccessful && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg text-xs bg-amber-50 border border-amber-200 text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              This payout is marked successful — reverting will also reverse the totalPaidOut/analytics figures it added.
            </div>
          )}
          {isProcessing && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              This payout is still <strong>processing</strong> — Paystack may already be moving real money for this reference. Reverting does NOT cancel a real transfer, it only deletes our record of it. Verify with Paystack directly before reverting a processing payout.
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Reason (required)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being reverted?"
              rows={3}
              className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
            />
          </div>
          {error && <div className="flex items-start gap-2.5 p-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-700"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{error}</div>}
        </div>

        <div className="flex justify-end gap-2 px-6 pb-6">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={submit} disabled={submitting || reason.trim().length < 5} className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {submitting ? "Reverting…" : "Revert Payout"}
          </button>
        </div>
      </div>
    </div>
  )
}
