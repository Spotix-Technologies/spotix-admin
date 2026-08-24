"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Loader2, AlertCircle, CheckCircle, Settings2, Plus, Trash2,
  ChevronRight, ChevronDown, FolderTree, Users, Save, RotateCcw,
} from "lucide-react"

/**
 * Structure Limits & Categories panel — lives inside the Votes section's
 * poll-detail view (see votes-client.tsx "limits" tab).
 *
 * Talks to /api/v1/{apiBase}/limits and /api/v1/{apiBase}/categories,
 * where apiBase is "admin-polls" for the admin dashboard or
 * "support-polls" for the customer-support dashboard — each dashboard has
 * its own separate API route files (see those routes' header comments for
 * why), this component just gets told which base to call.
 *
 * Limits are admin-only to EDIT (canEditLimits=false renders them
 * read-only for customer-support). Categories can be edited by both.
 */

interface LimitsState {
  maxSingleContestants: number
  maxGroupTopCategories: number
  maxGroupTotalSubcategories: number
  maxContestantsPerCategory: number
}

interface CategoryNode {
  categoryId: string
  name: string
  pollPrice: number
  contestants: { contestantId: string; name: string; votes?: number; image?: string }[]
  subcategories: CategoryNode[]
}

const LIMIT_FIELDS: { key: keyof LimitsState; label: string; hint: string }[] = [
  { key: "maxSingleContestants", label: "Max contestants (single poll)", hint: "Applies only to flat, non-category polls" },
  { key: "maxGroupTopCategories", label: "Max top-level categories (group poll)", hint: "Tier-1 categories in a group poll" },
  { key: "maxGroupTotalSubcategories", label: "Max total sub-categories (group poll)", hint: "Tier-2+ across the whole poll; top-level doesn't count" },
  { key: "maxContestantsPerCategory", label: "Max contestants per category", hint: "Applies to every category at any nesting level" },
]

function newId() {
  return `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export default function PollLimitsPanel({
  pollId,
  pollType,
  apiBase,
  canEditLimits,
}: {
  pollId: string
  pollType: "single" | "group"
  apiBase: "admin-polls" | "support-polls"
  canEditLimits: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [defaults, setDefaults] = useState<LimitsState | null>(null)
  const [limits, setLimits] = useState<LimitsState | null>(null)
  const [override, setOverride] = useState<Partial<LimitsState>>({})
  const [savingLimits, setSavingLimits] = useState(false)

  const [categories, setCategories] = useState<CategoryNode[] | null>(null)
  const [savingCategories, setSavingCategories] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const loadLimits = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/${apiBase}/limits?pollId=${encodeURIComponent(pollId)}`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load limits")
      setDefaults(data.defaults)
      setLimits(data.resolved)
      setOverride(data.override ?? {})
    } catch (e: any) {
      setError(e.message || "Failed to load limits")
    }
  }, [apiBase, pollId])

  const loadCategories = useCallback(async () => {
    if (pollType !== "group") return
    try {
      const res = await fetch(`/api/v1/${apiBase}/categories?pollId=${encodeURIComponent(pollId)}`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load categories")
      setCategories(data.categories ?? [])
    } catch (e: any) {
      setError(e.message || "Failed to load categories")
    }
  }, [apiBase, pollId, pollType])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadLimits(), loadCategories()]).finally(() => setLoading(false))
  }, [loadLimits, loadCategories])

  async function saveLimits() {
    setSavingLimits(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/v1/${apiBase}/limits`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, ...override }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save limits")
      setLimits(data.resolved)
      setOverride(data.override ?? {})
      setMessage("Limits updated")
    } catch (e: any) {
      setError(e.message || "Failed to save limits")
    } finally {
      setSavingLimits(false)
    }
  }

  async function resetField(key: keyof LimitsState) {
    if (!canEditLimits) return
    setOverride((prev) => ({ ...prev, [key]: null }))
  }

  async function saveCategories() {
    if (!categories) return
    setSavingCategories(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/v1/${apiBase}/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, categories }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save categories")
      setCategories(data.categories ?? categories)
      setMessage("Categories updated")
    } catch (e: any) {
      setError(e.message || "Failed to save categories")
    } finally {
      setSavingCategories(false)
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function updateNode(tree: CategoryNode[], id: string, patch: Partial<CategoryNode>): CategoryNode[] {
    return tree.map((n) =>
      n.categoryId === id
        ? { ...n, ...patch }
        : { ...n, subcategories: updateNode(n.subcategories ?? [], id, patch) }
    )
  }

  function removeNode(tree: CategoryNode[], id: string): CategoryNode[] {
    return tree
      .filter((n) => n.categoryId !== id)
      .map((n) => ({ ...n, subcategories: removeNode(n.subcategories ?? [], id) }))
  }

  function addSubcategory(parentId: string | null) {
    if (!categories) return
    const node: CategoryNode = { categoryId: newId(), name: "New category", pollPrice: 0, contestants: [], subcategories: [] }
    if (parentId === null) {
      setCategories([...categories, node])
    } else {
      const addTo = (tree: CategoryNode[]): CategoryNode[] =>
        tree.map((n) =>
          n.categoryId === parentId
            ? { ...n, subcategories: [...(n.subcategories ?? []), node] }
            : { ...n, subcategories: addTo(n.subcategories ?? []) }
        )
      setCategories(addTo(categories))
      setExpanded((prev) => new Set(prev).add(parentId))
    }
  }

  function addContestant(categoryId: string) {
    if (!categories) return
    const contestant = { contestantId: newId(), name: "New contestant", votes: 0 }
    setCategories(
      updateNodeAppendContestant(categories, categoryId, contestant)
    )
  }

  function updateNodeAppendContestant(tree: CategoryNode[], id: string, contestant: any): CategoryNode[] {
    return tree.map((n) =>
      n.categoryId === id
        ? { ...n, contestants: [...(n.contestants ?? []), contestant] }
        : { ...n, subcategories: updateNodeAppendContestant(n.subcategories ?? [], id, contestant) }
    )
  }

  function removeContestant(categoryId: string, contestantId: string) {
    if (!categories) return
    const strip = (tree: CategoryNode[]): CategoryNode[] =>
      tree.map((n) =>
        n.categoryId === categoryId
          ? { ...n, contestants: (n.contestants ?? []).filter((c) => c.contestantId !== contestantId) }
          : { ...n, subcategories: strip(n.subcategories ?? []) }
      )
    setCategories(strip(categories))
  }

  function renderTree(nodes: CategoryNode[], depth = 0) {
    return (
      <div className={depth > 0 ? "ml-4 pl-3 border-l border-slate-200 space-y-2" : "space-y-2"}>
        {nodes.map((node) => {
          const hasSubs = (node.subcategories ?? []).length > 0
          const isOpen = expanded.has(node.categoryId)
          return (
            <div key={node.categoryId} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center gap-2 p-2">
                {(hasSubs || (node.contestants ?? []).length > 0) ? (
                  <button onClick={() => toggleExpand(node.categoryId)} className="p-1 text-slate-400 hover:text-slate-600">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                ) : (
                  <span className="w-5" />
                )}
                <input
                  value={node.name}
                  onChange={(e) => setCategories((prev) => updateNode(prev ?? [], node.categoryId, { name: e.target.value }))}
                  className="flex-1 text-sm font-medium text-gray-800 border border-transparent hover:border-slate-200 focus:border-violet-300 rounded px-2 py-1 outline-none min-w-0"
                />
                {!hasSubs && (
                  <input
                    type="number"
                    min={0}
                    value={node.pollPrice}
                    onChange={(e) => setCategories((prev) => updateNode(prev ?? [], node.categoryId, { pollPrice: Number(e.target.value) }))}
                    className="w-24 text-xs text-gray-600 border border-slate-200 rounded px-2 py-1 outline-none focus:border-violet-300"
                    placeholder="₦ / vote"
                  />
                )}
                <button
                  onClick={() => addSubcategory(node.categoryId)}
                  title="Add sub-category"
                  className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded"
                >
                  <FolderTree className="w-3.5 h-3.5" />
                </button>
                {!hasSubs && (
                  <button
                    onClick={() => addContestant(node.categoryId)}
                    title="Add contestant"
                    className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setCategories((prev) => removeNode(prev ?? [], node.categoryId))}
                  title="Delete category"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {isOpen && (
                <div className="px-2 pb-2 space-y-2">
                  {!hasSubs && (node.contestants ?? []).length > 0 && (
                    <div className="ml-7 space-y-1">
                      {node.contestants.map((c) => (
                        <div key={c.contestantId} className="flex items-center gap-2 text-xs bg-slate-50 rounded px-2 py-1.5">
                          <input
                            value={c.name}
                            onChange={(e) =>
                              setCategories((prev) =>
                                updateNode(prev ?? [], node.categoryId, {
                                  contestants: node.contestants.map((x) =>
                                    x.contestantId === c.contestantId ? { ...x, name: e.target.value } : x
                                  ),
                                })
                              )
                            }
                            className="flex-1 bg-transparent outline-none min-w-0"
                          />
                          <span className="text-gray-400 shrink-0">{(c.votes ?? 0).toLocaleString("en-NG")} votes</span>
                          <button
                            onClick={() => removeContestant(node.categoryId, c.contestantId)}
                            disabled={(c.votes ?? 0) > 0}
                            title={(c.votes ?? 0) > 0 ? "Cannot remove a contestant that already has votes" : "Remove"}
                            className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {hasSubs && renderTree(node.subcategories, depth + 1)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {message && (
        <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> {message}
        </div>
      )}

      {/* ── Structure limits ── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
          <Settings2 className="w-3.5 h-3.5" /> Structure limits
          {!canEditLimits && <span className="font-normal text-gray-400">(view only)</span>}
        </p>
        <div className="space-y-2">
          {LIMIT_FIELDS.map(({ key, label, hint }) => {
            const isOverridden = override[key] !== undefined && override[key] !== null
            return (
              <div key={key} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{label}</p>
                  <p className="text-[11px] text-gray-400">{hint}</p>
                </div>
                <input
                  type="number"
                  min={1}
                  disabled={!canEditLimits}
                  value={override[key] ?? limits?.[key] ?? defaults?.[key] ?? ""}
                  onChange={(e) =>
                    setOverride((prev) => ({ ...prev, [key]: e.target.value ? Number(e.target.value) : undefined }))
                  }
                  className="w-20 text-sm text-center border border-slate-200 rounded px-2 py-1 outline-none focus:border-violet-300 disabled:bg-slate-100 disabled:text-gray-400"
                />
                {canEditLimits && isOverridden && (
                  <button
                    onClick={() => resetField(key)}
                    title={`Reset to platform default (${defaults?.[key]})`}
                    className="p-1.5 text-slate-400 hover:text-violet-600 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {canEditLimits && (
          <button
            onClick={saveLimits}
            disabled={savingLimits}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {savingLimits ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save limits
          </button>
        )}
      </div>

      {/* ── Categories ── */}
      {pollType === "group" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5" /> Categories
            </p>
            <button
              onClick={() => addSubcategory(null)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:bg-violet-50 px-2 py-1 rounded"
            >
              <Plus className="w-3.5 h-3.5" /> Top-level category
            </button>
          </div>

          {categories && categories.length > 0 ? (
            renderTree(categories)
          ) : (
            <p className="text-sm text-slate-400 py-6 text-center">No categories yet</p>
          )}

          <button
            onClick={saveCategories}
            disabled={savingCategories || !categories}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {savingCategories ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save categories
          </button>
          <p className="text-[11px] text-gray-400 mt-1.5">
            A contestant that already has votes can't be removed. Changes are picked up by the booker app on its
            next cache refresh (within an hour).
          </p>
        </div>
      )}
    </div>
  )
}
