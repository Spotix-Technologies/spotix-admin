"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, CheckCircle2, Circle, Loader2, Paperclip,
  Send, Globe, Users, Calendar, Clock, AlertCircle,
  CheckCheck, ImageIcon, FileText, Video, Link2,
  Upload, X, RefreshCw, BarChart2,
} from "lucide-react"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase-client"

// ─── Types ────────────────────────────────────────────────────────────────────
type TaskStatus = "open" | "in-progress" | "completed"
type AttachType = "image" | "video" | "pdf" | "link"

interface Objective {
  id: string
  text: string
  mentions: string[]
  requiresAttachment: boolean
  attachmentType: AttachType | null
  completed: boolean
  completedBy: string | null
  completedAt: string | null
  attachmentUrl: string | null
}

interface Task {
  id: string
  taskId: string
  name: string
  type: "general" | "dept"
  departments: string[]
  objectives: Objective[]
  deadline: string | null
  status: TaskStatus
  createdAt: string | null
  createdBy: string
  acknowledgedBy: string[]
}

interface Message {
  id: string
  text: string
  authorId: string
  authorName: string
  mentions: string[]
  taskRef: string | null
  replyTo: string | null
  createdAt: string | null
}

interface Member {
  uid: string
  username: string
  fullName: string
  role: string
}

const DEPT_LABELS: Record<string, string> = {
  "exec-assistant":   "Exec Assistant",
  "customer-support": "Customer Support",
  "marketing":        "Marketing",
  "IT":               "IT",
}

const ATTACH_ICON: Record<AttachType, React.ReactNode> = {
  image: <ImageIcon className="w-4 h-4" />,
  video: <Video      className="w-4 h-4" />,
  pdf:   <FileText   className="w-4 h-4" />,
  link:  <Link2      className="w-4 h-4" />,
}

const STATUS_STYLE: Record<TaskStatus, string> = {
  open:          "bg-gray-100 text-gray-600 border-gray-200",
  "in-progress": "bg-blue-100 text-blue-700 border-blue-200",
  completed:     "bg-green-100 text-green-700 border-green-200",
}

// ─── Attachment upload ────────────────────────────────────────────────────────
async function uploadAttachment(file: File, taskId: string, objId: string): Promise<string> {
  const path = `admin/tasks/${taskId}/${objId}/${Date.now()}_${file.name}`
  const sRef = storageRef(storage, path)
  await uploadBytes(sRef, file)
  return getDownloadURL(sRef)
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  msg,
  currentUid,
  onReply,
  allMessages,
}: {
  msg: Message
  currentUid: string
  onReply: (m: Message) => void
  allMessages: Message[]
}) {
  const isOwn    = msg.authorId === currentUid
  const replyMsg = msg.replyTo ? allMessages.find((m) => m.id === msg.replyTo) : null

  const renderText = (text: string) => {
    const parts = text.split(/(@\w+|\*sptx-tsk-\S+)/g)
    return parts.map((part, i) => {
      if (part.startsWith("@"))
        return <span key={i} className={isOwn ? "text-purple-200 font-medium" : "text-[#6b2fa5] font-medium"}>{part}</span>
      if (part.startsWith("*sptx-tsk-"))
        return <span key={i} className={isOwn ? "text-blue-200 font-medium underline" : "text-blue-600 font-medium underline"}>{part.slice(1)}</span>
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div className={`flex w-full ${isOwn ? "justify-end" : "justify-start"} group`}>
      <div className={`flex flex-col gap-1 max-w-[78%] ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && (
          <span className="text-xs text-gray-400 px-1 select-none">{msg.authorName}</span>
        )}
        {replyMsg && (
          <div className="text-xs px-3 py-1.5 rounded-lg border-l-2 border-[#6b2fa5] bg-white text-gray-500 truncate max-w-full shadow-sm">
            ↩ {replyMsg.authorName}: {replyMsg.text.slice(0, 60)}{replyMsg.text.length > 60 ? "…" : ""}
          </div>
        )}
        {/* Explicit inline styles as fallback for mobile browsers that strip Tailwind's bg- */}
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
            isOwn
              ? "rounded-tr-sm text-white"
              : "rounded-tl-sm text-gray-800 bg-white border border-gray-200 shadow-sm"
          }`}
          style={isOwn ? { backgroundColor: "#6b2fa5" } : undefined}
        >
          {renderText(msg.text)}
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-gray-400">
            {msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
              : ""}
          </span>
          <button
            onClick={() => onReply(msg)}
            className="text-[10px] text-gray-400 hover:text-[#6b2fa5] opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Objective row ────────────────────────────────────────────────────────────
function ObjectiveItem({
  obj,
  taskId,
  canComplete,
  onComplete,
}: {
  obj: Objective
  taskId: string
  canComplete: boolean
  onComplete: (objId: string, attachmentUrl?: string) => void
}) {
  const [uploading,   setUploading]   = useState(false)
  const [link,        setLink]        = useState("")
  const [showAttach,  setShowAttach]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadAttachment(file, taskId, obj.id)
      onComplete(obj.id, url)
    } catch {
      alert("Upload failed. Try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleLinkSubmit = () => {
    if (!link.trim()) return
    onComplete(obj.id, link.trim())
    setLink("")
    setShowAttach(false)
  }

  const renderText = (text: string) =>
    text.split(/(@\w+)/g).map((part, i) =>
      part.startsWith("@")
        ? <span key={i} className="text-[#6b2fa5] font-medium">{part}</span>
        : <span key={i}>{part}</span>
    )

  return (
    <div className={`rounded-xl border p-3.5 transition-colors ${obj.completed ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => {
            if (obj.completed || !canComplete) return
            obj.requiresAttachment ? setShowAttach(true) : onComplete(obj.id)
          }}
          disabled={obj.completed || !canComplete}
          className="mt-0.5 flex-shrink-0"
        >
          {obj.completed
            ? <CheckCircle2 className="w-5 h-5 text-green-500" />
            : <Circle className={`w-5 h-5 ${canComplete ? "text-gray-300 hover:text-[#6b2fa5]" : "text-gray-200"} transition-colors`} />
          }
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-relaxed ${obj.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
            {renderText(obj.text)}
          </p>

          {obj.requiresAttachment && !obj.completed && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
                <Paperclip className="w-3 h-3" />
                {obj.attachmentType ? `${obj.attachmentType} required` : "Attachment required"}
              </span>
            </div>
          )}

          {obj.completed && obj.attachmentUrl && (
            <a href={obj.attachmentUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:underline">
              {obj.attachmentType ? ATTACH_ICON[obj.attachmentType] : <Paperclip className="w-3 h-3" />}
              View attachment
            </a>
          )}

          {showAttach && !obj.completed && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <p className="text-xs font-medium text-gray-600">Provide {obj.attachmentType || "attachment"} to complete</p>
              {obj.attachmentType === "link" ? (
                <div className="flex gap-2">
                  <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…"
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#6b2fa5]/30" />
                  <button onClick={handleLinkSubmit}
                    className="px-3 py-1.5 bg-[#6b2fa5] text-white rounded-lg text-xs font-medium">Submit</button>
                </div>
              ) : (
                <>
                  <input ref={fileRef} type="file" className="hidden"
                    accept={obj.attachmentType === "image" ? "image/*" : obj.attachmentType === "video" ? "video/*" : ".pdf"}
                    onChange={handleFileUpload} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-[#6b2fa5] hover:text-[#6b2fa5] w-full justify-center transition-colors">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? "Uploading…" : `Choose ${obj.attachmentType}`}
                  </button>
                </>
              )}
              <button onClick={() => setShowAttach(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Insights panel (admin only) ──────────────────────────────────────────────
function InsightsPanel({ task, members }: { task: Task; members: Member[] }) {
  const memberMap = Object.fromEntries(members.map((m) => [m.uid, m]))

  const acknowledged = task.acknowledgedBy.map((uid) => memberMap[uid] || { uid, username: uid, fullName: "", role: "" })

  const completedObjectives = task.objectives.filter((o) => o.completed)
  const pendingObjectives   = task.objectives.filter((o) => !o.completed)

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-[#6b2fa5]" />
        <h2 className="text-sm font-semibold text-gray-800">Task Insights</h2>
      </div>

      <div className="p-5 space-y-5">
        {/* Acknowledgements */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Acknowledged ({acknowledged.length})
          </p>
          {acknowledged.length === 0 ? (
            <p className="text-xs text-gray-400">No one has acknowledged yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {acknowledged.map((m) => (
                <div key={m.uid} className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                  <div className="w-5 h-5 rounded-full bg-[#6b2fa5]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#6b2fa5]">
                      {(m.username || m.uid)[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-green-800">{m.username || m.uid}</span>
                  <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Objective completions */}
        {task.objectives.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Objectives ({completedObjectives.length}/{task.objectives.length} done)
            </p>
            <div className="space-y-2">
              {task.objectives.map((obj, i) => {
                const completer = obj.completedBy ? (memberMap[obj.completedBy] || { username: obj.completedBy }) : null
                return (
                  <div key={obj.id} className={`rounded-lg border p-3 text-xs ${obj.completed ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                    <div className="flex items-start gap-2">
                      {obj.completed
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        : <Circle       className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className={`leading-relaxed ${obj.completed ? "text-gray-500 line-through" : "text-gray-700"}`}>
                          {obj.text.slice(0, 100)}{obj.text.length > 100 ? "…" : ""}
                        </p>
                        {obj.completed && completer && (
                          <p className="mt-1 text-[10px] text-green-600 font-medium">
                            ✓ Completed by {completer.username}
                            {obj.completedAt
                              ? ` · ${new Date(obj.completedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                              : ""}
                          </p>
                        )}
                        {obj.completed && obj.attachmentUrl && (
                          <a href={obj.attachmentUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-600 hover:underline">
                            <Paperclip className="w-3 h-3" /> View attachment
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Who has NOT acknowledged */}
        {task.type !== "general" && members.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Pending Acknowledgement
            </p>
            {(() => {
              const notAcknowledged = members.filter(
                (m) => task.departments.includes(m.role) && !task.acknowledgedBy.includes(m.uid)
              )
              return notAcknowledged.length === 0 ? (
                <p className="text-xs text-gray-400">Everyone has acknowledged.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {notAcknowledged.map((m) => (
                    <div key={m.uid} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                      <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-amber-700">{m.username[0]?.toUpperCase()}</span>
                      </div>
                      <span className="text-xs font-medium text-amber-800">{m.username}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TaskDetailClient({
  taskId,
  isAdmin,
  currentUserRole,
  currentUid,
  currentUsername,
}: {
  taskId: string
  isAdmin: boolean
  currentUserRole?: string
  currentUid?: string
  currentUsername?: string
}) {
  const router = useRouter()
  const [task,       setTask]       = useState<Task | null>(null)
  const [messages,   setMessages]   = useState<Message[]>([])
  const [loading,    setLoading]    = useState(true)
  const [msgLoading, setMsgLoading] = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [members,    setMembers]    = useState<Member[]>([])

  // Chat
  const [msgText,          setMsgText]          = useState("")
  const [replyTo,          setReplyTo]          = useState<Message | null>(null)
  const [sending,          setSending]          = useState(false)
  const [mentionDropdown,  setMentionDropdown]  = useState(false)
  const [mentionSearch,    setMentionSearch]    = useState("")
  const [taskDropdown,     setTaskDropdown]     = useState(false)
  const [taskSearch,       setTaskSearch]       = useState("")
  const [taskSuggestions,  setTaskSuggestions]  = useState<{ id: string; taskId: string; name: string }[]>([])

  // Acknowledge
  const [acknowledging, setAcknowledging] = useState(false)

  // Insights tab
  const [showInsights, setShowInsights] = useState(false)

  const chatScrollRef = useRef<HTMLDivElement>(null)
  const chatInputRef  = useRef<HTMLInputElement>(null)
  // Track whether user is scrolled near the bottom
  const isNearBottom  = useRef(true)

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchTask = useCallback(async () => {
    try {
      const res  = await fetch(`/api/v1/tasks/${taskId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Task not found")
      setTask(data.task)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  const fetchMessages = useCallback(async () => {
    try {
      const res  = await fetch(`/api/v1/tasks/${taskId}/messages?limit=100`)
      const data = await res.json()
      if (res.ok) {
        setMessages((prev) => {
          // Only update if something actually changed (avoid re-render churn)
          const incoming = data.messages || []
          if (incoming.length === prev.length && incoming.every((m: Message, i: number) => m.id === prev[i]?.id)) return prev
          return incoming
        })
      }
    } catch {}
    setMsgLoading(false)
  }, [taskId])

  const fetchMembers = useCallback(async () => {
    try {
      const res  = await fetch("/api/v1/onboard")
      const data = await res.json()
      if (res.ok) setMembers(data.admins || [])
    } catch {}
  }, [])

  const fetchTaskSuggestions = useCallback(async (search: string) => {
    try {
      const res  = await fetch("/api/v1/tasks")
      const data = await res.json()
      if (res.ok) {
        const all: { id: string; taskId: string; name: string }[] = (data.tasks || []).map((t: any) => ({
          id:     t.id,
          taskId: t.taskId,
          name:   t.name,
        }))
        setTaskSuggestions(
          all.filter((t) =>
            search === "" ||
            t.taskId.toLowerCase().includes(search.toLowerCase()) ||
            t.name.toLowerCase().includes(search.toLowerCase())
          ).slice(0, 6)
        )
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchTask()
    fetchMessages()
    fetchMembers()
  }, [fetchTask, fetchMessages, fetchMembers])

  // ── Scroll tracking — only auto-scroll if user is already at the bottom ────
  const handleScroll = () => {
    const el = chatScrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isNearBottom.current = distFromBottom < 60
  }

  // Scroll to bottom on initial load only
  useEffect(() => {
    if (!msgLoading && messages.length > 0) {
      const el = chatScrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgLoading])

  // On new messages — only scroll if user is near the bottom
  const prevMsgCount = useRef(0)
  useEffect(() => {
    const incoming = messages.length
    if (incoming > prevMsgCount.current) {
      prevMsgCount.current = incoming
      if (isNearBottom.current) {
        const el = chatScrollRef.current
        if (el) el.scrollTop = el.scrollHeight
      }
    }
  }, [messages])

  // Polling
  useEffect(() => {
    const interval = setInterval(fetchMessages, 8000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  // ── Acknowledge ────────────────────────────────────────────────────────────
  const handleAcknowledge = async () => {
    setAcknowledging(true)
    try {
      await fetch(`/api/v1/tasks/${taskId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "acknowledge" }),
      })
      await fetchTask()
    } finally {
      setAcknowledging(false)
    }
  }

  // ── Complete objective ─────────────────────────────────────────────────────
  const handleCompleteObjective = async (objId: string, attachmentUrl?: string) => {
    await fetch(`/api/v1/tasks/${taskId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "complete-objective", objectiveId: objId, attachmentUrl }),
    })
    await fetchTask()
  }

  // ── Chat input ─────────────────────────────────────────────────────────────
  const handleChatInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setMsgText(v)

    // @ mention
    const lastAt   = v.lastIndexOf("@")
    const lastStar = v.lastIndexOf("*")
    const afterAt  = lastAt   !== -1 ? v.slice(lastAt)   : ""
    const afterStar= lastStar !== -1 ? v.slice(lastStar) : ""

    if (lastAt !== -1 && afterAt.match(/^@\w*$/) && (lastStar === -1 || lastAt > lastStar)) {
      setMentionSearch(v.slice(lastAt + 1))
      setMentionDropdown(true)
      setTaskDropdown(false)
    } else if (lastStar !== -1 && afterStar.match(/^\*\S*$/) && (lastAt === -1 || lastStar > lastAt)) {
      // * task reference
      const search = v.slice(lastStar + 1)
      setTaskSearch(search)
      setTaskDropdown(true)
      setMentionDropdown(false)
      fetchTaskSuggestions(search)
    } else {
      setMentionDropdown(false)
      setTaskDropdown(false)
    }
  }

  const insertMention = (username: string) => {
    const lastAt = msgText.lastIndexOf("@")
    setMsgText(msgText.slice(0, lastAt) + `@${username} `)
    setMentionDropdown(false)
    chatInputRef.current?.focus()
  }

  const insertTaskRef = (tId: string) => {
    const lastStar = msgText.lastIndexOf("*")
    setMsgText(msgText.slice(0, lastStar) + `*${tId} `)
    setTaskDropdown(false)
    chatInputRef.current?.focus()
  }

  const filteredMembers = members
    .filter((m) => m.username.toLowerCase().includes(mentionSearch.toLowerCase()))
    .slice(0, 6)

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!msgText.trim() || sending) return
    const mentionMatches = [...msgText.matchAll(/@(\w+)/g)].map((m) => m[1])
    setSending(true)
    try {
      await fetch(`/api/v1/tasks/${taskId}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          text:     msgText.trim(),
          replyTo:  replyTo?.id || null,
          mentions: mentionMatches,
          taskRef:  null,
        }),
      })
      setMsgText("")
      setReplyTo(null)
      // After sending own message — always scroll to bottom
      isNearBottom.current = true
      await fetchMessages()
    } finally {
      setSending(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#6b2fa5] animate-spin" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 text-sm">{error || "Task not found"}</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-red-700 underline">Go back</button>
      </div>
    )
  }

  const done            = task.objectives.filter((o) => o.completed).length
  const total           = task.objectives.length
  const pct             = total > 0 ? Math.round((done / total) * 100) : 0
  const isAcknowledged  = currentUid ? task.acknowledgedBy.includes(currentUid) : true
  const canComplete     = isAdmin || isAcknowledged

  return (
    <div className="space-y-5">
      {/* Back + Insights toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Tasks
        </button>
        {isAdmin && (
          <button
            onClick={() => setShowInsights((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showInsights
                ? "bg-[#6b2fa5] text-white border-[#6b2fa5]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#6b2fa5] hover:text-[#6b2fa5]"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Insights
          </button>
        )}
      </div>

      {/* Task header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900">{task.name}</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{task.taskId}</p>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${STATUS_STYLE[task.status]}`}>
            {task.status === "in-progress" ? "In Progress" : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
          {task.type === "general"
            ? <span className="flex items-center gap-1 bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full border border-violet-200"><Globe className="w-3 h-3" /> General</span>
            : <span className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-200"><Users className="w-3 h-3" /> Dept</span>
          }
          {task.departments.map((d) => (
            <span key={d} className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
              {DEPT_LABELS[d] || d}
            </span>
          ))}
          {task.deadline && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Due {new Date(task.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          )}
          {task.createdAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(task.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          )}
        </div>

        {total > 0 && (
          <div>
            <div className="flex justify-between mb-1 text-xs text-gray-400">
              <span>{done}/{total} objectives complete</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#6b2fa5] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {!isAdmin && !isAcknowledged && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-700">Acknowledge this task before completing objectives.</p>
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
            >
              {acknowledging ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              Acknowledge
            </button>
          </div>
        )}
      </div>

      {/* Insights panel */}
      {isAdmin && showInsights && (
        <InsightsPanel task={task} members={members} />
      )}

      {/* Objectives */}
      {total > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 px-1">Objectives</h2>
          {task.objectives.map((obj) => (
            <ObjectiveItem
              key={obj.id}
              obj={obj}
              taskId={task.id}
              canComplete={canComplete}
              onComplete={handleCompleteObjective}
            />
          ))}
        </div>
      )}

      {/* Chat */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Discussion</h2>
          <button onClick={fetchMessages} className="text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Scroll container — onScroll tracks position, no auto-scroll on poll */}
        <div
          ref={chatScrollRef}
          onScroll={handleScroll}
          className="h-72 overflow-y-auto p-4 space-y-3"
          style={{ backgroundColor: "#f9fafb" }}
        >
          {msgLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-400">
              No messages yet. Start the conversation.
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                currentUid={currentUid || ""}
                onReply={(m) => { setReplyTo(m); chatInputRef.current?.focus() }}
                allMessages={messages}
              />
            ))
          )}
        </div>

        {replyTo && (
          <div className="px-4 py-2 border-t border-[#6b2fa5]/10 flex items-center justify-between gap-2"
            style={{ backgroundColor: "rgba(107,47,165,0.05)" }}>
            <p className="text-xs text-gray-500 truncate">
              Replying to <span className="font-medium text-[#6b2fa5]">{replyTo.authorName}</span>: {replyTo.text.slice(0, 60)}…
            </p>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-100 relative">
          {/* @ mention dropdown */}
          {mentionDropdown && filteredMembers.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 mb-1">
              {filteredMembers.map((m) => (
                <button
                  key={m.uid}
                  onMouseDown={(e) => { e.preventDefault(); insertMention(m.username) }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#6b2fa5]/5 text-gray-700 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-[#6b2fa5]/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#6b2fa5]">{m.username[0]?.toUpperCase()}</span>
                  </div>
                  <span>@{m.username}</span>
                  {m.role && <span className="ml-auto text-[10px] text-gray-400">{m.role}</span>}
                </button>
              ))}
            </div>
          )}

          {/* * task reference dropdown */}
          {taskDropdown && taskSuggestions.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 mb-1">
              <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wider">Reference task</div>
              {taskSuggestions.map((t) => (
                <button
                  key={t.id}
                  onMouseDown={(e) => { e.preventDefault(); insertTaskRef(t.taskId) }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 text-gray-700 flex flex-col"
                >
                  <span className="font-medium text-xs text-blue-600 font-mono">{t.taskId}</span>
                  <span className="text-xs text-gray-500 truncate">{t.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center">
            <input
              ref={chatInputRef}
              type="text"
              value={msgText}
              onChange={handleChatInput}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Message… @ mention · * task ref"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 bg-gray-50"
            />
            <button
              onClick={handleSend}
              disabled={sending || !msgText.trim()}
              className="p-2.5 text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0"
              style={{ backgroundColor: "#6b2fa5" }}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 px-1">
            <kbd className="bg-gray-100 px-1 rounded">@</kbd> mention &nbsp;·&nbsp;
            <kbd className="bg-gray-100 px-1 rounded">*</kbd> reference a task
          </p>
        </div>
      </div>
    </div>
  )
}
