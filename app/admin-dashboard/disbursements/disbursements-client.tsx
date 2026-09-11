"use client"

import { useEffect, useState } from "react"
import { HandCoins, Plus, Send, Wallet } from "lucide-react"
import { useDisbursementList } from "./hooks/use-disbursement-list"
import { usePendingDisbursementApprovals } from "./hooks/use-pending-disbursement-approvals"
import { useRequisitionList } from "./hooks/use-requisition-list"
import { usePendingRequisitionApprovals } from "./hooks/use-pending-requisition-approvals"
import { CreateDisbursementModal } from "./components/CreateDisbursementModal"
import { PendingDisbursementApprovalsPanel } from "./components/PendingDisbursementApprovalsPanel"
import { DisbursementListPanel } from "./components/DisbursementListPanel"
import { RequisitionApprovalsPanel } from "./components/RequisitionApprovalsPanel"
import { RequisitionListPanel } from "./components/RequisitionListPanel"
import { usePayments } from "@/components/payments/hooks/use-payments"
import { useWithdraw } from "@/components/payments/hooks/use-withdraw"
import { usePayoutMethods } from "@/components/payments/hooks/use-payout-methods"
import { PaymentsList } from "@/components/payments/PaymentsList"
import { PayoutMethodsPanel } from "@/components/payments/PayoutMethodsPanel"

/**
 * app/admin-dashboard/disbursements/disbursements-client.tsx
 *
 * Full admin's Disbursements page: create + approve disbursements
 * (mirrors app/admin-dashboard/transfers/transfers-client.tsx's "every
 * admin must approve" workflow), a "Requisitions" tab for reviewing +
 * approving staff fund requests submitted from any role dashboard's
 * Requisition menu item (see app/components/requisition/*), plus a
 * "My Payments" tab reusing the exact same components the four role
 * dashboards' Payments tab uses — a full admin can be a disbursement
 * (or requisition) recipient too.
 */
export default function DisbursementsClient() {
  const [tab, setTab] = useState<"manage" | "requisitions" | "my-payments">("manage")
  const [showCreate, setShowCreate] = useState(false)

  const { disbursements, page, totalPages, total, loading, error, loadDisbursements } = useDisbursementList()
  const { pending, loadingPending, loadPending, approving, rejecting, approveError, approve, reject } = usePendingDisbursementApprovals(() => loadDisbursements(page))

  const { requisitions, page: reqPage, totalPages: reqTotalPages, total: reqTotal, loading: reqLoading, error: reqError, loadRequisitions } = useRequisitionList()
  const {
    pending: pendingRequisitions, loadingPending: loadingPendingRequisitions, loadPending: loadPendingRequisitions,
    approving: approvingRequisition, rejecting: rejectingRequisition, approveError: requisitionApproveError,
    approve: approveRequisition, reject: rejectRequisition,
  } = usePendingRequisitionApprovals(() => loadRequisitions(reqPage))

  const { payments, loading: paymentsLoading, error: paymentsError, loadPayments } = usePayments()
  const { withdrawing, withdrawError, withdraw } = useWithdraw(loadPayments)
  const methodsState = usePayoutMethods()

  useEffect(() => {
    loadDisbursements(1)
    loadPending()
    loadPendingRequisitions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (tab === "requisitions") {
      loadRequisitions(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useEffect(() => {
    if (tab === "my-payments") {
      loadPayments()
      methodsState.loadMethods()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Send className="w-5 h-5 text-[#6b2fa5]" /> Disbursements
          </h1>
          <p className="text-sm text-slate-400 mt-1">Delegate funds to a team member or an entire department.</p>
        </div>
        {tab === "manage" && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" /> New disbursement
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit flex-wrap">
        <button
          onClick={() => setTab("manage")}
          className={`text-sm font-semibold px-3.5 py-1.5 rounded-md ${tab === "manage" ? "bg-white text-[#6b2fa5] shadow-sm" : "text-slate-500"}`}
        >
          Manage
        </button>
        <button
          onClick={() => setTab("requisitions")}
          className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-md ${tab === "requisitions" ? "bg-white text-[#6b2fa5] shadow-sm" : "text-slate-500"}`}
        >
          <HandCoins className="w-3.5 h-3.5" /> Requisitions
          {pendingRequisitions.length > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{pendingRequisitions.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("my-payments")}
          className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-md ${tab === "my-payments" ? "bg-white text-[#6b2fa5] shadow-sm" : "text-slate-500"}`}
        >
          <Wallet className="w-3.5 h-3.5" /> My Payments
        </button>
      </div>

      {tab === "manage" ? (
        <>
          <PendingDisbursementApprovalsPanel pending={pending} loading={loadingPending} approving={approving} rejecting={rejecting} approveError={approveError} onApprove={approve} onReject={reject} />
          <DisbursementListPanel disbursements={disbursements} loading={loading} error={error} page={page} totalPages={totalPages} total={total} onPageChange={loadDisbursements} />
        </>
      ) : tab === "requisitions" ? (
        <>
          <p className="text-sm text-slate-400 -mt-2">Fund requests raised from any dashboard's Requisition menu item — every admin must approve before the requester can claim it.</p>
          <RequisitionApprovalsPanel
            pending={pendingRequisitions}
            loading={loadingPendingRequisitions}
            approving={approvingRequisition}
            rejecting={rejectingRequisition}
            approveError={requisitionApproveError}
            onApprove={approveRequisition}
            onReject={rejectRequisition}
          />
          <RequisitionListPanel requisitions={requisitions} loading={reqLoading} error={reqError} page={reqPage} totalPages={reqTotalPages} total={reqTotal} onPageChange={loadRequisitions} />
        </>
      ) : (
        <>
          <PayoutMethodsPanel methodsState={methodsState} />
          <PaymentsList
            payments={payments}
            loading={paymentsLoading}
            error={paymentsError}
            withdrawing={withdrawing}
            withdrawError={withdrawError}
            hasPayoutMethod={methodsState.methods.length > 0}
            onWithdraw={withdraw}
          />
        </>
      )}

      {showCreate && (
        <CreateDisbursementModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { loadDisbursements(1); loadPending() }}
        />
      )}
    </div>
  )
}
