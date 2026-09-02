import { useCallback, useState } from "react"
import type { DisbursementRow } from "../types"

export function usePendingDisbursementApprovals(onApproved: () => void) {
  const [pending, setPending] = useState<DisbursementRow[]>([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [approveError, setApproveError] = useState<string | null>(null)

  const loadPending = useCallback(async () => {
    setLoadingPending(true)
    try {
      const res = await fetch("/api/v1/admin/disbursements/pending")
      const data = await res.json()
      if (res.ok) setPending(data.disbursements ?? [])
    } finally {
      setLoadingPending(false)
    }
  }, [])

  const approve = useCallback(async (disbursementId: string) => {
    setApproving(disbursementId)
    setApproveError(null)
    try {
      const res = await fetch("/api/v1/admin/disbursements/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disbursementId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to approve")
      await loadPending()
      onApproved()
    } catch (e: any) {
      setApproveError(e.message || "Failed to approve")
    } finally {
      setApproving(null)
    }
  }, [loadPending, onApproved])

  return { pending, loadingPending, loadPending, approving, approveError, approve }
}
