"use client"

import { Loader2, Plus } from "lucide-react"
import { KIND_BLURB, KIND_LABEL } from "../constants"
import type { ControlEvent, ControlKind } from "../types"
import { EventControlCard } from "./EventControlCard"

export function ControlsSection({
  kind,
  events,
  limit,
  loading,
  onAdd,
  onRemove,
  onEditTheme,
}: {
  kind: ControlKind
  events: ControlEvent[]
  limit: number
  loading: boolean
  onAdd: () => void
  onRemove: (entry: ControlEvent) => void
  onEditTheme: (entry: ControlEvent) => void
}) {
  const liveCount = events.filter((e) => e.live).length

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            {KIND_LABEL[kind]} <span className="text-slate-400 font-medium">· {liveCount}/{limit} live</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{KIND_BLURB[kind]} Newest {limit} are shown.</p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-3.5 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" /> Add event
        </button>
      </div>

      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
          No {kind} events yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {events.map((e) => (
            <EventControlCard
              key={e.id}
              entry={e}
              onRemove={() => onRemove(e)}
              onEditTheme={kind === "themed" ? () => onEditTheme(e) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}
