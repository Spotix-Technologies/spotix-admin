import { Suspense } from "react"
import { EventDataClient } from "./event-data-client"
import { requireRoles } from "@/lib/require-admin-page"

export default async function EventDataPage() {
  // Admin, customer-support, and exec-assistant can all manage event data.
  await requireRoles(["admin", "customer-support", "exec-assistant"])
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24">Loading...</div>}>
      <EventDataClient />
    </Suspense>
  )
}
