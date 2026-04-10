"use client"

import { useState } from "react"
import type { PayoutMethod } from "@/app/api/v1/users/[email]/payout-methods/route"
import { Trash2, AlertCircle, Plus } from "lucide-react"

interface PayoutMethodsProps {
  email: string
  methods: PayoutMethod[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onDeleteMethod: (methodId: string) => void
}

export function PayoutMethodsComponent({
  email,
  methods,
  loading,
  error,
  onRefresh,
  onDeleteMethod,
}: PayoutMethodsProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: "bank" as const,
    displayName: "",
    lastFour: "",
  })
  const [adding, setAdding] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleAddMethod = async () => {
    if (!formData.displayName || !formData.lastFour) {
      return
    }

    setAdding(true)
    try {
      const response = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/payout-methods`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      )

      if (response.ok) {
        setFormData({ type: "bank", displayName: "", lastFour: "" })
        setAddDialogOpen(false)
        onRefresh()
      }
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteMethod = async (methodId: string) => {
    try {
      const response = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/payout-methods`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ methodId }),
        }
      )

      if (response.ok) {
        onDeleteMethod(methodId)
        setDeleteConfirm(null)
      }
    } catch (error) {
      console.error("[v0] Failed to delete method:", error)
    }
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      bank: "🏦",
      paypal: "🅿️",
      stripe: "💳",
    }
    return icons[type] || "💰"
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
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Payout Methods</h3>
        <button
          onClick={() => setAddDialogOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Method
        </button>
      </div>

      {loading ? (
        <div className="p-6">
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : methods.length === 0 ? (
        <div className="p-6 text-center text-slate-600">
          <p className="text-sm">No payout methods added yet</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {methods.map((method) => (
            <div key={method.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{getTypeIcon(method.type)}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{method.displayName}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {method.type.charAt(0).toUpperCase() + method.type.slice(1)} •{" "}
                      {method.verified ? "Verified" : "Unverified"}
                    </p>
                    {method.lastFour && (
                      <p className="text-xs text-slate-500 mt-1">
                        Last 4 digits: {method.lastFour}
                      </p>
                    )}
                    {method.email && (
                      <p className="text-xs text-slate-500 mt-1">{method.email}</p>
                    )}
                  </div>
                  {method.isDefault && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                      Default
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setDeleteConfirm(method.id)}
                  className="text-slate-400 hover:text-red-600 transition-colors p-2"
                  title="Delete method"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === method.id && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded flex items-center justify-between gap-3">
                  <p className="text-xs text-red-700 font-medium">Delete this method?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2 py-1 text-xs text-red-700 border border-red-300 rounded hover:bg-red-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteMethod(method.id)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Method Dialog */}
      {addDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900">Add Payout Method</h3>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({ ...formData, displayName: e.target.value })
                    }
                    placeholder="e.g., My Bank Account"
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Last 4 Digits
                  </label>
                  <input
                    type="text"
                    value={formData.lastFour}
                    onChange={(e) =>
                      setFormData({ ...formData, lastFour: e.target.value })
                    }
                    placeholder="e.g., 5678"
                    maxLength={4}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setAddDialogOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMethod}
                  disabled={adding || !formData.displayName || !formData.lastFour}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {adding ? "Adding..." : "Add Method"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
