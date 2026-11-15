"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { EventSearchInput, type EventSuggestion } from "@/components/shared/EventSearchInput"
import { CONTROL_LIMITS, DEFAULT_THEME, KIND_LABEL, MAX_THEME_LENGTH } from "../constants"
import type { ControlKind } from "../types"
import { ModalShell } from "./ModalShell"

export function AddEventModal({
  kind,
  knownThemes,
  onClose,
  onAdd,
}: {
  kind: ControlKind
  knownThemes: string[]
  onClose: () => void
  onAdd: (eventId: string, theme?: string) => Promise<void>
}) {
  const [value, setValue] = useState("")
  const [selected, setSelected] = useState<EventSuggestion | null>(null)
  const [theme, setTheme] = useState(DEFAULT_THEME)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eventId = value.trim()

  const submit = async () => {
    if (!eventId || saving) return
    setSaving(true)
    setError(null)
    try {
      await onAdd(eventId, kind === "themed" ? theme : undefined)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add")
      setSaving(false)
    }
  }

  return (
    <ModalShell title={`Add to ${KIND_LABEL[kind]}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Event</label>
          <div className="flex">
            <EventSearchInput
              value={value}
              onChange={(v) => {
                setValue(v)
                if (selected && selected.eventId !== v) setSelected(null)
                setError(null)
              }}
              onSelect={setSelected}
              onSubmit={submit}
              loading={saving}
              placeholder="Search by name or paste event ID…"
            />
          </div>
        </div>

        {selected && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            {selected.eventImage ? (
              <img src={selected.eventImage} alt="" className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-200" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{selected.eventName}</p>
              <p className="text-xs font-mono text-slate-400 truncate">{selected.eventId}</p>
            </div>
          </div>
        )}

        {kind === "themed" && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Theme label</label>
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              maxLength={MAX_THEME_LENGTH}
              list="event-control-themes"
              placeholder={DEFAULT_THEME}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#6b2fa5]/60"
            />
            <datalist id="event-control-themes">
              {knownThemes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <p className="text-[11px] text-slate-400 mt-1">Shown as a tag on the card, e.g. “Campus”, “Owambe”, “Concert”.</p>
          </div>
        )}

        <p className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          The user app shows the {CONTROL_LIMITS[kind]} most recently added. Adding this pushes the oldest live entry off the page.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-sm font-semibold text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!eventId || saving}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] disabled:opacity-50 px-4 py-2 rounded-lg"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add event
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
