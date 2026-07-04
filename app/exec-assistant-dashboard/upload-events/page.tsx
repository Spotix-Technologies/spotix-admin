import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import { UploadEventsClient } from "./upload-events-client"

export const metadata: Metadata = { title: "Upload Events | Exec Assistant Dashboard" }

export default async function Page() {
  await getRoleUser("exec-assistant") // auth guard
  return <UploadEventsClient />
}
