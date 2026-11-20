"use client"

import { AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { useEditHistory } from "./use-edit-history"
import type { HistoryChange, HistoryEntry, HistoryValue } from "./types"
import { actionLabel, actorLabel, actorTone, isPlainObject, scalarValue, timeAgo, titleCase } from "./format"

const TIER_FIELDS = ["policy", "description", "price", "availableTickets"]

function BeforeAfter({ before, after, field }: { before: HistoryValue; after: HistoryValue; field?: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="break-words text-slate-400">
        <span className="mr-2 text-[10px] uppercase tracking-wide">Before</span>
        {scalarValue(before, field)}
      </div>
      <div className="break-words text-slate-900">
        <span className="mr-2 text-[10px] uppercase tracking-wide text-emerald-700">After</span>
        {scalarValue(after, field)}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[9rem_1fr] sm:gap-2">
      <span className="font-medium text-slate-600">{label}</span>
      {children}
    </div>
  )
}

function TicketPricesDiff({ before, after }: { before: HistoryValue; after: HistoryValue }) {
  const oldTiers = Array.isArray(before) ? before : []
  const newTiers = Array.isArray(after) ? after : []
  const count = Math.max(oldTiers.length, newTiers.length)
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, index) => {
        const oldTier = oldTiers[index] as Record<string, unknown> | undefined
        const newTier = newTiers[index] as Record<string, unknown> | undefined
        const changed = TIER_FIELDS.filter((f) => JSON.stringify(oldTier?.[f] ?? null) !== JSON.stringify(newTier?.[f] ?? null))
        if (!changed.length) return null
        const tag = !oldTier ? "added" : !newTier ? "removed" : null
        return (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ticket tier {index + 1}
              {tag && <span className="ml-2 normal-case text-[#6b2fa5]">({tag})</span>}
            </p>
            <div className="space-y-2">
              {changed.map((f) => (
                <Row key={f} label={titleCase(f)}>
                  <BeforeAfter before={oldTier?.[f]} after={newTier?.[f]} field={f} />
                </Row>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ObjectDiff({ field, change }: { field: string; change: HistoryChange }) {
  const before = isPlainObject(change.before) ? change.before : null
  const after = isPlainObject(change.after) ? change.after : null
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]))
  const created = !before && after
  const removed = before && !after
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {titleCase(field)}
        {created && <span className="ml-2 normal-case text-emerald-700">(created)</span>}
        {removed && <span className="ml-2 normal-case text-red-600">(removed)</span>}
      </p>
      <div className="space-y-2">
        {keys.map((k) => {
          const b = before?.[k]
          const a = after?.[k]
          if (!created && !removed && JSON.stringify(b ?? null) === JSON.stringify(a ?? null)) return null
          return (
            <Row key={k} label={titleCase(k)}>
              {created ? (
                <span className="break-words text-slate-900">{scalarValue(a, k)}</span>
              ) : removed ? (
                <span className="break-words text-slate-500">{scalarValue(b, k)}</span>
              ) : (
                <BeforeAfter before={b} after={a} field={k} />
              )}
            </Row>
          )
        })}
      </div>
    </div>
  )
}

function ChangeDetails({ field, change }: { field: string; change: HistoryChange }) {
  if (field === "ticketPrices" && (Array.isArray(change.before) || Array.isArray(change.after))) {
    return <TicketPricesDiff before={change.before} after={change.after} />
  }
  if (isPlainObject(change.before) || isPlainObject(change.after)) return <ObjectDiff field={field} change={change} />
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <Row label={titleCase(field)}>
        <BeforeAfter before={change.before} after={change.after} field={field} />
      </Row>
    </div>
  )
}

function EntryCard({ entry }: { entry: HistoryEntry }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-900">{actionLabel(entry.action)}</h3>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${actorTone(entry.actor)}`}>{actorLabel(entry.actor)}</span>
        </div>
        <time className="text-xs text-slate-400" title={entry.createdAt ? new Date(entry.createdAt).toLocaleString() : undefined}>
          {timeAgo(entry.createdAt)}
        </time>
      </div>
      {entry.summary && <p className="mt-1 text-sm text-slate-500">{entry.summary}</p>}
      {entry.reason && (
        <p className="mt-2 text-sm leading-6 text-slate-600">
          <span className="font-medium text-slate-700">Reason:</span> {entry.reason}
        </p>
      )}
      <div className="mt-3 space-y-2">
        {Object.entries(entry.changes || {}).map(([field, change]) => (
          <ChangeDetails key={field} field={field} change={change} />
        ))}
      </div>
    </article>
  )
}

export default function EditHistoryPanel({ eventId }: { eventId: string }) {
  const { entries, loading, loadingMore, error, partial, hasMore, refresh, loadMore } = useEditHistory(eventId)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Edit history</h2>
          <p className="text-sm text-slate-500">Everything the organizer, their teammates, and Spotix staff changed on this event.</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          aria-label="Refresh edit history"
          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {partial && !loading && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          Organizer and teammate edits couldn’t be loaded right now, so only admin edits are shown. Try refreshing.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10 text-[#6b2fa5]">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : error && entries.length === 0 ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>
      ) : entries.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No edits have been recorded for this event yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Load older edits"}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
