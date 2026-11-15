"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { DEFAULT_THEME, MAX_THEME_LENGTH } from "../constants"
import type { ControlEvent } from "../types"
import { ModalShell } from "./ModalShell"

export function EditThemeModal({
  entry,
  knownThemes,
  onClose,
  onSave,
}: {
  entry: ControlEvent
  knownThemes: string[]
  onClose: () => void
  onSave: (theme: string) => Promise<void>
}) {
  const [theme, setTheme] = useState(entry.theme ?? DEFAULT_THEME)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await onSave(theme)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
      setBusy(false)
    }
  }

  return (
    <ModalShell title="Edit theme" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-3 truncate">{entry.eventName}</p>
      <input
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        maxLength={MAX_THEME_LENGTH}
        list="event-control-theme-edit"
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#6b2fa5]/60"
      />
      <datalist id="event-control-theme-edit">
        {knownThemes.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      <div className="flex justify-end gap-2 pt-4">
        <button onClick={onClose} className="text-sm font-semibold text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-100">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] disabled:opacity-50 px-4 py-2 rounded-lg"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
        </button>
      </div>
    </ModalShell>
  )
}
