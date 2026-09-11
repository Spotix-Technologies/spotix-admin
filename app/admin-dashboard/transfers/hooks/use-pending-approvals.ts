import { useCallback, useState } from "react"
import type { TransferRow } from "../types"

export function usePendingApprovals(onApproved: () => void) {
  const [pending, setPending] = useState<TransferRow[]>([])
  const [pendingError, setPendingError] = useState<string | null>(null)
  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)

  const loadPending = useCallback(async () => {
    setPendingError(null)
    try {
      const res = await fetch("/api/v1/admin/transfer/pending")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load pending approvals")
      setPending(data.transfers ?? [])
    } catch (e: any) {
      setPendingError(e.message || "Failed to load pending approvals")
    }
  }, [])

  const approve = useCallback(async (transferId: string, ottaKey?: string) => {
    setApproving(transferId)
    try {
      const res = await fetch("/api/v1/admin/transfer/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId, ottaKey: ottaKey?.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onApproved()
    } catch (e: any) {
      alert(e.message || "Failed to approve")
    } finally {
      setApproving(null)
    }
  }, [onApproved])

  const reject = useCallback(async (transferId: string, reason: string) => {
    setRejecting(transferId)
    try {
      const res = await fetch("/api/v1/admin/transfer/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId, reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onApproved()
      return true
    } catch (e: any) {
      alert(e.message || "Failed to reject")
      return false
    } finally {
      setRejecting(null)
    }
  }, [onApproved])

  return { pending, pendingError, approving, rejecting, loadPending, approve, reject }
}
