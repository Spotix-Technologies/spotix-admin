"use client"

import { useState, useRef } from "react"
import {
  Globe, Upload, Search, ImageIcon, X, Check, AlertCircle,
  Loader2, Pencil, Trash2, ExternalLink, CheckCircle, Lock,
} from "lucide-react"
import { useAdminSession } from "@/hooks/use-admin-session"

// ── Constants ──────────────────────────────────────────────────────────────────
const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers",
  "Sokoto","Taraba","Yobe","Zamfara",
]

const GENRES = [
  "Music","Arts & Culture","Technology","Food & Drinks","Sports",
  "Business","Fashion","Comedy","Education","Religious","Social","Other",
]

// ── Cloudinary upload (mirrors imageUploader.ts) ───────────────────────────────
async function uploadToCloudinary(
  file: File,
  onProgress: (p: number) => void,
): Promise<string | null> {
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  const cloud  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!preset || !cloud) return null

  const fd = new FormData()
  fd.append("file", file)
  fd.append("upload_preset", preset)
  fd.append("folder", "spotix-discover")

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloud}/upload`, true)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText).secure_url)
      else resolve(null)
    }
    xhr.onerror = () => resolve(null)
    xhr.send(fd)
  })
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface TicketTier {
  label: string
  price: string
}

interface DiscoverEvent {
  id: string; state: string; eventName: string; description: string
  host: string; location: string; genre: string; eventStart: string
  eventEnd: string; ticketPolicy: string
  ticketTiers: TicketTier[] | null
  isSpotixEvent: boolean
  spotixEventId: string | null; ticketLink: string | null
  imageUrl: string; postedBy: string; postedByUid: string; createdAt: string
  updatedAt: string; status: string
}

type Tab = "upload" | "manage"

// ── Main component ─────────────────────────────────────────────────────────────
export function UploadEventsClient() {
  const { session } = useAdminSession()
  const [tab, setTab] = useState<Tab>("upload")

  // ── Upload form state ──────────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    eventName: "", description: "", host: "", state: "", location: "",
    genre: "", eventStart: "", eventEnd: "",
    ticketPolicy: "tbd" as "free" | "tbd" | "listed",
    isSpotixEvent: false, spotixEventId: "", ticketLink: "",
  })

  // Ticket tiers for "listed" policy — each tier has a label and a price
  const [tiers, setTiers] = useState<{ label: string; price: string }[]>([{ label: "", price: "" }])
  const addTier = () => setTiers(t => [...t, { label: "", price: "" }])
  const removeTier = (i: number) => setTiers(t => t.filter((_, idx) => idx !== i))
  const updateTier = (i: number, field: "label" | "price", val: string) =>
    setTiers(t => t.map((tier, idx) => idx === i ? { ...tier, [field]: val } : tier))

  // ── Manage state ───────────────────────────────────────────────────────────
  const [lookupState, setLookupState] = useState("")
  const [lookupId, setLookupId] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupEvent, setLookupEvent] = useState<DiscoverEvent | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<DiscoverEvent>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Shared toast ───────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Image pick ─────────────────────────────────────────────────────────────
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setUploadedUrl(null)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleImageUpload = async () => {
    if (!imageFile) return
    setUploading(true)
    setUploadProgress(0)
    const url = await uploadToCloudinary(imageFile, setUploadProgress)
    setUploading(false)
    if (url) { setUploadedUrl(url); showToast("Image uploaded", "success") }
    else showToast("Image upload failed", "error")
  }

  // ── Submit upload form ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!uploadedUrl) { showToast("Please upload the event image first", "error"); return }
    if (!form.eventName || !form.state || !form.eventStart) {
      showToast("Event name, state, and start date are required", "error"); return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/v1/discover-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ticketTiers: form.ticketPolicy === "listed" ? tiers : [], imageUrl: uploadedUrl }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(`Event posted! ID: ${json.id}`, "success")
      setForm({ eventName:"",description:"",host:"",state:"",location:"",genre:"",eventStart:"",eventEnd:"",ticketPolicy:"tbd",isSpotixEvent:false,spotixEventId:"",ticketLink:"" })
      setTiers([{ label: "", price: "" }])
      setImageFile(null); setImagePreview(null); setUploadedUrl(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to post event", "error")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Lookup ─────────────────────────────────────────────────────────────────
  const handleLookup = async () => {
    if (!lookupState || !lookupId) return
    setLookupLoading(true); setLookupError(null); setLookupEvent(null); setEditing(false)
    try {
      const res = await fetch(`/api/v1/discover-events/lookup?state=${encodeURIComponent(lookupState)}&id=${encodeURIComponent(lookupId)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setLookupEvent(json.event)
      setEditForm(json.event)
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Event not found")
    } finally {
      setLookupLoading(false)
    }
  }

  const handleSave = async () => {
    if (!lookupEvent) return
    setSaving(true)
    try {
      const res = await fetch("/api/v1/discover-events/lookup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: lookupEvent.state, id: lookupEvent.id, ...editForm }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast("Event updated", "success")
      setEditing(false)
      setLookupEvent({ ...lookupEvent, ...editForm } as DiscoverEvent)
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to update", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!lookupEvent) return
    setDeleting(true)
    try {
      const res = await fetch("/api/v1/discover-events/lookup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: lookupEvent.state, id: lookupEvent.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast("Event deleted", "success")
      setLookupEvent(null); setConfirmDelete(false); setLookupId("")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to delete", "error")
    } finally {
      setDeleting(false)
    }
  }

  // Only a full "admin" can edit/delete listings posted by other admin types.
  // Every other role may only edit/delete the listings they posted themselves.
  const canEditLookupEvent = !!lookupEvent && !!session &&
    (session.role === "admin" || lookupEvent.postedByUid === session.uid)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pb-12 space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-600"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center">
          <Globe className="w-4 h-4 text-[#6b2fa5]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Upload Events</h1>
          <p className="text-xs text-gray-500">Post events to the Spotix Discovery system</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {(["upload", "manage"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all capitalize ${tab === t ? "bg-white text-[#6b2fa5] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "upload" ? "Upload Event" : "Manage Events"}
          </button>
        ))}
      </div>

      {/* ── Upload Tab ── */}
      {tab === "upload" && (
        <div className="space-y-4">
          {/* Image */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <p className="text-sm font-semibold text-gray-700">Event Image *</p>
            <div
              className="relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-[#6b2fa5]/40 transition-colors"
              style={{ height: 180 }}
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} className="w-full h-full object-cover" alt="preview" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-sm">Click to select image</span>
                </div>
              )}
              {uploadedUrl && (
                <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            {imageFile && !uploadedUrl && (
              <button onClick={handleImageUpload} disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg bg-[#6b2fa5] text-white hover:bg-[#5a2589] disabled:opacity-50 transition-colors">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading {uploadProgress}%</> : <><Upload className="w-4 h-4" /> Upload Image</>}
              </button>
            )}
          </div>

          {/* Core fields */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <Field label="Event Name *" value={form.eventName} onChange={v => setForm(f => ({...f, eventName: v}))} placeholder="Enter event name" />
            <Field label="Description" value={form.description} onChange={v => setForm(f => ({...f, description: v}))} placeholder="Event description" multiline />
            <Field label="Host / Organizer" value={form.host} onChange={v => setForm(f => ({...f, host: v}))} placeholder="Who is hosting this event?" />
          </div>

          {/* Location */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">State *</label>
              <select value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]">
                <option value="">Select state</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Field label="Specific Location / Venue" value={form.location} onChange={v => setForm(f => ({...f, location: v}))} placeholder="Venue address" />
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Genre</label>
              <select value={form.genre} onChange={e => setForm(f => ({...f, genre: e.target.value}))}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]">
                <option value="">Select genre</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <Field label="Event Start *" value={form.eventStart} onChange={v => setForm(f => ({...f, eventStart: v}))} type="datetime-local" />
            <Field label="Event End" value={form.eventEnd} onChange={v => setForm(f => ({...f, eventEnd: v}))} type="datetime-local" />
          </div>

          {/* Ticket policy */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-gray-600">Ticket Policy</p>
            <div className="flex gap-2">
              {(["free", "tbd", "listed"] as const).map(p => (
                <button key={p} onClick={() => setForm(f => ({...f, ticketPolicy: p}))}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${form.ticketPolicy === p ? "border-[#6b2fa5] bg-[#6b2fa5]/5 text-[#6b2fa5]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  {p === "free" ? "Free" : p === "tbd" ? "TBD" : "Listed"}
                </button>
              ))}
            </div>
            {form.ticketPolicy === "listed" && (
              <div className="space-y-2 pt-1">
                {tiers.map((tier, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <input
                        value={tier.label}
                        onChange={e => updateTier(i, "label", e.target.value)}
                        placeholder="e.g. Regular, VIP…"
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5] placeholder:text-gray-400"
                      />
                    </div>
                    <div className="w-28 shrink-0">
                      <input
                        type="number"
                        value={tier.price}
                        onChange={e => updateTier(i, "price", e.target.value)}
                        placeholder="₦ Price"
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5] placeholder:text-gray-400"
                      />
                    </div>
                    {tiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTier(i)}
                        className="mt-0.5 p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTier}
                  className="w-full py-2 text-sm font-semibold text-[#6b2fa5] border-2 border-dashed border-[#6b2fa5]/30 rounded-lg hover:border-[#6b2fa5]/60 hover:bg-[#6b2fa5]/5 transition-colors"
                >
                  + Add tier
                </button>
              </div>
            )}
          </div>

          {/* Spotix toggle */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Spotix Event</p>
                <p className="text-xs text-gray-500">Is this event ticketed on Spotix?</p>
              </div>
              <button
                onClick={() => setForm(f => ({...f, isSpotixEvent: !f.isSpotixEvent}))}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.isSpotixEvent ? "bg-[#6b2fa5]" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isSpotixEvent ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            {form.isSpotixEvent ? (
              <Field label="Spotix Event ID" value={form.spotixEventId} onChange={v => setForm(f => ({...f, spotixEventId: v}))} placeholder="e.g. ABCD1234" />
            ) : (
              <Field label="External Ticket Link" value={form.ticketLink} onChange={v => setForm(f => ({...f, ticketLink: v}))} placeholder="https://..." />
            )}
          </div>

          <button onClick={handleSubmit} disabled={submitting || !uploadedUrl}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl bg-[#6b2fa5] text-white hover:bg-[#5a2589] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#6b2fa5]/20">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting event…</> : <><Globe className="w-4 h-4" /> Post to Discovery</>}
          </button>
        </div>
      )}

      {/* ── Manage Tab ── */}
      {tab === "manage" && (
        <div className="space-y-4">
          {/* Lookup */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <p className="text-sm font-semibold text-gray-700">Look up a Discover Event</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={lookupState} onChange={e => setLookupState(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]">
                <option value="">Select state</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input value={lookupId} onChange={e => setLookupId(e.target.value)} placeholder="Event ID"
                onKeyDown={e => e.key === "Enter" && handleLookup()}
                className="px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]" />
            </div>
            <button onClick={handleLookup} disabled={lookupLoading || !lookupState || !lookupId}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg bg-[#6b2fa5] text-white hover:bg-[#5a2589] disabled:opacity-40 transition-colors">
              {lookupLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Looking up…</> : <><Search className="w-4 h-4" /> Look up</>}
            </button>
            {lookupError && <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{lookupError}</p>}
          </div>

          {/* Event detail / edit */}
          {lookupEvent && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Image */}
              <div className="h-40 relative">
                <img src={lookupEvent.imageUrl} className="w-full h-full object-cover" alt={lookupEvent.eventName} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60" />
                <p className="absolute bottom-3 left-4 text-white font-bold text-lg">{lookupEvent.eventName}</p>
              </div>

              <div className="p-4 space-y-3">
                {editing ? (
                  /* Edit form */
                  <div className="space-y-3">
                    <Field label="Event Name" value={editForm.eventName || ""} onChange={v => setEditForm(f => ({...f, eventName: v}))} />
                    <Field label="Description" value={editForm.description || ""} onChange={v => setEditForm(f => ({...f, description: v}))} multiline />
                    <Field label="Host" value={editForm.host || ""} onChange={v => setEditForm(f => ({...f, host: v}))} />
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">State</label>
                      <select value={editForm.state || ""} onChange={e => setEditForm(f => ({...f, state: e.target.value}))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30">
                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <Field label="Location" value={editForm.location || ""} onChange={v => setEditForm(f => ({...f, location: v}))} />
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Genre</label>
                      <select value={editForm.genre || ""} onChange={e => setEditForm(f => ({...f, genre: e.target.value}))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30">
                        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <Field label="Event Start" value={editForm.eventStart || ""} onChange={v => setEditForm(f => ({...f, eventStart: v}))} type="datetime-local" />
                    <Field label="Event End" value={editForm.eventEnd || ""} onChange={v => setEditForm(f => ({...f, eventEnd: v}))} type="datetime-local" />
                    {/* Ticket policy edit */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Ticket Policy</label>
                      <div className="flex gap-2">
                        {(["free", "tbd", "listed"] as const).map(p => (
                          <button key={p} type="button"
                            onClick={() => setEditForm(f => ({...f, ticketPolicy: p}))}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${editForm.ticketPolicy === p ? "border-[#6b2fa5] bg-[#6b2fa5]/5 text-[#6b2fa5]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                            {p === "free" ? "Free" : p === "tbd" ? "TBD" : "Listed"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {editForm.ticketPolicy === "listed" && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 block">Ticket Tiers</label>
                        {(editForm.ticketTiers ?? [{ label: "", price: "" }]).map((tier, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <div className="flex-1">
                              <input
                                value={tier.label}
                                onChange={e => {
                                  const updated = [...(editForm.ticketTiers ?? [])]
                                  updated[i] = { ...updated[i], label: e.target.value }
                                  setEditForm(f => ({ ...f, ticketTiers: updated }))
                                }}
                                placeholder="e.g. Regular, VIP…"
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5] placeholder:text-gray-400"
                              />
                            </div>
                            <div className="w-28 shrink-0">
                              <input
                                type="number"
                                value={tier.price}
                                onChange={e => {
                                  const updated = [...(editForm.ticketTiers ?? [])]
                                  updated[i] = { ...updated[i], price: e.target.value }
                                  setEditForm(f => ({ ...f, ticketTiers: updated }))
                                }}
                                placeholder="₦ Price"
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5] placeholder:text-gray-400"
                              />
                            </div>
                            {(editForm.ticketTiers ?? []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (editForm.ticketTiers ?? []).filter((_, idx) => idx !== i)
                                  setEditForm(f => ({ ...f, ticketTiers: updated }))
                                }}
                                className="mt-0.5 p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setEditForm(f => ({ ...f, ticketTiers: [...(f.ticketTiers ?? []), { label: "", price: "" }] }))}
                          className="w-full py-2 text-sm font-semibold text-[#6b2fa5] border-2 border-dashed border-[#6b2fa5]/30 rounded-lg hover:border-[#6b2fa5]/60 hover:bg-[#6b2fa5]/5 transition-colors"
                        >
                          + Add tier
                        </button>
                      </div>
                    )}
                    <Field label={editForm.isSpotixEvent ? "Spotix Event ID" : "External Ticket Link"} value={(editForm.isSpotixEvent ? editForm.spotixEventId : editForm.ticketLink) || ""} onChange={v => setEditForm(f => ({...f, [f.isSpotixEvent ? "spotixEventId" : "ticketLink"]: v}))} />
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditing(false)} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                      <button onClick={handleSave} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg bg-[#6b2fa5] text-white hover:bg-[#5a2589] disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Read view */
                  <div className="space-y-2 text-sm">
                    <InfoRow label="State" value={lookupEvent.state} />
                    <InfoRow label="Host" value={lookupEvent.host} />
                    <InfoRow label="Location" value={lookupEvent.location} />
                    <InfoRow label="Genre" value={lookupEvent.genre} />
                    <InfoRow label="Starts" value={new Date(lookupEvent.eventStart).toLocaleString("en-NG")} />
                    {lookupEvent.eventEnd && <InfoRow label="Ends" value={new Date(lookupEvent.eventEnd).toLocaleString("en-NG")} />}
                    <InfoRow label="Ticket Policy" value={
                      lookupEvent.ticketPolicy === "free" ? "Free Event"
                      : lookupEvent.ticketPolicy === "listed" ? "Listed"
                      : "Pricing TBD"
                    } />
                    {lookupEvent.ticketPolicy === "listed" && lookupEvent.ticketTiers && lookupEvent.ticketTiers.length > 0 && (
                      <div className="py-1.5 border-b border-gray-50">
                        <p className="text-gray-500 text-sm mb-1.5">Ticket Tiers</p>
                        <div className="space-y-1">
                          {lookupEvent.ticketTiers.map((tier, i) => (
                            <div key={i} className="flex items-center justify-between gap-3">
                              <span className="text-gray-700 text-sm">{tier.label || "—"}</span>
                              <span className="text-gray-900 font-semibold text-sm">
                                {tier.price ? `₦${Number(tier.price).toLocaleString("en-NG")}` : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <InfoRow label="Spotix Affiliated" value={lookupEvent.isSpotixEvent ? "Yes" : "No"} />
                    {lookupEvent.isSpotixEvent && lookupEvent.spotixEventId && <InfoRow label="Event ID" value={lookupEvent.spotixEventId} mono />}
                    {!lookupEvent.isSpotixEvent && lookupEvent.ticketLink && (
                      <InfoRow label="Ticket Link" value={<a href={lookupEvent.ticketLink} target="_blank" rel="noopener noreferrer" className="text-[#6b2fa5] flex items-center gap-1 hover:underline">View <ExternalLink className="w-3 h-3" /></a>} />
                    )}
                    <InfoRow label="Posted By" value={lookupEvent.postedBy} />
                    <InfoRow label="Posted" value={new Date(lookupEvent.createdAt).toLocaleDateString("en-NG")} />
                    {canEditLookupEvent ? (
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => { setEditing(true); setEditForm(lookupEvent) }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg border-2 border-[#6b2fa5] text-[#6b2fa5] hover:bg-[#6b2fa5]/5 transition-colors">
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                        {!confirmDelete ? (
                          <button onClick={() => setConfirmDelete(true)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        ) : (
                          <button onClick={handleDelete} disabled={deleting}
                            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Confirm Delete
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        You can view this listing, but only its poster or a full admin can edit or delete it.
                      </div>
                    )}
                    {confirmDelete && !deleting && canEditLookupEvent && (
                      <button onClick={() => setConfirmDelete(false)} className="w-full text-xs text-gray-400 hover:text-gray-600">Cancel delete</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Small shared primitives ────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = "text", multiline }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; multiline?: boolean
}) {
  const cls = "w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5] placeholder:text-gray-400"
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 block mb-1.5">{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={`${cls} resize-none`} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className={`text-gray-800 font-medium text-right ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</span>
    </div>
  )
}
