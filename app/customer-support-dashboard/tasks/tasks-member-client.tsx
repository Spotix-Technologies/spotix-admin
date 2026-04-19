"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, Loader2, Calendar, Globe, Users, Clock, CheckCircle2, Circle } from "lucide-react"

type TaskStatus = "open" | "in-progress" | "completed"

const DEPT_LABELS: Record<string, string> = {
  "exec-assistant": "Exec Assistant",
  "customer-support": "Customer Support",
  marketing: "Marketing",
  IT: "IT",
}

interface Task {
  id: string
  taskId: string
  name: string
  type: "general" | "dept"
  departments: string[]
  objectives: Array<{ id: string; completed: boolean }>
  deadline: string | null
  status: TaskStatus
  createdAt: string | null
  acknowledgedBy: string[]
}

const STATUS_STYLE: Record<TaskStatus, string> = {
  open: "bg-gray-100 text-gray-600 border-gray-200",
  "in-progress": "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
}

export function TasksMemberClient({
  currentUid,
  currentUsername,
  currentRole,
}: {
  currentUid: string
  currentUsername: string
  currentRole: string
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/tasks")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setTasks(data.tasks || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Tasks</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your assigned and general tasks</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-[#6b2fa5] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={fetchTasks} className="mt-3 text-sm text-red-700 underline">Retry</button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tasks assigned to you yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const done = task.objectives.filter((o) => o.completed).length
            const total = task.objectives.length
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const isAcknowledged = task.acknowledgedBy.includes(currentUid)

            return (
              <div
                key={task.id}
                onClick={() => router.push(`tasks/${task.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-[#6b2fa5]/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm hover:text-[#6b2fa5] transition-colors">{task.name}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[task.status]}`}>
                        {task.status === "in-progress" ? "In Progress" : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                      {!isAcknowledged && task.status !== "completed" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 border border-amber-200">
                          Needs Acknowledgement
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-gray-400">{task.taskId}</p>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-400">
                      {task.type === "general"
                        ? <span className="flex items-center gap-0.5"><Globe className="w-3 h-3" /> General</span>
                        : <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {task.departments.map((d) => DEPT_LABELS[d] || d).join(", ")}</span>
                      }
                      {task.deadline && <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" /> Due {new Date(task.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>}
                    </div>
                    {total > 0 && (
                      <div>
                        <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                          <span>{done}/{total}</span><span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#6b2fa5] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
