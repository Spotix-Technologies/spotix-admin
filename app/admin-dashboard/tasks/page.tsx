import type { Metadata } from "next"
import { TasksAdminClient } from "./tasks-admin-client"

export const metadata: Metadata = {
  title: "Tasks | Spotix Admin Portal",
}

export default function TasksPage() {
  return <TasksAdminClient />
}
