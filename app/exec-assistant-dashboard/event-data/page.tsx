import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { EventDataClient } from "./event-data-client"

export const metadata: Metadata = { title: "Event Data | Exec Assistant Dashboard" }

export default async function Page() {
  await getRoleUser("exec-assistant") // auth guard
  return <EventDataClient />
}
