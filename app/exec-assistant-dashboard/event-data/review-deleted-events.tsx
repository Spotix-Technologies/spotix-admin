"use client"

import { useState, useEffect } from "react"
import { RotateCcw, Trash2, Clock, User, AlertTriangle, X, CheckCircle, RefreshCw } from "lucide-react"

interface DeletedEvent {
  eventId: string
  eventName: string
  eventImage: string
  organizerId: string
  status: string
  deletedAt: string
  deletedBy: { adminUid: string; adminUsername: string }
  deletionReason: string
}

export default function ReviewDeletedEvents() {
  const [events, setEvents] = useState<DeletedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<DeletedEvent | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchDeleted = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/event-data/deleted")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to fetch")
      setEvents(json.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load deleted events")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDeleted() }, [])

  const handleRestore = async (event: DeletedEvent) => {
    setRestoring(event.eventId)
    try {
      /* Admin identity is read by the API from middleware headers —
         no need to pass uid/email from the client */
      const res = await fetch("/api/v1/event-data/deleted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.eventId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to restore")
      setEvents((prev) => prev.filter((e) => e.eventId !== event.eventId))
      setConfirmRestore(null)
      showToast(`"${event.eventName}" restored successfully`, "success")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Restore failed", "error")
    } finally {
      setRestoring(null)
    }
  }

  const fmt = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) }
    catch { return d }
  }

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-600"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-red-400" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Deleted Events</h2>
            <p className="text-sm text-slate-500">Removed from Spotix — restorable by an admin.</p>
          </div>
        </div>
        <button
          onClick={fetchDeleted}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg bg-white transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 space-y-3 bg-white border border-slate-200 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-slate-600 font-medium text-sm">No deleted events</p>
          <p className="text-slate-400 text-xs">All events are currently active.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 font-medium">{events.length} deleted event{events.length !== 1 ? "s" : ""}</p>
          {events.map((event) => (
            <div key={event.eventId} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
              <div className="flex items-start gap-4 p-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  {event.eventImage ? (
                    <img src={event.eventImage} alt={event.eventName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🎪</div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <h3 className="font-semibold text-sm text-slate-800 truncate">{event.eventName}</h3>
                  <p className="text-xs text-slate-400 font-mono truncate">{event.eventId}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {fmt(event.deletedAt)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      {event.deletedBy?.adminUsername || event.deletedBy?.adminUid || "Unknown admin"}
                    </span>
                  </div>
                  {event.deletionReason && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 rounded-md px-2.5 py-1.5 border border-slate-100">
                      "{event.deletionReason}"
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setConfirmRestore(event)}
                  disabled={restoring === event.eventId}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${restoring === event.eventId ? "animate-spin" : ""}`} />
                  {restoring === event.eventId ? "Restoring…" : "Restore"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm restore modal */}
      {confirmRestore && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ isolation: "isolate" }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmRestore(null)} />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-emerald-100 bg-emerald-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-base text-emerald-700">Restore this event?</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    <strong className="text-slate-700">"{confirmRestore.eventName}"</strong> will be moved back to the live events collection.
                  </p>
                </div>
                <button onClick={() => setConfirmRestore(null)} className="text-slate-400 hover:text-slate-600 mt-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                The event will be restored with its original status. The organizer will regain full access immediately.
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 pb-6">
              <button
                onClick={() => setConfirmRestore(null)}
                disabled={restoring === confirmRestore.eventId}
                className="px-4 py-2 text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(confirmRestore)}
                disabled={restoring === confirmRestore.eventId}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${restoring === confirmRestore.eventId ? "animate-spin" : ""}`} />
                {restoring === confirmRestore.eventId ? "Restoring…" : "Confirm Restore"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}