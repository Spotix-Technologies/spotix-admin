import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Building2, CheckCircle2, Loader2, Search, Users, UserRound, X } from "lucide-react"
import { useCreateDisbursement } from "../hooks/use-create-disbursement"
import { useRoster } from "../hooks/use-roster"
import { DEPARTMENT_OPTIONS } from "../types"

interface Props {
  onClose: () => void
  onCreated: () => void
}

export function CreateDisbursementModal({ onClose, onCreated }: Props) {
  const [type, setType] = useState<"member" | "department">("member")
  const [selectedUids, setSelectedUids] = useState<string[]>([])
  const [department, setDepartment] = useState("")
  const [search, setSearch] = useState("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")

  const { roster, loadingRoster, loadRoster } = useRoster()
  const { creating, createError, createMessage, createDisbursement } = useCreateDisbursement(() => {
    onCreated()
    setTimeout(onClose, 1400)
  })

  useEffect(() => { loadRoster() }, [loadRoster])

  const filteredRoster = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roster
    return roster.filter((a) => a.username.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.fullName.toLowerCase().includes(q))
  }, [roster, search])

  function toggleUid(uid: string) {
    setSelectedUids((prev) => (prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]))
  }

  const amountValue = Number(amount)
  const canSubmit =
    amountValue > 0 &&
    reason.trim().length > 0 &&
    (type === "member" ? selectedUids.length > 0 : department.length > 0)

  async function handleSubmit() {
    if (!canSubmit) return
    await createDisbursement({
      type,
      amount: amountValue,
      reason: reason.trim(),
      ...(type === "member" ? { recipientUids: selectedUids } : { department }),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">New Disbursement</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Disburse to</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType("member")}
                className={`flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg border ${type === "member" ? "bg-violet-50 border-violet-300 text-[#6b2fa5]" : "border-slate-200 text-slate-500"}`}
              >
                <UserRound className="w-4 h-4" /> Team member(s)
              </button>
              <button
                onClick={() => setType("department")}
                className={`flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg border ${type === "department" ? "bg-violet-50 border-violet-300 text-[#6b2fa5]" : "border-slate-200 text-slate-500"}`}
              >
                <Building2 className="w-4 h-4" /> Department
              </button>
            </div>
          </div>

          {type === "member" ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">
                Select recipient(s) {selectedUids.length > 0 && <span className="text-[#6b2fa5]">({selectedUids.length} selected)</span>}
              </p>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-300" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-full text-sm border border-slate-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:border-violet-300"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
                {loadingRoster ? (
                  <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-300" /></div>
                ) : filteredRoster.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No admins found</p>
                ) : (
                  filteredRoster.map((a) => (
                    <label key={a.uid} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={selectedUids.includes(a.uid)} onChange={() => toggleUid(a.uid)} className="accent-[#6b2fa5]" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{a.fullName || a.username}</p>
                        <p className="text-xs text-slate-400 truncate">{a.email} · {a.role}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              {selectedUids.length > 1 && (
                <p className="text-[11px] text-slate-400 mt-1.5">Each selected member receives the full amount below — it isn't split between them.</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Department</p>
              <div className="grid grid-cols-2 gap-2">
                {DEPARTMENT_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDepartment(d.value)}
                    className={`text-sm font-medium px-3 py-2 rounded-lg border text-left ${department === d.value ? "bg-violet-50 border-violet-300 text-[#6b2fa5]" : "border-slate-200 text-slate-600"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <Users className="w-3 h-3" /> Everyone in this department will see it on their Payments tab — the first to withdraw claims it for the team.
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Amount {type === "member" && selectedUids.length > 1 ? "(each)" : ""}</p>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-slate-400">₦</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.00"
                className="w-full text-sm border border-slate-200 rounded-lg pl-7 pr-3 py-2 outline-none focus:border-violet-300"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Reason</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. August performance bonus"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300 resize-none"
            />
          </div>

          {createError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" /> {createError}</p>
          )}
          {createMessage && (
            <p className="text-sm text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 shrink-0" /> {createMessage}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || creating}
            className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-4 py-2.5 rounded-lg disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create disbursement
          </button>
          <p className="text-[11px] text-slate-400 text-center">Every full admin — including you — must approve before recipients can withdraw.</p>
        </div>
      </div>
    </div>
  )
}
