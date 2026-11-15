import { requireRoles } from "@/lib/require-admin-page"
import { EventControlsClient } from "./event-controls-client"

export default async function EventControlsPage() {
  await requireRoles(["admin"])
  return <EventControlsClient />
}
