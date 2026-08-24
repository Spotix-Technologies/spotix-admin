import { useEffect, useRef } from "react"

/**
 * Opens an SSE connection to /api/v1/admin/transfer/stream and calls
 * `onChange` whenever a row in admin_transfers changes (insert or
 * update) — e.g. a webhook flipping a transfer to successful/failed,
 * or another admin approving. Debounced slightly since a single
 * transfer resolving can fire more than one change in quick succession.
 *
 * Reconnects automatically if the connection drops (EventSource's
 * default behavior); no reconnect logic needed here.
 */
export function useRealtimeTransfers(onChange: () => void) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange // always call the latest closure, even though the SSE subscription itself never re-runs

  useEffect(() => {
    const source = new EventSource("/api/v1/admin/transfer/stream")

    source.addEventListener("transfer-change", () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => onChangeRef.current(), 300)
    })

    source.onerror = () => {
      // EventSource retries on its own; nothing to do here beyond not
      // letting a transient error bubble up as an unhandled event.
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      source.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
