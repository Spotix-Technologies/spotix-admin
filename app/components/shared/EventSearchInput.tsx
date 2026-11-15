"use client"

/**
 * app/components/shared/EventSearchInput.tsx
 *
 * Reusable event picker for admin tools that previously only accepted a
 * raw eventId (e.g. the Campaigns lookup on admin-dashboard/it-dashboard).
 * Typing 5+ characters shows a name/ID typeahead dropdown backed by the
 * same /api/v1/event-data?action=search&term= endpoint the Event Data
 * tool already uses — so admins can find an event by name instead of
 * having to go copy its ID first. Pasting a full eventId directly and
 * pressing Enter (or "Look up") still works exactly as before.
 */

import { useEffect, useRef, useState } from "react"
import { Search, Loader2, X } from "lucide-react"

export interface EventSuggestion {
  eventId: string
  eventName: string
  eventImage: string
  status: string
}

const STATUS_PILL: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
}

export function EventSearchInput({
  value,
  onChange,
  onSubmit,
  onSelect,
  loading = false,
  placeholder = "Search event name or paste event ID…",
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onSelect: (event: EventSuggestion) => void
  loading?: boolean
  placeholder?: string
}) {
  const [suggestions, setSuggestions] = useState<EventSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (value.trim().length < 5) { setSuggestions([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const res = await fetch(`/api/v1/event-data?action=search&term=${encodeURIComponent(value.trim())}`)
        const data = await res.json()
        setSuggestions(data.data || [])
      } catch {
        setSuggestions([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const showResults = showDropdown && value.trim().length >= 5

  return (
    <div ref={wrapRef} className="relative flex-1">
      <div
        className={`relative flex items-center bg-white border transition-all duration-150
          ${showResults && suggestions.length > 0
            ? "rounded-t-xl border-b-transparent border-[#6b2fa5]/40"
            : "rounded-xl border-slate-200 hover:border-slate-300 focus-within:border-[#6b2fa5]/60"
          }`}
      >
        <div className="pl-3.5 shrink-0">
          {loadingSuggestions ? (
            <div className="w-4 h-4 border-2 border-slate-200 border-t-[#6b2fa5] rounded-full animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={(e) => { if (e.key === "Enter") { setShowDropdown(false); onSubmit() } }}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 bg-transparent px-2.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        {value && (
          <button
            onClick={() => { onChange(""); setSuggestions([]); setShowDropdown(false) }}
            className="pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 bg-white border border-t-0 border-[#6b2fa5]/40 rounded-b-xl overflow-hidden z-50 shadow-xl">
          {suggestions.length > 0 ? (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {suggestions.map((item) => (
                <button
                  key={item.eventId}
                  onClick={() => { setShowDropdown(false); onChange(item.eventId); onSelect(item) }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                    {item.eventImage ? (
                      <img src={item.eventImage} alt={item.eventName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm">🎪</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-[#6b2fa5] transition-colors truncate">
                      {item.eventName}
                    </p>
                    <p className="text-xs text-slate-400 font-mono truncate">{item.eventId}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_PILL[item.status] || STATUS_PILL.active}`}>
                    {item.status}
                  </span>
                </button>
              ))}
            </div>
          ) : !loadingSuggestions ? (
            <p className="px-3.5 py-4 text-center text-sm text-slate-400">No events found for &quot;{value}&quot;</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
