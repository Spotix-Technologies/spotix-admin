"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { KIND_LABEL } from "../constants"
import type { ControlEvent } from "../types"
import { ModalShell } from "./ModalShell"

export function ConfirmRemoveModal({
  entry,
  onClose,
  onConfirm,
}: {
  entry: ControlEvent
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove")
      setBusy(false)
    }
  }

  return (
    <ModalShell title="Remove event?" onClose={onClose}>
      <p className="text-sm text-slate-600">
        <span className="font-semibold">{entry.eventName}</span> will be taken out of{" "}
        {KIND_LABEL[entry.kind].toLowerCase()} on the user app. The event itself is not affected.
      </p>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      <div className="flex justify-end gap-2 pt-4">
        <button onClick={onClose} className="text-sm font-semibold text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-100">
          Cancel
        </button>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Remove
        </button>
      </div>
    </ModalShell>
  )
}
