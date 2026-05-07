import { getRoleUser } from "@/lib/get-role-user"
import DocumentsClient from "./documents-client"

export const metadata = { title: "Documents | Exec Assistant" }

export default async function DocumentsPage() {
  await getRoleUser("exec-assistant") // auth guard
  return <DocumentsClient canWrite={true} />
}
