import { useCallback, useState } from "react"
import type { RequisitionRow } from "@/components/requisition/types"

export function useRequisitionList() {
  const [requisitions, setRequisitions] = useState<RequisitionRow[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRequisitions = useCallback(async (targetPage = 1) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/admin/requisitions/list?page=${targetPage}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load requisitions")
      setRequisitions(data.requisitions ?? [])
      setPage(data.page ?? 1)
      setTotalPages(data.totalPages ?? 1)
      setTotal(data.total ?? 0)
    } catch (e: any) {
      setError(e.message || "Failed to load requisitions")
    } finally {
      setLoading(false)
    }
  }, [])

  return { requisitions, page, totalPages, total, loading, error, loadRequisitions }
}
