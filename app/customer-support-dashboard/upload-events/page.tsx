import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { UploadEventsClient } from "./upload-events-client"

export const metadata: Metadata = { title: "Upload Events | Customer Support Dashboard" }

export default async function Page() {
  await getRoleUser("customer-support") // auth guard
  return <UploadEventsClient />
}
