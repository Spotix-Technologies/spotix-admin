import { useCallback, useState } from "react"

export function useWithdraw(onWithdrawn: () => void) {
  const [withdrawing, setWithdrawing] = useState<string | null>(null)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  const withdraw = useCallback(async (paymentId: string) => {
    setWithdrawing(paymentId)
    setWithdrawError(null)
    try {
      const res = await fetch("/api/v1/payments/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to withdraw")
      onWithdrawn()
      return true
    } catch (e: any) {
      setWithdrawError(e.message || "Failed to withdraw")
      return false
    } finally {
      setWithdrawing(null)
    }
  }, [onWithdrawn])

  return { withdrawing, withdrawError, withdraw }
}
