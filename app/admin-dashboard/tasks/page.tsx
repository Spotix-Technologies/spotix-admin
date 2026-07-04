import type { Metadata } from "next"
import { TasksAdminClient } from "./tasks-admin-client"
import { requireFullAdmin } from "@/lib/require-admin-page"

export const metadata: Metadata = {
  title: "Tasks | Spotix Admin Portal",
}

export default async function TasksPage() {
  await requireFullAdmin()
  return <TasksAdminClient />
}
