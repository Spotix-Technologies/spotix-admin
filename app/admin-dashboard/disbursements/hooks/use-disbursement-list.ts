import { useCallback, useState } from "react"
import type { DisbursementRow } from "../types"

export function useDisbursementList() {
  const [disbursements, setDisbursements] = useState<DisbursementRow[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDisbursements = useCallback(async (targetPage = 1) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/admin/disbursements/list?page=${targetPage}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load disbursements")
      setDisbursements(data.disbursements ?? [])
      setPage(data.page ?? 1)
      setTotalPages(data.totalPages ?? 1)
      setTotal(data.total ?? 0)
    } catch (e: any) {
      setError(e.message || "Failed to load disbursements")
    } finally {
      setLoading(false)
    }
  }, [])

  return { disbursements, page, totalPages, total, loading, error, loadDisbursements }
}
