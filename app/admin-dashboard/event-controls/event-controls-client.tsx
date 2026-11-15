"use client"

import { useEffect, useState } from "react"
import { AlertCircle, RefreshCw, SlidersHorizontal, Sparkles, Palette } from "lucide-react"
import { useEventControls } from "./hooks/use-event-controls"
import { AddEventModal } from "./components/AddEventModal"
import { ConfirmRemoveModal } from "./components/ConfirmRemoveModal"
import { ControlsSection } from "./components/ControlsSection"
import { EditThemeModal } from "./components/EditThemeModal"
import { CONTROL_LIMITS } from "./constants"
import type { ControlEvent, ControlKind } from "./types"

/**
 * app/admin-dashboard/event-controls/event-controls-client.tsx
 *
 * Lets full admins curate which events the Spotix user app promotes:
 *   - Featured → landing-page hero carousel + home-page banner (`featuredEvents`)
 *   - Themed   → landing-page themed grid (`themedEvents`)
 */
export function EventControlsClient() {
  const { data, loading, error, load, add, remove, editTheme } = useEventControls()
  const [tab, setTab] = useState<ControlKind>("featured")
  const [adding, setAdding] = useState<ControlKind | null>(null)
  const [removing, setRemoving] = useState<ControlEvent | null>(null)
  const [editing, setEditing] = useState<ControlEvent | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [load])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const limits = data?.limits ?? CONTROL_LIMITS
  const themes = data?.themes ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#6b2fa5]" /> Event Controls
          </h1>
          <p className="text-sm text-slate-400 mt-1">Choose the events promoted on the Spotix landing and home pages.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#6b2fa5] px-3 py-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(["featured", "themed"] as const).map((k) => {
          const Icon = k === "featured" ? Sparkles : Palette
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-md capitalize ${tab === k ? "bg-white text-[#6b2fa5] shadow-sm" : "text-slate-500"}`}
            >
              <Icon className="w-3.5 h-3.5" /> {k}
              {data && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{data[k].length}</span>}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <ControlsSection
        kind={tab}
        events={data?.[tab] ?? []}
        limit={limits[tab]}
        loading={loading}
        onAdd={() => setAdding(tab)}
        onRemove={setRemoving}
        onEditTheme={setEditing}
      />

      {adding && (
        <AddEventModal
          kind={adding}
          knownThemes={themes}
          onClose={() => setAdding(null)}
          onAdd={async (eventId, theme) => {
            await add(adding, eventId, theme)
            flash("Event added")
          }}
        />
      )}

      {removing && (
        <ConfirmRemoveModal
          entry={removing}
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await remove(removing.kind, removing.id)
            flash("Event removed")
          }}
        />
      )}

      {editing && (
        <EditThemeModal
          entry={editing}
          knownThemes={themes}
          onClose={() => setEditing(null)}
          onSave={async (theme) => {
            await editTheme(editing.id, theme)
            flash("Theme updated")
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
