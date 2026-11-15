"use client"

import { CalendarDays, MapPin, Pencil, Trash2, User } from "lucide-react"
import type { ControlEvent } from "../types"

const fmtDate = (s: string | null) => {
  if (!s) return "—"
  const d = new Date(s)
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

const hasPassed = (s: string) => {
  const d = new Date(s)
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now()
}

export function EventControlCard({
  entry,
  onRemove,
  onEditTheme,
}: {
  entry: ControlEvent
  onRemove: () => void
  onEditTheme?: () => void
}) {
  const ended = !!entry.eventStartDate && hasPassed(entry.eventStartDate)

  return (
    <div className={`flex gap-3 p-3 bg-white border rounded-xl ${entry.live ? "border-slate-200" : "border-slate-200 opacity-75"}`}>
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-slate-100 shrink-0">
        {entry.imageURL ? <img src={entry.imageURL} alt={entry.eventName} className="w-full h-full object-cover" /> : null}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{entry.eventName}</p>
            <p className="text-[11px] font-mono text-slate-400 truncate">{entry.eventId || entry.id}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onEditTheme && (
              <button onClick={onEditTheme} title="Edit theme" className="p-1.5 rounded-lg text-slate-400 hover:text-[#6b2fa5] hover:bg-[#6b2fa5]/10">
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button onClick={onRemove} title="Remove" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {entry.invalid ? (
            <Pill className="bg-red-100 text-red-700">Hidden · missing eventId/creatorID</Pill>
          ) : entry.live ? (
            <Pill className="bg-emerald-100 text-emerald-700">Live on site</Pill>
          ) : (
            <Pill className="bg-slate-100 text-slate-500">Not shown · over limit</Pill>
          )}
          {entry.theme && <Pill className="bg-[#6b2fa5]/10 text-[#6b2fa5]">{entry.theme}</Pill>}
          <Pill className={entry.freeOrPaid ? "bg-violet-50 text-violet-700" : "bg-green-50 text-green-700"}>
            {entry.freeOrPaid ? "Paid" : "Free"}
          </Pill>
          {ended && <Pill className="bg-amber-100 text-amber-700">Event passed</Pill>}
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" />{fmtDate(entry.eventStartDate)}</span>
          {entry.venue && <span className="inline-flex items-center gap-1 min-w-0"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate max-w-[14rem]">{entry.venue}</span></span>}
          <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{entry.bookerName}</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Added {fmtDate(entry.addedAt)}{entry.addedBy ? ` by ${entry.addedBy}` : ""}
        </p>
      </div>
    </div>
  )
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${className}`}>{children}</span>
}
