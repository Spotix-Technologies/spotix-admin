import { useCallback, useState } from "react"
import type { RosterAdmin } from "../types"

export function useRoster() {
  const [roster, setRoster] = useState<RosterAdmin[]>([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [rosterLoaded, setRosterLoaded] = useState(false)

  const loadRoster = useCallback(async () => {
    if (rosterLoaded) return
    setLoadingRoster(true)
    try {
      const res = await fetch("/api/v1/onboard")
      const data = await res.json()
      if (res.ok) {
        setRoster(data.admins ?? [])
        setRosterLoaded(true)
      }
    } finally {
      setLoadingRoster(false)
    }
  }, [rosterLoaded])

  return { roster, loadingRoster, loadRoster }
}
