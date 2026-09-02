import { useCallback, useState } from "react"

interface CreateDisbursementInput {
  type: "member" | "department"
  recipientUids?: string[]
  department?: string
  amount: number
  reason: string
}

export function useCreateDisbursement(onCreated: () => void) {
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createMessage, setCreateMessage] = useState<string | null>(null)

  const createDisbursement = useCallback(async (input: CreateDisbursementInput) => {
    setCreating(true)
    setCreateError(null)
    setCreateMessage(null)
    try {
      const res = await fetch("/api/v1/admin/disbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create disbursement")
      setCreateMessage(data.message || "Disbursement created")
      onCreated()
      return true
    } catch (e: any) {
      setCreateError(e.message || "Failed to create disbursement")
      return false
    } finally {
      setCreating(false)
    }
  }, [onCreated])

  return { creating, createError, createMessage, createDisbursement, resetCreateState: () => { setCreateError(null); setCreateMessage(null) } }
}
