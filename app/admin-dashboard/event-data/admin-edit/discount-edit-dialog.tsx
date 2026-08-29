"use client"

import { useState } from "react"
import { DollarSign, Users, Calendar, Layers, Pencil, X, Tag, Percent } from "lucide-react"
import TicketScopePicker from "./ticket-scope-picker"
import { validateDiscountValue } from "./discount-utils"
import type { DiscountData } from "./types"

export interface DiscountEditUpdates {
  code: string
  type: "percentage" | "flat"
  value: number
  maxUses: number
  expiryDate: string | null
  applicableTickets: string[] | null
}

interface DiscountEditDialogProps {
  discount: DiscountData
  ticketPolicies: string[]
  ticketPrices: { policy: string; price: number }[]
  saving: boolean
  onCancel: () => void
  onSave: (updates: DiscountEditUpdates) => void
}

export default function DiscountEditDialog({
  discount,
  ticketPolicies,
  ticketPrices,
  saving,
  onCancel,
  onSave,
}: DiscountEditDialogProps) {
  const [code, setCode] = useState(discount.code)
  const [type, setType] = useState<"percentage" | "flat">(discount.type)
  const [value, setValue] = useState<number | "">(discount.value)
  const [maxUses, setMaxUses] = useState(discount.maxUses)
  const [expiryDate, setExpiryDate] = useState(discount.expiryDate ? discount.expiryDate.slice(0, 10) : "")
  const [applicableTickets, setApplicableTickets] = useState<string[]>(discount.applicableTickets ?? [])
  const [valueError, setValueError] = useState<string | null>(null)

  const submit = () => {
    if (!code.trim()) { setValueError("Discount code can't be empty."); return }
    const error = validateDiscountValue(type, value, ticketPrices, applicableTickets)
    if (error) { setValueError(error); return }
    setValueError(null)
    onSave({
      code: code.trim().toUpperCase(),
      type,
      value: value === "" ? 0 : Number(value),
      maxUses: Number(maxUses) || discount.usedCount || 1,
      expiryDate: expiryDate || null,
      applicableTickets: applicableTickets.length > 0 ? applicableTickets : null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#6b2fa5] to-[#8b4fc5] rounded-lg">
              <Pencil size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Edit {discount.code}</h3>
              <p className="text-xs text-slate-500">Used {discount.usedCount} time{discount.usedCount === 1 ? "" : "s"} so far</p>
            </div>
          </div>
          <button onClick={onCancel} disabled={saving} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <Tag size={16} className="text-[#6b2fa5]" />
              Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all uppercase"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <Percent size={16} className="text-[#6b2fa5]" />
              Type
            </label>
            <select
              value={type}
              onChange={(e) => { setType(e.target.value as "percentage" | "flat"); setValueError(null) }}
              className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount (₦)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <DollarSign size={16} className="text-[#6b2fa5]" />
              Value {type === "percentage" ? "(%)" : "(₦)"}
            </label>
            <input
              type="number"
              value={value}
              min={0}
              max={type === "percentage" ? 90 : undefined}
              onChange={(e) => {
                const raw = e.target.value
                if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return
                setValueError(null)
                setValue(raw === "" ? "" : Number(raw))
              }}
              className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all"
            />
            {valueError && <p className="mt-1.5 text-xs font-semibold text-red-600">{valueError}</p>}
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <Users size={16} className="text-[#6b2fa5]" />
              Max Uses
            </label>
            <input
              type="number"
              value={maxUses}
              min={discount.usedCount || 1}
              onChange={(e) => setMaxUses(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
            <Calendar size={16} className="text-[#6b2fa5]" />
            Expiry Date (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all"
            />
            {expiryDate && (
              <button
                type="button"
                onClick={() => setExpiryDate("")}
                className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
            <Layers size={16} className="text-[#6b2fa5]" />
            Applies To
          </label>
          <TicketScopePicker ticketPolicies={ticketPolicies} selected={applicableTickets} onChange={setApplicableTickets} />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#6b2fa5] to-[#8b4fc5] text-white text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
