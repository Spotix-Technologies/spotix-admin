"use client"

import { useState } from "react"
import type { PayoutMethod } from "@/api/v1/users/[email]/payout-methods/route"
import { Trash2, AlertCircle, Star } from "lucide-react"

interface PayoutMethodsProps {
  userId: string
  email: string
  methods: PayoutMethod[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onDeleteMethod: (methodId: string) => void
  onSetPrimary: (methodId: string) => void
}

export function PayoutMethodsComponent({
  userId,
  email,
  methods,
  loading,
  error,
  onRefresh,
  onDeleteMethod,
  onSetPrimary,
}: PayoutMethodsProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null)

  const handleDeleteMethod = async (methodId: string) => {
    setDeletingId(methodId)
    try {
      const response = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/payout-methods`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, methodId }),
        }
      )

      if (response.ok) {
        onDeleteMethod(methodId)
        setDeleteConfirm(null)
      } else {
        console.error("[v0] Delete failed:", await response.text())
      }
    } catch (err) {
      console.error("[v0] Failed to delete method:", err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSetPrimary = async (methodId: string) => {
    setSettingPrimaryId(methodId)
    try {
      const response = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/payout-methods`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, methodId }),
        }
      )

      if (response.ok) {
        onSetPrimary(methodId)
      } else {
        console.error("[v0] Set primary failed:", await response.text())
      }
    } catch (err) {
      console.error("[v0] Failed to set primary:", err)
    } finally {
      setSettingPrimaryId(null)
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Payout Methods</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Accounts registered for payouts. Accounts without a recipient code have
          not yet received a payout.
        </p>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : methods.length === 0 ? (
        <div className="p-6 text-center text-slate-500">
          <p className="text-sm">No payout methods on this account</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {methods.map((method) => {
            const hasRecipientCode = Boolean(method.recipientCode)
            const isSettingPrimary = settingPrimaryId === method.id
            const isDeleting = deletingId === method.id

            return (
              <div key={method.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  {/* Left — account info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">
                        {method.accountName}
                      </p>
                      {method.primary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                          <Star className="h-3 w-3 fill-indigo-500 stroke-none" />
                          Primary
                        </span>
                      )}
                      {hasRecipientCode ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                          Paystack linked
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                          Not yet used
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-700 mt-1">{method.bankName}</p>

                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-slate-500 font-mono">
                        {method.accountNumber}
                      </span>
                      <span className="text-xs text-slate-400">
                        Code: {method.bankCode}
                      </span>
                      {hasRecipientCode && (
                        <span className="text-xs text-slate-400 font-mono truncate max-w-[160px]">
                          RCP: {method.recipientCode}
                        </span>
                      )}
                    </div>

                    {method.createdAt && (
                      <p className="text-xs text-slate-400 mt-1">
                        Added{" "}
                        {(() => {
                          const raw = method.createdAt as any
                          const ms =
                            typeof raw === "string" || typeof raw === "number"
                              ? new Date(raw).getTime()
                              : raw?._seconds
                              ? raw._seconds * 1000
                              : NaN
                          const d = new Date(ms)
                          return isNaN(d.getTime())
                            ? "—"
                            : d.toLocaleDateString("en-NG", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                        })()}
                      </p>
                    )}
                  </div>

                  {/* Right — actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!method.primary && (
                      <button
                        onClick={() => handleSetPrimary(method.id)}
                        disabled={isSettingPrimary}
                        title="Set as primary"
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-40"
                      >
                        {isSettingPrimary ? (
                          <span className="block h-4 w-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                        ) : (
                          <Star className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(method.id)}
                      disabled={isDeleting}
                      title="Delete method"
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Delete confirmation */}
                {deleteConfirm === method.id && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3">
                    <p className="text-xs text-red-700 font-medium">
                      Delete {method.bankName} ••••
                      {method.accountNumber.slice(-4)}?
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1 text-xs text-red-700 border border-red-300 rounded hover:bg-red-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteMethod(method.id)}
                        disabled={isDeleting}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {isDeleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}