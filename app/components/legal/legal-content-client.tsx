"use client"

import { useState, useEffect, useCallback, useMemo, ReactNode, InputHTMLAttributes } from "react"
import {
  Scale, Loader2, Save, UploadCloud, Trash2, Plus, Eye, Pencil,
  CheckCircle2, AlertTriangle, X, History,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface PolicyType {
  slug: string
  label: string
  sort_order: number
}

interface LegalVersionRow {
  id: string
  slug: string
  version: string
  title: string
  content: string
  last_revised: string
  changelog: string | null
  is_published: boolean
  published_at: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

interface DraftForm {
  title: string
  version: string
  content: string
  lastRevised: string
  changelog: string
}

function emptyDraftFor(label: string): DraftForm {
  return {
    title: label,
    version: "v1",
    content: "",
    lastRevised: new Date().toISOString().slice(0, 10),
    changelog: "",
  }
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs text-gray-500">{children}</label>
}

function FieldInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props
  return (
    <input
      className={`flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-[#6b2fa5] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    />
  )
}

/* ─────────────────────────────────────────────
   MINIMAL, DEPENDENCY-FREE PREVIEW RENDERER
───────────────────────────────────────────── */
function ContentPreview({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/).filter((b) => b.trim().length > 0)
  if (blocks.length === 0) {
    return <p className="text-sm text-gray-400 italic">Nothing to preview yet.</p>
  }
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const trimmed = block.trim()
        if (/^###\s+/.test(trimmed)) {
          return (
            <h4 key={i} className="text-sm font-semibold text-gray-900 mt-2">
              {trimmed.replace(/^###\s+/, "")}
            </h4>
          )
        }
        if (/^##\s+/.test(trimmed)) {
          return (
            <h3 key={i} className="text-base font-semibold text-gray-900 mt-3">
              {trimmed.replace(/^##\s+/, "")}
            </h3>
          )
        }
        if (/^#\s+/.test(trimmed)) {
          return (
            <h2 key={i} className="text-lg font-bold text-gray-900 mt-3">
              {trimmed.replace(/^#\s+/, "")}
            </h2>
          )
        }
        if (/^(-|\*)\s+/.test(trimmed)) {
          const items = trimmed.split("\n").map((l) => l.replace(/^(-|\*)\s+/, "").trim())
          return (
            <ul key={i} className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────
   NEW DOCUMENT TYPE DIALOG
───────────────────────────────────────────── */
function NewDocumentTypeDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (type: PolicyType) => void
}) {
  const [label, setLabel] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const autoSlug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  const handleCreate = async () => {
    if (!label.trim()) {
      setError("Give the document a title")
      return
    }
    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/legal/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), slug: slugTouched ? slug : undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create document type")
      onCreated(data.type)
      setLabel("")
      setSlug("")
      setSlugTouched(false)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create document type")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New document type</DialogTitle>
          <DialogDescription>
            This adds a new tab to the public legal site. You'll write its content afterwards.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4 space-y-4">
          <div>
            <FieldLabel>Document title</FieldLabel>
            <FieldInput
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Community Guidelines"
              className="mt-1"
              autoFocus
            />
          </div>
          <div>
            <FieldLabel>URL slug</FieldLabel>
            <FieldInput
              value={slugTouched ? slug : autoSlug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              placeholder="community-guidelines"
              className="mt-1 font-mono text-xs"
            />
            <p className="text-[11px] text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only.</p>
          </div>
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="bg-transparent">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={creating}
            className="bg-[#6b2fa5] hover:bg-[#5a2589] text-white"
          >
            {creating && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─────────────────────────────────────────────
   MAIN CLIENT
───────────────────────────────────────────── */
export function LegalContentClient({ adminName }: { adminName?: string }) {
  const [policyTypes, setPolicyTypes] = useState<PolicyType[]>([])
  const [typesLoading, setTypesLoading] = useState(true)
  const [newTypeDialogOpen, setNewTypeDialogOpen] = useState(false)

  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [versionsBySlug, setVersionsBySlug] = useState<Record<string, LegalVersionRow[]>>({})
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<DraftForm>(emptyDraftFor(""))
  const [creatingNew, setCreatingNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingType, setDeletingType] = useState(false)
  const [mode, setMode] = useState<"edit" | "preview">("edit")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const activeType = useMemo(
    () => policyTypes.find((t) => t.slug === activeSlug) ?? null,
    [policyTypes, activeSlug],
  )
  const versions = activeSlug ? (versionsBySlug[activeSlug] ?? []) : []
  const selected = useMemo(
    () => versions.find((v) => v.id === selectedId) ?? null,
    [versions, selectedId],
  )

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchTypes = useCallback(async (selectSlug?: string) => {
    setTypesLoading(true)
    try {
      const res = await fetch("/api/v1/legal/types")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load document types")
      const types: PolicyType[] = data.types ?? []
      setPolicyTypes(types)
      const fallback = selectSlug ?? types[0]?.slug ?? null
      setActiveSlug(fallback)
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to load document types")
    } finally {
      setTypesLoading(false)
    }
  }, [])

  const fetchVersions = useCallback(async (slug: string, typeLabel: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/legal?slug=${slug}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load versions")
      const rows: LegalVersionRow[] = data.versions ?? []
      setVersionsBySlug((prev) => ({ ...prev, [slug]: rows }))

      const published = rows.find((r) => r.is_published)
      const toSelect = published ?? rows[0] ?? null
      if (toSelect) {
        setSelectedId(toSelect.id)
        setForm({
          title: toSelect.title,
          version: toSelect.version,
          content: toSelect.content,
          lastRevised: toSelect.last_revised,
          changelog: toSelect.changelog ?? "",
        })
        setCreatingNew(false)
      } else {
        setSelectedId(null)
        setForm(emptyDraftFor(typeLabel))
        setCreatingNew(true)
      }
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to load versions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTypes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeSlug && activeType) fetchVersions(activeSlug, activeType.label)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug])

  const handleSelectVersion = (row: LegalVersionRow) => {
    setSelectedId(row.id)
    setCreatingNew(false)
    setForm({
      title: row.title,
      version: row.version,
      content: row.content,
      lastRevised: row.last_revised,
      changelog: row.changelog ?? "",
    })
    setMode("edit")
  }

  const handleStartNewVersion = () => {
    const latest = versions[0]
    setCreatingNew(true)
    setSelectedId(null)
    setForm({
      title: latest?.title ?? activeType?.label ?? "",
      version: "",
      content: latest?.content ?? "",
      lastRevised: new Date().toISOString().slice(0, 10),
      changelog: "",
    })
    setMode("edit")
  }

  const handleSave = async () => {
    if (!activeSlug) return
    if (!form.title.trim() || !form.version.trim()) {
      showMessage("error", "Title and version label are required")
      return
    }
    setSaving(true)
    try {
      if (creatingNew) {
        const res = await fetch("/api/v1/legal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: activeSlug,
            version: form.version,
            title: form.title,
            content: form.content,
            lastRevised: form.lastRevised,
            changelog: form.changelog,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to create version")
        showMessage("success", `${form.version} saved as a draft`)
      } else if (selectedId) {
        const res = await fetch(`/api/v1/legal/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            version: form.version,
            content: form.content,
            lastRevised: form.lastRevised,
            changelog: form.changelog,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to save changes")
        showMessage("success", "Changes saved")
      }
      await fetchVersions(activeSlug, activeType?.label ?? "")
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!selected || creatingNew || !activeSlug) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/v1/legal/${selected.id}/publish`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to publish")
      showMessage("success", `${selected.version} is now live`)
      await fetchVersions(activeSlug, activeType?.label ?? "")
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to publish")
    } finally {
      setPublishing(false)
    }
  }

  const handleDelete = async () => {
    if (!selected || creatingNew || !activeSlug) return
    if (selected.is_published) {
      showMessage("error", "Publish another version before deleting this one")
      return
    }
    if (!confirm(`Delete ${selected.version} of ${selected.title}? This can't be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/legal/${selected.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete")
      showMessage("success", "Draft deleted")
      await fetchVersions(activeSlug, activeType?.label ?? "")
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteType = async () => {
    if (!activeType) return
    if (versions.length > 0) return
    if (!confirm(`Remove "${activeType.label}" as a document type? Its tab will disappear from the site.`)) return
    setDeletingType(true)
    try {
      const res = await fetch(`/api/v1/legal/types/${activeType.slug}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete document type")
      showMessage("success", "Document type removed")
      await fetchTypes()
    } catch (err) {
      showMessage("error", err instanceof Error ? err.message : "Failed to delete document type")
    } finally {
      setDeletingType(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Scale className="w-5 h-5 text-[#6b2fa5]" />
          Legal Content
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Edit the documents shown on the public legal site — add a new document type any time; it appears
          there as a tab.
          {adminName ? ` Signed in as ${adminName}.` : ""}
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-current opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Document type tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {typesLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          policyTypes.map((type) => (
            <button
              key={type.slug}
              onClick={() => setActiveSlug(type.slug)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeSlug === type.slug
                  ? "bg-[#6b2fa5] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {type.label}
            </button>
          ))
        )}
        <button
          onClick={() => setNewTypeDialogOpen(true)}
          className="px-3 py-1.5 rounded-full text-sm font-medium text-[#6b2fa5] border border-dashed border-[#6b2fa5]/50 hover:bg-[#6b2fa5]/5 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          New document
        </button>
      </div>

      <NewDocumentTypeDialog
        open={newTypeDialogOpen}
        onOpenChange={setNewTypeDialogOpen}
        onCreated={(type) => {
          setPolicyTypes((prev) => [...prev, type].sort((a, b) => a.sort_order - b.sort_order))
          setActiveSlug(type.slug)
        }}
      />

      {activeSlug && (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          {/* Version list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#6b2fa5]" />
                Versions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1.5">
              {loading ? (
                <div className="flex items-center justify-center py-6 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : versions.length === 0 ? (
                <div className="py-2 space-y-2">
                  <p className="text-xs text-gray-400 italic">No versions yet — create the first one.</p>
                  <Button
                    onClick={handleDeleteType}
                    disabled={deletingType}
                    variant="outline"
                    size="sm"
                    className="w-full border-red-300 text-red-600 hover:bg-red-600 hover:text-white bg-transparent text-xs"
                  >
                    {deletingType ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                    )}
                    Remove this document type
                  </Button>
                </div>
              ) : (
                versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleSelectVersion(v)}
                    className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-colors ${
                      !creatingNew && selectedId === v.id
                        ? "bg-[#6b2fa5]/10 border border-[#6b2fa5]/30"
                        : "border border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900">{v.version}</span>
                      {v.is_published && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 mt-0.5">Revised {v.last_revised}</p>
                  </button>
                ))
              )}
              {versions.length > 0 && (
                <Button
                  onClick={handleStartNewVersion}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 border-[#6b2fa5] text-[#6b2fa5] hover:bg-[#6b2fa5] hover:text-white bg-transparent text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New Version
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Editor */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">
                  {creatingNew ? "New draft" : selected ? `Editing ${selected.version}` : "No version selected"}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {creatingNew
                    ? "This will be saved as an unpublished draft until you publish it."
                    : selected?.is_published
                      ? "This version is currently live on the site."
                      : "Draft — not visible on the site until published."}
                </CardDescription>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => setMode("edit")}
                  className={`p-1.5 rounded-md ${mode === "edit" ? "bg-[#6b2fa5] text-white" : "bg-gray-100 text-gray-500"}`}
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setMode("preview")}
                  className={`p-1.5 rounded-md ${mode === "preview" ? "bg-[#6b2fa5] text-white" : "bg-gray-100 text-gray-500"}`}
                  title="Preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <FieldLabel>Document title</FieldLabel>
                  <FieldInput
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <FieldLabel>Version label</FieldLabel>
                  <FieldInput
                    value={form.version}
                    onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                    placeholder="v1"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Last revised</FieldLabel>
                  <FieldInput
                    type="date"
                    value={form.lastRevised}
                    onChange={(e) => setForm((f) => ({ ...f, lastRevised: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <FieldLabel>Changelog (shown for this version)</FieldLabel>
                  <FieldInput
                    value={form.changelog}
                    onChange={(e) => setForm((f) => ({ ...f, changelog: e.target.value }))}
                    placeholder="What changed in this version"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Content</FieldLabel>
                {mode === "edit" ? (
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    rows={18}
                    placeholder={"# Section title\n\nBody text...\n\n## Sub-section\n\n- point one\n- point two"}
                    className="mt-1 font-mono text-xs"
                  />
                ) : (
                  <div className="mt-1 border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-[420px] overflow-y-auto">
                    <ContentPreview content={form.content} />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#6b2fa5] hover:bg-[#5a2589] text-white text-sm"
                  size="sm"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  {creatingNew ? "Save Draft" : "Save Changes"}
                </Button>

                {!creatingNew && selected && !selected.is_published && (
                  <Button
                    onClick={handlePublish}
                    disabled={publishing}
                    variant="outline"
                    size="sm"
                    className="border-green-600 text-green-700 hover:bg-green-600 hover:text-white bg-transparent text-sm"
                  >
                    {publishing ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Publish live
                  </Button>
                )}

                {!creatingNew && selected && !selected.is_published && (
                  <Button
                    onClick={handleDelete}
                    disabled={deleting}
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white bg-transparent text-sm ml-auto"
                  >
                    {deleting ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Delete draft
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
