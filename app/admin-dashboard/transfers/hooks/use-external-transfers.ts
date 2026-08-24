import { useCallback, useState } from "react"
import type { ExternalTransferRow } from "../types"

export function useExternalTransfers() {
  const [externalTransfers, setExternalTransfers] = useState<ExternalTransferRow[]>([])
  const [externalPage, setExternalPage] = useState(1)
  const [loadingExternal, setLoadingExternal] = useState(true)
  const [externalError, setExternalError] = useState<string | null>(null)

  const loadExternal = useCallback(async (p: number) => {
    setLoadingExternal(true)
    setExternalError(null)
    try {
      const res = await fetch(`/api/v1/admin/transfer/external?page=${p}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load Paystack withdrawals")
      setExternalTransfers(data.transfers ?? [])
    } catch (e: any) {
      setExternalError(e.message || "Failed to load Paystack withdrawals")
      setExternalTransfers([])
    } finally {
      setLoadingExternal(false)
    }
  }, [])

  return { externalTransfers, externalPage, setExternalPage, loadingExternal, externalError, loadExternal }
}
