import { useCallback, useState } from "react"

export function useBalance() {
  const [balances, setBalances] = useState<{ currency: string; balance: number }[] | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  const loadBalance = useCallback(async () => {
    setBalanceError(null)
    try {
      const res = await fetch("/api/v1/admin/transfer/balance")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load balance")
      setBalances(data.balances)
    } catch (e: any) {
      setBalanceError(e.message || "Failed to load balance")
    }
  }, [])

  return { balances, balanceError, loadBalance }
}
