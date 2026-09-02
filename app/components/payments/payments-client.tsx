"use client"

import { useEffect } from "react"
import { Wallet } from "lucide-react"
import { usePayments } from "./hooks/use-payments"
import { useWithdraw } from "./hooks/use-withdraw"
import { usePayoutMethods } from "./hooks/use-payout-methods"
import { PaymentsList } from "./PaymentsList"
import { PayoutMethodsPanel } from "./PayoutMethodsPanel"

/**
 * app/components/payments/payments-client.tsx
 *
 * The "Payments" tab surfaced on the Customer Support, Marketing, IT,
 * and Exec Assistant dashboards (see the thin page.tsx wrapper in each
 * of those dashboards' payments/ folder) — shows every disbursement a
 * team member or their department has been sent, and lets them withdraw
 * once they have a payout method on file.
 *
 * Full admins get the same view baked into their Disbursements page as
 * a "My Payments" panel, since a full admin can also be a disbursement
 * recipient — see app/admin-dashboard/disbursements/disbursements-client.tsx.
 */
export default function PaymentsClient() {
  const { payments, loading, error, loadPayments } = usePayments()
  const { withdrawing, withdrawError, withdraw } = useWithdraw(loadPayments)
  const methodsState = usePayoutMethods()

  useEffect(() => {
    loadPayments()
    methodsState.loadMethods()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#6b2fa5]" /> Payments
        </h1>
        <p className="text-sm text-slate-400 mt-1">Funds disbursed to you personally, or shared with your department.</p>
      </div>

      <PayoutMethodsPanel methodsState={methodsState} />

      <PaymentsList
        payments={payments}
        loading={loading}
        error={error}
        withdrawing={withdrawing}
        withdrawError={withdrawError}
        hasPayoutMethod={methodsState.methods.length > 0}
        onWithdraw={withdraw}
      />
    </div>
  )
}
