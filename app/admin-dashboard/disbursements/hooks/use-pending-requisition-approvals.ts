import { useCallback, useState } from "react"
import type { RequisitionRow } from "@/components/requisition/types"

export function usePendingRequisitionApprovals(onApproved: () => void) {
  const [pending, setPending] = useState<RequisitionRow[]>([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [approveError, setApproveError] = useState<string | null>(null)

  const loadPending = useCallback(async () => {
    setLoadingPending(true)
    try {
      const res = await fetch("/api/v1/admin/requisitions/pending")
      const data = await res.json()
      if (res.ok) setPending(data.requisitions ?? [])
    } finally {
      setLoadingPending(false)
    }
  }, [])

  const approve = useCallback(async (requisitionId: string) => {
    setApproving(requisitionId)
    setApproveError(null)
    try {
      const res = await fetch("/api/v1/admin/requisitions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requisitionId }),
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

  const reject = useCallback(async (requisitionId: string, reason: string) => {
    setRejecting(requisitionId)
    setApproveError(null)
    try {
      const res = await fetch("/api/v1/admin/requisitions/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requisitionId, reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to reject")
      await loadPending()
      onApproved()
      return true
    } catch (e: any) {
      setApproveError(e.message || "Failed to reject")
      return false
    } finally {
      setRejecting(null)
    }
  }, [loadPending, onApproved])

  return { pending, loadingPending, loadPending, approving, rejecting, approveError, approve, reject }
}
