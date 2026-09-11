import { useCallback, useState } from "react"
import type { RequisitionRow } from "../types"

export function useMyRequisitions() {
  const [requisitions, setRequisitions] = useState<RequisitionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRequisitions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/requisitions")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load your requisitions")
      setRequisitions(data.requisitions ?? [])
    } catch (e: any) {
      setError(e.message || "Failed to load your requisitions")
    } finally {
      setLoading(false)
    }
  }, [])

  return { requisitions, loading, error, loadRequisitions }
}
