import type { Metadata } from "next"
import { getRoleUser } from "@/lib/get-role-user"
import StorageClient from "@/components/storage/storage-client"

export const metadata: Metadata = { title: "Storage | Customer Support Dashboard" }

export default async function Page() {
  await getRoleUser("customer-support") // auth guard
  return <StorageClient />
}
