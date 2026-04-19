"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Trash2, Pencil, ClipboardList, Loader2, X,
  Calendar, Users, Globe, Check,
  Clock, CheckCircle2, Circle,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────
type TaskType = "general" | "dept"
type TaskStatus = "open" | "in-progress" | "completed"
type DeptName = "exec-assistant" | "customer-support" | "marketing" | "IT"

const DEPT_LABELS: Record<DeptName, string> = {
  "exec-assistant":   "Exec Assistant",
  "customer-support": "Customer Support",
  "marketing":        "Marketing",
  "IT":               "IT",
}
const ALL_DEPTS = Object.keys(DEPT_LABELS) as DeptName[]

interface Objective {
  id: string
  text: string
  mentions: string[]
  requiresAttachment: boolean
  attachmentType: "image" | "video" | "pdf" | "link" | null
  completed: boolean
}

interface Task {
  id: string
  taskId: string
  name: string
  type: TaskType
  departments: DeptName[]
  objectives: Objective[]
  deadline: string | null
  status: TaskStatus
  createdAt: string | null
  createdBy: string
  acknowledgedBy: string[]
}

// ─── Status pill ─────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<TaskStatus, string> = {
  open:        "bg-gray-100 text-gray-600 border-gray-200",
  "in-progress":"bg-blue-100 text-blue-700 border-blue-200",
  completed:   "bg-green-100 text-green-700 border-green-200",
}
const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  open:         <Circle className="w-3 h-3" />,
  "in-progress":<Clock className="w-3 h-3" />,
  completed:    <CheckCircle2 className="w-3 h-3" />,
}

// ─── Mention input ────────────────────────────────────────────────────────────
interface MentionInputProps {
  value: string
  onChange: (v: string) => void
  members: { uid: string; username: string }[]
  placeholder?: string
  className?: string
}

function MentionInput({ value, onChange, members, placeholder, className }: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    onChange(v)
    const lastAt = v.lastIndexOf("@")
    if (lastAt !== -1 && lastAt === v.length - 1) {
      setSearch("")
      setShowDropdown(true)
    } else if (lastAt !== -1 && v.slice(lastAt).match(/^@\w*$/)) {
      setSearch(v.slice(lastAt + 1))
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
  }

  const insertMention = (username: string) => {
    const lastAt = value.lastIndexOf("@")
    const newVal = value.slice(0, lastAt) + `@${username} `
    onChange(newVal)
    setShowDropdown(false)
    ref.current?.focus()
  }

  const filtered = members.filter((m) =>
    m.username.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 6)

  return (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 ${className || ""}`}
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {filtered.map((m) => (
            <button
              key={m.uid}
              type="button"
              onClick={() => insertMention(m.username)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[#6b2fa5]/5 text-gray-700"
            >
              @{m.username}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Objective builder row ────────────────────────────────────────────────────
interface ObjRow {
  id: string
  text: string
  requiresAttachment: boolean
  attachmentType: "image" | "video" | "pdf" | "link" | null
}

interface ObjectiveRowProps {
  obj: ObjRow
  index: number
  members: { uid: string; username: string }[]
  onChange: (id: string, field: keyof ObjRow, value: any) => void
  onRemove: (id: string) => void
}

function ObjectiveRow({ obj, index, members, onChange, onRemove }: ObjectiveRowProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 w-5 flex-shrink-0">{index + 1}.</span>
        <MentionInput
          value={obj.text}
          onChange={(v) => onChange(obj.id, "text", v)}
          members={members}
          placeholder="Objective… use @ to mention"
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => onRemove(obj.id)}
          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Attachment toggle */}
      <div className="flex items-center gap-3 pl-7">
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
          <div
            onClick={() => onChange(obj.id, "requiresAttachment", !obj.requiresAttachment)}
            className={`w-8 h-4 rounded-full relative transition-colors ${obj.requiresAttachment ? "bg-[#6b2fa5]" : "bg-gray-300"}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${obj.requiresAttachment ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
          Requires attachment
        </label>
        {obj.requiresAttachment && (
          <select
            value={obj.attachmentType || ""}
            onChange={(e) => onChange(obj.id, "attachmentType", e.target.value || null)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#6b2fa5]/30 bg-white"
          >
            <option value="">Select type</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="pdf">PDF</option>
            <option value="link">Link</option>
          </select>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TasksAdminClient() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [taskType, setTaskType] = useState<TaskType | null>(null)
  const [taskName, setTaskName] = useState("")
  const [selectedDepts, setSelectedDepts] = useState<DeptName[]>([])
  const [objectives, setObjectives] = useState<ObjRow[]>([])
  const [deadline, setDeadline] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Members for mention (all admins fetched from onboard list)
  const [members, setMembers] = useState<{ uid: string; username: string }[]>([])

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/tasks")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load tasks")
      setTasks(data.tasks || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/onboard")
      const data = await res.json()
      if (res.ok) setMembers((data.admins || []).map((a: any) => ({ uid: a.uid, username: a.username })))
    } catch {}
  }, [])

  useEffect(() => { fetchTasks(); fetchMembers() }, [fetchTasks, fetchMembers])

  // Objective helpers
  const addObjective = () => {
    setObjectives((prev) => [...prev, {
      id: `obj-${Date.now()}`,
      text: "",
      requiresAttachment: false,
      attachmentType: null,
    }])
  }

  const updateObjective = (id: string, field: keyof ObjRow, value: any) => {
    setObjectives((prev) => prev.map((o) => o.id === id ? { ...o, [field]: value } : o))
  }

  const removeObjective = (id: string) => {
    setObjectives((prev) => prev.filter((o) => o.id !== id))
  }

  const resetCreate = () => {
    setTaskType(null)
    setTaskName("")
    setSelectedDepts([])
    setObjectives([])
    setDeadline("")
    setCreateError(null)
  }

  const handleCreate = async () => {
    if (!taskName.trim()) { setCreateError("Task name is required"); return }
    if (!taskType) { setCreateError("Select a task type"); return }
    if (taskType === "dept" && selectedDepts.length === 0) { setCreateError("Select at least one department"); return }

    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        taskName.trim(),
          type:        taskType,
          departments: taskType === "dept" ? selectedDepts : [],
          objectives:  objectives.map((o) => ({
            text:               o.text,
            requiresAttachment: o.requiresAttachment,
            attachmentType:     o.attachmentType,
            mentions:           [],
          })),
          deadline: deadline || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create task")
      setShowCreate(false)
      resetCreate()
      await fetchTasks()
    } catch (e: any) {
      setCreateError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (taskId: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete")
      setConfirmDelete(null)
      await fetchTasks()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const deptMembersFor = (depts: DeptName[]) => {
    // For mentions: return all members for general, or just fetch all for simplicity
    return members
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage team tasks</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); resetCreate() }}
          className="flex items-center gap-2 px-4 py-2 bg-[#6b2fa5] text-white rounded-lg text-sm font-medium hover:bg-[#5a2690] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-[#6b2fa5] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={fetchTasks} className="mt-3 text-sm text-red-700 underline">Retry</button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No tasks yet. Create the first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const done = task.objectives.filter((o) => o.completed).length
            const total = task.objectives.length
            const pct = total > 0 ? Math.round((done / total) * 100) : 0

            return (
              <div
                key={task.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-[#6b2fa5]/30 transition-colors cursor-pointer group"
                onClick={() => router.push(`/admin-dashboard/tasks/${task.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm group-hover:text-[#6b2fa5] transition-colors">
                        {task.name}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[task.status]}`}>
                        {STATUS_ICON[task.status]}
                        {task.status === "in-progress" ? "In Progress" : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                      {task.type === "general" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-violet-100 text-violet-700 border border-violet-200">
                          <Globe className="w-3 h-3" /> General
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 border border-orange-200">
                          <Users className="w-3 h-3" /> Dept
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 mt-1 font-mono">{task.taskId}</p>

                    {task.type === "dept" && task.departments.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {task.departments.map((d) => (
                          <span key={d} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full border border-gray-200">
                            {DEPT_LABELS[d]}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Progress */}
                    {total > 0 && (
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-400">{done}/{total} objectives</span>
                          <span className="text-[10px] text-gray-400">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#6b2fa5] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {task.deadline && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/admin-dashboard/tasks/${task.id}`)}
                      className="p-2 text-gray-400 hover:text-[#6b2fa5] hover:bg-[#6b2fa5]/5 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(task.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create Modal ────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Create New Task</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Step 1: Type */}
              {!taskType ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Select Task Type</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTaskType("general")}
                      className="flex flex-col items-center gap-3 p-5 border-2 border-gray-200 rounded-xl hover:border-[#6b2fa5] hover:bg-[#6b2fa5]/5 transition-colors group"
                    >
                      <Globe className="w-8 h-8 text-gray-400 group-hover:text-[#6b2fa5]" />
                      <div className="text-center">
                        <p className="font-semibold text-sm text-gray-900">General Task</p>
                        <p className="text-xs text-gray-500 mt-0.5">Visible to all admins</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setTaskType("dept")}
                      className="flex flex-col items-center gap-3 p-5 border-2 border-gray-200 rounded-xl hover:border-[#6b2fa5] hover:bg-[#6b2fa5]/5 transition-colors group"
                    >
                      <Users className="w-8 h-8 text-gray-400 group-hover:text-[#6b2fa5]" />
                      <div className="text-center">
                        <p className="font-semibold text-sm text-gray-900">Dept Task</p>
                        <p className="text-xs text-gray-500 mt-0.5">Specific departments</p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Type badge + change */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {taskType === "general"
                        ? <span className="flex items-center gap-1 text-xs bg-violet-100 text-violet-700 border border-violet-200 px-2 py-1 rounded-full"><Globe className="w-3 h-3" /> General Task</span>
                        : <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 rounded-full"><Users className="w-3 h-3" /> Dept Task</span>
                      }
                    </div>
                    <button onClick={() => setTaskType(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">Change</button>
                  </div>

                  {/* Dept selection */}
                  {taskType === "dept" && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Departments</p>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_DEPTS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setSelectedDepts((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${selectedDepts.includes(d) ? "border-[#6b2fa5] bg-[#6b2fa5]/10 text-[#6b2fa5]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedDepts.includes(d) ? "bg-[#6b2fa5] border-[#6b2fa5]" : "border-gray-300"}`}>
                              {selectedDepts.includes(d) && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            {DEPT_LABELS[d]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Task name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Task Name</label>
                    <input
                      type="text"
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      placeholder="e.g. Update onboarding docs"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30"
                    />
                  </div>

                  {/* Objectives */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Objectives</label>
                      <span className="text-xs text-gray-400">{objectives.length} added</span>
                    </div>
                    <div className="space-y-2">
                      {objectives.map((obj, i) => (
                        <ObjectiveRow
                          key={obj.id}
                          obj={obj}
                          index={i}
                          members={members}
                          onChange={updateObjective}
                          onRemove={removeObjective}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addObjective}
                      className="mt-2 w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-[#6b2fa5] hover:text-[#6b2fa5] hover:bg-[#6b2fa5]/5 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Objective
                    </button>
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Deadline <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30"
                    />
                  </div>

                  {createError && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{createError}</p>
                  )}

                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="w-full py-2.5 bg-[#6b2fa5] text-white rounded-lg font-medium text-sm hover:bg-[#5a2690] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Task"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ─────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Delete Task</h3>
            <p className="text-sm text-gray-600 mb-6">This will permanently delete the task and all its messages. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
