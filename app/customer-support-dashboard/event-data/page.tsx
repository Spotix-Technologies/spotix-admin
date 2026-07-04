import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { EventDataClient } from "./event-data-client"

export const metadata: Metadata = { title: "Event Data | Customer Support Dashboard" }

export default async function Page() {
  await getRoleUser("customer-support") // auth guard
  return <EventDataClient />
}
