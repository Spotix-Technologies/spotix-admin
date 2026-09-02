import { useCallback, useState } from "react"
import type { Bank, PayoutMethod } from "../types"

export function usePayoutMethods() {
  const [methods, setMethods] = useState<PayoutMethod[]>([])
  const [loadingMethods, setLoadingMethods] = useState(true)
  const [methodsError, setMethodsError] = useState<string | null>(null)

  const [banks, setBanks] = useState<Bank[]>([])

  const loadMethods = useCallback(async () => {
    setLoadingMethods(true)
    setMethodsError(null)
    try {
      const res = await fetch("/api/v1/payments/payout-methods")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load payout methods")
      setMethods(data.methods ?? [])
    } catch (e: any) {
      setMethodsError(e.message || "Failed to load payout methods")
    } finally {
      setLoadingMethods(false)
    }
  }, [])

  const loadBanks = useCallback(async () => {
    if (banks.length > 0) return
    try {
      const res = await fetch("/api/v1/payments/banks")
      const data = await res.json()
      if (res.ok) {
        const seen = new Set<string>()
        setBanks((data.banks ?? []).filter((b: Bank) => (seen.has(b.code) ? false : (seen.add(b.code), true))))
      }
    } catch {}
  }, [banks.length])

  const addMethod = useCallback(async (input: { accountNumber: string; bankCode: string; bankName: string; setPrimary?: boolean }) => {
    const res = await fetch("/api/v1/payments/payout-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to add payout method")
    await loadMethods()
    return data.method as PayoutMethod
  }, [loadMethods])

  const setPrimaryMethod = useCallback(async (methodId: string) => {
    const res = await fetch("/api/v1/payments/payout-methods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methodId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to set primary method")
    await loadMethods()
  }, [loadMethods])

  const deleteMethod = useCallback(async (methodId: string) => {
    const res = await fetch("/api/v1/payments/payout-methods", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methodId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to delete payout method")
    await loadMethods()
  }, [loadMethods])

  return { methods, loadingMethods, methodsError, loadMethods, banks, loadBanks, addMethod, setPrimaryMethod, deleteMethod }
}
