"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { HistoryEntry } from "./types"

const PAGE_SIZE = 25

/** Loads an event's edit history for admins (Supabase + legacy admin edits), newest first. */
export function useEditHistory(eventId: string) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [partial, setPartial] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const fetchPage = useCallback(
    async (before: string | null) => {
      const qs = new URLSearchParams({ action: "getEditHistory", eventId, limit: String(PAGE_SIZE) })
      if (before) qs.set("before", before)
      const res = await fetch(`/api/v1/event-data?${qs}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to load edit history")
      return json as { entries: HistoryEntry[]; nextCursor: string | null; partial?: boolean }
    },
    [eventId],
  )

  const refresh = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const page = await fetchPage(null)
      if (id !== requestId.current) return
      setEntries(page.entries)
      setCursor(page.nextCursor)
      setPartial(Boolean(page.partial))
    } catch (e) {
      if (id === requestId.current) setError(e instanceof Error ? e.message : "Failed to load edit history")
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await fetchPage(cursor)
      setEntries((prev) => [...prev, ...page.entries])
      setCursor(page.nextCursor)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more")
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, fetchPage, loadingMore])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { entries, loading, loadingMore, error, partial, hasMore: Boolean(cursor), refresh, loadMore }
}
