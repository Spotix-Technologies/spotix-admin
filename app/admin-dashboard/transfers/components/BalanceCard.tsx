import { AlertCircle, Loader2, Wallet } from "lucide-react"

interface Props {
  balances: { currency: string; balance: number }[] | null
  balanceError: string | null
}

export function BalanceCard({ balances, balanceError }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mb-2">
        <Wallet className="w-3.5 h-3.5" /> Paystack wallet balance
      </p>
      {balanceError ? (
        <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {balanceError}</p>
      ) : balances === null ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
      ) : (
        <div className="flex flex-wrap gap-6">
          {balances.map((b) => (
            <p key={b.currency} className="text-2xl font-bold text-slate-900">
              {b.currency === "NGN" ? "₦" : b.currency + " "}{b.balance.toLocaleString()}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
