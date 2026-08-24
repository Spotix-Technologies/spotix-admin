import { useCallback, useState } from "react"
import type { TransferRow } from "../types"

export function useTransferList() {
  const [transfers, setTransfers] = useState<TransferRow[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const loadList = useCallback(async (p: number) => {
    setLoadingList(true)
    setListError(null)
    try {
      const res = await fetch(`/api/v1/admin/transfer/list?page=${p}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load transfers")
      setTransfers(data.transfers ?? [])
      setTotalPages(data.totalPages ?? 1)
    } catch (e: any) {
      setListError(e.message || "Failed to load transfers")
      setTransfers([])
    } finally {
      setLoadingList(false)
    }
  }, [])

  return { transfers, page, setPage, totalPages, loadingList, listError, loadList }
}
