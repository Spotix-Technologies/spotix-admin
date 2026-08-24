import type { Bank } from "../types"

interface Props {
  banks: Bank[]
  bankCode: string
  bankQuery: string
  showOptions: boolean
  onQueryChange: (value: string) => void
  onSelect: (bank: Bank) => void
  onFocus: () => void
  onBlur: () => void
}

export function BankSearchInput({ banks, bankCode, bankQuery, showOptions, onQueryChange, onSelect, onFocus, onBlur }: Props) {
  const matches = banks.filter((b) => b.name.toLowerCase().includes(bankQuery.toLowerCase()))

  return (
    <div className="relative">
      <input
        value={bankQuery}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Search bank…"
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300"
      />
      {bankCode && (
        <p className="text-[11px] text-emerald-600 mt-1">Code: {bankCode}</p>
      )}
      {showOptions && bankQuery && !bankCode && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">No banks match “{bankQuery}”</p>
          ) : (
            matches.map((b) => (
              <button
                type="button"
                key={b.code}
                onMouseDown={() => onSelect(b)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 text-slate-700"
              >
                {b.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
