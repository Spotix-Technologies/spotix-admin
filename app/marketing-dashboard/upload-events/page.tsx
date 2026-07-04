import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { UploadEventsClient } from "./upload-events-client"

export const metadata: Metadata = { title: "Upload Events | Marketing Dashboard" }

export default async function Page() {
  await getRoleUser("marketing") // auth guard
  return <UploadEventsClient />
}
