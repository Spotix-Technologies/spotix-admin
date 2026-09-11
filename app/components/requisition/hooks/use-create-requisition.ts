import { useCallback, useState } from "react"

interface CreateRequisitionInput {
  amount: number
  reason: string
}

export function useCreateRequisition(onCreated: () => void) {
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createMessage, setCreateMessage] = useState<string | null>(null)

  const createRequisition = useCallback(async (input: CreateRequisitionInput) => {
    setCreating(true)
    setCreateError(null)
    setCreateMessage(null)
    try {
      const res = await fetch("/api/v1/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit requisition")
      setCreateMessage(data.message || "Requisition submitted")
      onCreated()
      return true
    } catch (e: any) {
      setCreateError(e.message || "Failed to submit requisition")
      return false
    } finally {
      setCreating(false)
    }
  }, [onCreated])

  return { creating, createError, createMessage, createRequisition, resetCreateState: () => { setCreateError(null); setCreateMessage(null) } }
}
