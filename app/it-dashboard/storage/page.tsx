import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import StorageClient from "@/components/storage/storage-client"

export const metadata: Metadata = { title: "Storage | IT Dashboard" }

export default async function Page() {
  await getRoleUser("IT") // auth guard
  return <StorageClient />
}
