import { useCallback, useState } from "react"
import type { PaymentRow } from "../types"

export function usePayments() {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPayments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/payments")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load payments")
      setPayments(data.payments ?? [])
    } catch (e: any) {
      setError(e.message || "Failed to load payments")
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { payments, loading, error, loadPayments }
}
