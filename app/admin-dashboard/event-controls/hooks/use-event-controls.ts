import { useCallback, useState } from "react"
import type { ControlEvent, ControlKind, ControlsPayload } from "../types"

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Request failed")
  return data as T
}

const jsonInit = (method: string, body: object): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

export function useEventControls() {
  const [data, setData] = useState<ControlsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await request<ControlsPayload>("/api/v1/event-controls"))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  /** Adding changes which entries are inside the live limit, so re-pull the list. */
  const add = useCallback(
    async (kind: ControlKind, eventId: string, theme?: string) => {
      const { entry } = await request<{ entry: ControlEvent }>("/api/v1/event-controls", jsonInit("POST", { kind, eventId, theme }))
      await load()
      return entry
    },
    [load],
  )

  const remove = useCallback(
    async (kind: ControlKind, id: string) => {
      await request(`/api/v1/event-controls?kind=${kind}&id=${encodeURIComponent(id)}`, { method: "DELETE" })
      await load()
    },
    [load],
  )

  const editTheme = useCallback(
    async (id: string, theme: string) => {
      const res = await request<{ theme: string }>("/api/v1/event-controls", jsonInit("PATCH", { id, theme }))
      setData((d) => d && { ...d, themed: d.themed.map((e) => (e.id === id ? { ...e, theme: res.theme } : e)) })
    },
    [],
  )

  return { data, loading, error, load, add, remove, editTheme }
}
