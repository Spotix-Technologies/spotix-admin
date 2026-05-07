"use client"

import { useState, useRef, useCallback } from "react"
import {
  FilePlus, Upload, Search, Trash2, AlertTriangle, X,
  FileText, FileJson, File, Music, Video, Image,
  ChevronDown, CheckCircle, Loader2, FolderOpen,
  Calendar, Hash, ArrowRight, RefreshCw,
} from "lucide-react"
import { storage } from "@/lib/firebase-client"
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"

// ─── Types ─────────────────────────────────────────────────────────────────────
type DocType = "REQ" | "MEM" | "MIN" | "DOC"
type ReqStatus = "Raised" | "Accepted" | "Failed"

interface DocFile {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  storagePath: string
  uploadedByUsername: string
  uploadedAt: string
}

interface DocumentMeta {
  id: string
  docType: DocType
  reference: string
  dateStamp: string
  index: string
  createdByUsername: string
  createdAt: string
  fileCount: number
  status?: ReqStatus
}

type ViewMode = "home" | "retrieve" | "timeseries"

const DOC_TYPE_INFO: Record<DocType, { label: string; color: string; bg: string }> = {
  REQ: { label: "Requisition",  color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"  },
  MEM: { label: "Memo",         color: "text-blue-700",    bg: "bg-blue-50 border-blue-200"    },
  MIN: { label: "Minutes",      color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  DOC: { label: "Other",        color: "text-slate-700",   bg: "bg-slate-50 border-slate-200"  },
}

const STATUS_STYLES: Record<ReqStatus, string> = {
  Raised:   "bg-amber-50 text-amber-700 border-amber-200",
  Accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Failed:   "bg-red-50 text-red-700 border-red-200",
}

function fileIcon(type: string) {
  if (type.startsWith("image/")) return <Image className="w-4 h-4" />
  if (type.startsWith("audio/")) return <Music className="w-4 h-4" />
  if (type.startsWith("video/")) return <Video className="w-4 h-4" />
  if (type === "application/pdf") return <FileText className="w-4 h-4" />
  if (type.includes("json")) return <FileJson className="w-4 h-4" />
  return <File className="w-4 h-4" />
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(val: unknown): string {
  try {
    // Firestore Timestamp: { seconds: number, nanoseconds: number }
    if (val && typeof val === "object" && "seconds" in (val as object)) {
      const ts = val as { seconds: number }
      return new Date(ts.seconds * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
    }
    // ISO string or anything new Date() can parse
    const d = new Date(val as string)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

function stampToDisplay(s: string) {
  // 20260507 → 07 May 2026
  const y = s.slice(0, 4), m = s.slice(4, 6), d = s.slice(6, 8)
  return new Date(`${y}-${m}-${d}`).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium ${type === "success" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-600"}`}>
      {type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {msg}
    </div>
  )
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────
function ConfirmDialog({
  open, onClose, onConfirm, title, description, loading,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void
  title: string; description: string; loading?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-red-100 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-700">{title}</h3>
              <p className="text-sm text-red-500 mt-1">{description}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Document Dialog ───────────────────────────────────────────────────
function CreateDocDialog({
  open, onClose, onCreated,
}: {
  open: boolean; onClose: () => void; onCreated: (doc: DocumentMeta) => void
}) {
  const [selected, setSelected] = useState<DocType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!selected) return
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/v1/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType: selected }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      onCreated(json.document)
      setSelected(null)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create document")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">New Document</h3>
            <p className="text-sm text-slate-500 mt-0.5">Choose a document type to create</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-3">
          {(Object.entries(DOC_TYPE_INFO) as [DocType, (typeof DOC_TYPE_INFO)[DocType]][]).map(([type, info]) => (
            <button
              key={type}
              onClick={() => setSelected(type)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                selected === type
                  ? `border-violet-500 bg-violet-50`
                  : `border-slate-200 hover:border-slate-300 hover:bg-slate-50`
              }`}
            >
              <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold font-mono ${info.bg} ${info.color}`}>
                {type}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold ${selected === type ? "text-violet-700" : "text-slate-800"}`}>
                  {info.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  SPTX-{type}-YYYYMMDD-##
                </p>
              </div>
              {selected === type && (
                <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
              )}
            </button>
          ))}

          {error && (
            <p className="text-sm text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-white transition-all">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selected || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus className="w-4 h-4" />}
            Create Document
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Upload File Dialog ────────────────────────────────────────────────────────
function UploadDialog({
  open, onClose, canWrite, showToast,
}: {
  open: boolean; onClose: () => void; canWrite: boolean
  showToast: (msg: string, type: "success" | "error") => void
}) {
  const [docIdInput, setDocIdInput] = useState("")
  const [docMeta, setDocMeta] = useState<DocumentMeta | null>(null)
  const [files, setFiles] = useState<DocFile[]>([])
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<DocFile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ALLOWED_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    "audio/mpeg", "audio/wav", "audio/ogg",
    "video/mp4", "video/webm", "video/ogg",
    "application/pdf",
    "text/plain", "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]

  const handleFetch = async () => {
    const id = docIdInput.trim().toUpperCase()
    if (!id) return
    setFetching(true); setFetchError(null); setDocMeta(null); setFiles([])
    try {
      const res = await fetch(`/api/v1/documents?docId=${encodeURIComponent(id)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setDocMeta(json.document)
      setFiles(json.files || [])
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to fetch")
    } finally {
      setFetching(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !docMeta) return
    e.target.value = ""

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast("File type not allowed", "error"); return
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast("File exceeds 20MB limit", "error"); return
    }

    setUploading(true); setUploadProgress(0)
    try {
      const path = `documents/${docMeta.id}/${Date.now()}_${file.name}`
      const storageRef = ref(storage, path)
      const task = uploadBytesResumable(storageRef, file)

      await new Promise<void>((resolve, reject) => {
        task.on("state_changed",
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve
        )
      })

      const fileUrl = await getDownloadURL(storageRef)

      const res = await fetch(`/api/v1/documents/${docMeta.id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileUrl,
          fileType: file.type,
          fileSize: file.size,
          storagePath: path,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setFiles((prev) => [...prev, json.file])
      setDocMeta((prev) => prev ? { ...prev, fileCount: (prev.fileCount ?? 0) + 1 } : prev)
      showToast("File uploaded successfully", "success")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Upload failed", "error")
    } finally {
      setUploading(false); setUploadProgress(0)
    }
  }

  const handleDeleteFile = async () => {
    if (!deleteTarget || !docMeta) return
    setDeleting(true)
    try {
      // Delete from storage
      try {
        const storageRef = ref(storage, deleteTarget.storagePath)
        await deleteObject(storageRef)
      } catch { /* file may already be gone */ }

      // Delete from Firestore
      const res = await fetch(`/api/v1/documents/${docMeta.id}/files?fileId=${deleteTarget.id}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id))
      setDocMeta((prev) => prev ? { ...prev, fileCount: Math.max(0, (prev.fileCount ?? 1) - 1) } : prev)
      showToast("File deleted", "success")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error")
    } finally {
      setDeleting(false); setDeleteTarget(null)
    }
  }

  const handleStatusChange = async (status: ReqStatus) => {
    if (!docMeta) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/v1/documents/${docMeta.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setDocMeta((prev) => prev ? { ...prev, status } : prev)
      showToast(`Status updated to ${status}`, "success")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to update status", "error")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleClose = () => {
    setDocIdInput(""); setDocMeta(null); setFiles([]); setFetchError(null)
    onClose()
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Manage Document Files</h3>
              <p className="text-sm text-slate-500 mt-0.5">Enter a document reference ID to manage its files</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Doc ID input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. SPTX-REQ-20260507-01"
                value={docIdInput}
                onChange={(e) => setDocIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 placeholder:text-slate-400"
              />
              <button
                onClick={handleFetch}
                disabled={!docIdInput.trim() || fetching}
                className="px-4 py-2.5 bg-violet-600 text-white font-semibold text-sm rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Fetch
              </button>
            </div>

            {fetchError && (
              <p className="text-sm text-red-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {fetchError}
              </p>
            )}

            {/* Document found */}
            {docMeta && (
              <div className="space-y-4">
                {/* Doc info card */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold font-mono ${DOC_TYPE_INFO[docMeta.docType].bg} ${DOC_TYPE_INFO[docMeta.docType].color}`}>
                      {docMeta.docType}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 font-mono">{docMeta.id}</p>
                      <p className="text-xs text-slate-500">Created by {docMeta.createdByUsername} · {fmtDate(docMeta.createdAt)}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{docMeta.fileCount} file{docMeta.fileCount !== 1 ? "s" : ""}</span>
                </div>

                {/* REQ status toggle */}
                {docMeta.docType === "REQ" && canWrite && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-600">Status:</span>
                    {(["Raised", "Accepted", "Failed"] as ReqStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        disabled={updatingStatus || docMeta.status === s}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:cursor-not-allowed ${
                          docMeta.status === s
                            ? STATUS_STYLES[s]
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {updatingStatus && docMeta.status !== s ? <Loader2 className="w-3 h-3 animate-spin" /> : s}
                      </button>
                    ))}
                  </div>
                )}
                {docMeta.docType === "REQ" && !canWrite && docMeta.status && (
                  <div>
                    <span className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${STATUS_STYLES[docMeta.status as ReqStatus]}`}>
                      {docMeta.status}
                    </span>
                  </div>
                )}

                {/* Files list */}
                <div className="space-y-2">
                  {files.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 font-medium">No files in this document index.</p>
                      <p className="text-xs text-slate-400">Go ahead and make one.</p>
                    </div>
                  ) : (
                    files.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all">
                        <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center text-violet-500 shrink-0">
                          {fileIcon(file.fileType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <a href={file.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-semibold text-slate-800 hover:text-violet-700 truncate block transition-colors">
                            {file.fileName}
                          </a>
                          <p className="text-xs text-slate-400">{fmtSize(file.fileSize)} · {file.uploadedByUsername}</p>
                        </div>
                        {canWrite && (
                          <button
                            onClick={() => setDeleteTarget(file)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Upload button */}
                {canWrite && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.mp3,.wav,.ogg,.mp4,.webm,.pdf,.txt,.csv,.doc,.docx"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 text-white font-semibold text-sm rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-all shadow-lg shadow-violet-500/20"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading… {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload File (max 20MB)
                        </>
                      )}
                    </button>
                    {uploading && (
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteFile}
        title="Delete this file?"
        description={`"${deleteTarget?.fileName}" will be permanently removed from storage and this document.`}
        loading={deleting}
      />
    </>
  )
}

// ─── Search Panel ─────────────────────────────────────────────────────────────
function SearchPanel({ canWrite, showToast }: { canWrite: boolean; showToast: (m: string, t: "success" | "error") => void }) {
  const [mode, setMode] = useState<"single" | "range">("single")
  const [docType, setDocType] = useState<DocType>("REQ")
  const [date, setDate] = useState("")
  const [index, setIndex] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState(false)
  const [singleResult, setSingleResult] = useState<{ document: DocumentMeta; files: DocFile[] } | null>(null)
  const [rangeResults, setRangeResults] = useState<{ dateStamp: string; docs: DocumentMeta[] }[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Convert date-picker value (YYYY-MM-DD) to YYYYMMDD stamp
  const toStamp = (v: string) => v.replace(/-/g, "")

  const handleSingleSearch = async () => {
    if (!date) return
    setLoading(true); setError(null); setSingleResult(null); setRangeResults(null)
    try {
      const stamp = toStamp(date)
      const idx = index.trim() || "01"
      const res = await fetch(`/api/v1/documents?type=${docType}&date=${stamp}&index=${idx}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSingleResult({ document: json.document, files: json.files })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not found")
    } finally {
      setLoading(false)
    }
  }

  const handleRangeSearch = async () => {
    if (!dateFrom || !dateTo) return
    setLoading(true); setError(null); setSingleResult(null); setRangeResults(null)
    try {
      const from = toStamp(dateFrom)
      const to = toStamp(dateTo)
      const res = await fetch(`/api/v1/documents?type=${docType}&dateFrom=${from}&dateTo=${to}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setRangeResults(json.results || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }

  const [deleteDocId, setDeleteDocId] = useState<string | null>(null)
  const [deletingDoc, setDeletingDoc] = useState(false)

  const handleDeleteDoc = async () => {
    if (!deleteDocId) return
    setDeletingDoc(true)
    try {
      const res = await fetch(`/api/v1/documents?docId=${deleteDocId}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast("Document deleted", "success")
      setSingleResult(null)
      setRangeResults((prev) =>
        prev ? prev.map((g) => ({ ...g, docs: g.docs.filter((d) => d.id !== deleteDocId) })).filter((g) => g.docs.length > 0) : prev
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error")
    } finally {
      setDeletingDoc(false); setDeleteDocId(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Type selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-slate-600">Document type:</span>
        {(Object.keys(DOC_TYPE_INFO) as DocType[]).map((t) => (
          <button
            key={t}
            onClick={() => setDocType(t)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-mono transition-all ${
              docType === t
                ? `${DOC_TYPE_INFO[t].bg} ${DOC_TYPE_INFO[t].color} border-current`
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setMode("single")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${mode === "single" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Single Lookup
        </button>
        <button
          onClick={() => setMode("range")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${mode === "range" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Time Range
        </button>
      </div>

      {/* Single lookup inputs */}
      {mode === "single" && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400" />
          </div>
          <div className="w-32 space-y-1">
            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Index</label>
            <input type="text" placeholder="01" value={index} onChange={(e) => setIndex(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 placeholder:text-slate-400" />
          </div>
          <div className="flex items-end">
            <button onClick={handleSingleSearch} disabled={!date || loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-semibold text-sm rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all h-[42px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>
        </div>
      )}

      {/* Range lookup inputs */}
      {mode === "range" && (
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold text-slate-500">From date *</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400" />
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mb-3 hidden sm:block" />
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold text-slate-500">To date *</label>
            <input type="date" value={dateTo} max={new Date().toISOString().split("T")[0]} onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400" />
          </div>
          <button onClick={handleRangeSearch} disabled={!dateFrom || !dateTo || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-semibold text-sm rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all h-[42px]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </p>
      )}

      {/* Single result */}
      {singleResult && (
        <DocCard doc={singleResult.document} files={singleResult.files} canWrite={canWrite} onDeleteDoc={() => setDeleteDocId(singleResult.document.id)} />
      )}

      {/* Range results */}
      {rangeResults && (
        <div className="space-y-4">
          {rangeResults.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No documents found in this date range.</p>
            </div>
          ) : (
            rangeResults.map((group) => (
              <div key={group.dateStamp} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-violet-500" />
                  <h3 className="text-sm font-bold text-slate-700">{stampToDisplay(group.dateStamp)}</h3>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{group.docs.length} doc{group.docs.length !== 1 ? "s" : ""}</span>
                </div>
                {group.docs.map((doc) => (
                  <DocCard key={doc.id} doc={doc} files={null} canWrite={canWrite} onDeleteDoc={() => setDeleteDocId(doc.id)} />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteDocId}
        onClose={() => setDeleteDocId(null)}
        onConfirm={handleDeleteDoc}
        title="Delete entire document?"
        description={`All files and metadata for "${deleteDocId}" will be permanently removed. Storage files must be cleared separately.`}
        loading={deletingDoc}
      />
    </div>
  )
}

// ─── Doc Card ─────────────────────────────────────────────────────────────────
function DocCard({
  doc, files, canWrite, onDeleteDoc,
}: {
  doc: DocumentMeta; files: DocFile[] | null; canWrite: boolean; onDeleteDoc: () => void
}) {
  const info = DOC_TYPE_INFO[doc.docType]
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold font-mono ${info.bg} ${info.color}`}>{doc.docType}</div>
          <div>
            <p className="text-sm font-bold text-slate-800 font-mono">{doc.id}</p>
            <p className="text-xs text-slate-500">
              {doc.createdByUsername} · {fmtDate(doc.createdAt)} · {doc.fileCount} file{doc.fileCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {doc.docType === "REQ" && doc.status && (
            <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${STATUS_STYLES[doc.status as ReqStatus]}`}>
              {doc.status}
            </span>
          )}
          {canWrite && (
            <button onClick={onDeleteDoc} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {files && files.length > 0 && (
        <div className="divide-y divide-slate-100">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-500 shrink-0">
                {fileIcon(file.fileType)}
              </div>
              <div className="flex-1 min-w-0">
                <a href={file.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-semibold text-slate-700 hover:text-violet-700 truncate block transition-colors">
                  {file.fileName}
                </a>
                <p className="text-xs text-slate-400">{fmtSize(file.fileSize)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {files && files.length === 0 && (
        <div className="px-5 py-3 text-sm text-slate-400 italic">No files attached yet.</div>
      )}
    </div>
  )
}

// ─── Main Documents Client ────────────────────────────────────────────────────
export default function DocumentsClient({ canWrite }: { canWrite: boolean }) {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [lastCreated, setLastCreated] = useState<DocumentMeta | null>(null)

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const handleCreated = (doc: DocumentMeta) => {
    setLastCreated(doc)
    showToast(`Created ${doc.id}`, "success")
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-16 space-y-8">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-full px-3 py-1 mb-3">
          <div className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
          <span className="text-xs text-violet-600 font-semibold tracking-widest uppercase">Spotix Admin</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Documents</h1>
        <p className="text-slate-500 text-sm mt-1">
          {canWrite ? "Create, upload, and manage internal Spotix documents." : "Search and view internal documents."}
        </p>
      </div>

      {/* Action buttons */}
      {canWrite && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-violet-600 text-white font-semibold text-sm rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/25"
          >
            <FilePlus className="w-4 h-4" />
            New Document
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:border-violet-300 hover:text-violet-700 transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload / Manage Files
          </button>
        </div>
      )}

      {!canWrite && (
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:border-violet-300 hover:text-violet-700 transition-all"
        >
          <FolderOpen className="w-4 h-4" />
          Open Document
        </button>
      )}

      {/* Last created callout */}
      {lastCreated && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Document created</p>
            <p className="text-xs text-emerald-600 font-mono mt-0.5">{lastCreated.id}</p>
          </div>
          <button onClick={() => setLastCreated(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Search className="w-4 h-4 text-violet-500" />
          <h2 className="font-semibold text-sm text-slate-700">Search Documents</h2>
        </div>
        <div className="p-5">
          <SearchPanel canWrite={canWrite} showToast={showToast} />
        </div>
      </div>

      {/* Dialogs */}
      {canWrite && (
        <CreateDocDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      )}
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} canWrite={canWrite} showToast={showToast} />
    </div>
  )
}
