"use client"

import { Check } from "lucide-react"

interface TicketScopePickerProps {
  ticketPolicies: string[]
  selected: string[]
  onChange: (next: string[]) => void
}

export default function TicketScopePicker({ ticketPolicies, selected, onChange }: TicketScopePickerProps) {
  const allSelected = selected.length === 0

  const toggle = (policy: string) => {
    if (selected.includes(policy)) onChange(selected.filter((p) => p !== policy))
    else onChange([...selected, policy])
  }

  if (ticketPolicies.length === 0) {
    return <p className="text-xs text-slate-500">This event has no priced ticket tiers yet — coupons will apply to all tickets.</p>
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onChange([])}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
          allSelected
            ? "bg-[#6b2fa5]/10 border-[#6b2fa5] text-[#6b2fa5]"
            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
        }`}
      >
        All ticket types
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ticketPolicies.map((policy) => {
          const checked = selected.includes(policy)
          return (
            <button
              type="button"
              key={policy}
              onClick={() => toggle(policy)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors text-left ${
                checked
                  ? "bg-[#6b2fa5]/10 border-[#6b2fa5] text-[#6b2fa5]"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border-2 flex-shrink-0 ${
                  checked ? "bg-[#6b2fa5] border-[#6b2fa5]" : "border-slate-300"
                }`}
              >
                {checked && <Check size={12} className="text-white" />}
              </span>
              <span className="truncate">{policy}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
