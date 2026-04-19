import { Suspense } from "react"
import { EventDataClient } from "./event-data-client"

export default function EventDataPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24">Loading...</div>}>
      <EventDataClient />
    </Suspense>
  )
}
