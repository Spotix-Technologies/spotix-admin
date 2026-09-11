"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, Check, Copy, ImagePlus, ImageUp, Loader2 } from "lucide-react"

/**
 * app/components/storage/storage-client.tsx
 *
 * Shared "Storage" page rendered on every role dashboard (Admin, Exec
 * Assistant, Customer Support, Marketing, IT — see each role's
 * app/<role>-dashboard/storage/page.tsx). Lets any admin upload an
 * image (under 3MB) to UploadThing and copy the hosted URL — e.g. for
 * pasting into a poll/event banner field, a WhatsApp broadcast, a CMS
 * entry, etc.
 *
 * Every upload is recorded in Supabase's `admin_storage` table (url,
 * uploader uid, upload date — see supabase/admin-storage-schema.sql,
 * app/lib/admin-storage-db.ts) via app/api/v1/storage/upload, so an
 * admin's history persists across sessions/devices instead of only
 * living in that browser tab's React state.
 */

const MAX_SIZE = 3 * 1024 * 1024 // 3MB

interface UploadedImage {
  url: string
  fileName: string | null
  fileSize: number | null
  createdAt: string
}

export default function StorageClient() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploads, setUploads] = useState<UploadedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const loadUploads = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch("/api/v1/storage/upload")
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load your uploads")
      setUploads((data.uploads ?? []).map((u: any) => ({
        url: u.url,
        fileName: u.file_name,
        fileSize: u.file_size,
        createdAt: u.created_at,
      })))
    } catch (e: any) {
      setLoadError(e.message || "Failed to load your uploads")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUploads() }, [loadUploads])

  const handleFile = async (file: File) => {
    setError(null)
    if (!file.type.startsWith("image/")) {
      setError("Only image files can be uploaded here.")
      return
    }
    if (file.size > MAX_SIZE) {
      setError("That image is over the 3MB limit.")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/v1/storage/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Upload failed")
      setUploads((prev) => [{ url: data.fileUrl, fileName: data.fileName, fileSize: data.fileSize, createdAt: data.createdAt }, ...prev])
    } catch (e: any) {
      setError(e.message || "Upload failed")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl((c) => (c === url ? null : c)), 1500)
    } catch {
      // Clipboard API can fail silently in some browser contexts — the
      // URL is still selectable/visible for a manual copy.
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ImageUp className="w-5 h-5 text-[#6b2fa5]" /> Storage
        </h1>
        <p className="text-sm text-slate-400 mt-1">Upload an image and copy its hosted URL.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <label
        htmlFor="storage-file-input"
        className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-violet-300 rounded-2xl py-10 cursor-pointer transition-colors bg-white"
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 text-[#6b2fa5] animate-spin" />
        ) : (
          <ImagePlus className="w-6 h-6 text-slate-300" />
        )}
        <p className="text-sm font-semibold text-slate-600">{uploading ? "Uploading…" : "Click to choose an image"}</p>
        <p className="text-xs text-slate-400">Images only · up to 3MB</p>
        <input
          ref={inputRef}
          id="storage-file-input"
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </label>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <p className="text-xs font-semibold text-gray-500 px-5 pt-5 pb-2">Your uploads</p>
        {loadError ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-red-500">
            <AlertCircle className="w-4 h-4" /> {loadError}
          </div>
        ) : loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
        ) : uploads.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No uploads yet</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {uploads.map((u) => (
              <div key={u.url} className="px-5 py-3 flex items-center gap-3">
                <img src={u.url} alt={u.fileName ?? "Uploaded image"} className="w-10 h-10 rounded-lg object-cover border border-slate-100 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 truncate">{u.fileName ?? "Untitled"}</p>
                  <p className="text-xs text-slate-400 truncate">{u.url}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{new Date(u.createdAt).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => copy(u.url)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b2fa5] hover:bg-violet-50 px-3 py-1.5 rounded-lg shrink-0"
                >
                  {copiedUrl === u.url ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl === u.url ? "Copied" : "Copy URL"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
