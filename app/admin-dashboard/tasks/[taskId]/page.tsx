import type { Metadata } from "next"
import { TaskDetailClient } from "./task-detail-client"

export const metadata: Metadata = { title: "Task Detail | Spotix Admin Portal" }

export default async function TaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  return <TaskDetailClient taskId={taskId} isAdmin={true} />
}
