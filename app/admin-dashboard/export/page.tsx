import { UnderDevelopment } from "../components/under-development"
import { requireFullAdmin } from "@/lib/require-admin-page"

export default async function ExportPage() {
  await requireFullAdmin()
  return <UnderDevelopment pageName="Export" />
}
