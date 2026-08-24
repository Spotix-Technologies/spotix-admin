"use client"

import { useEffect } from "react"
import { Landmark, Plus, RefreshCw } from "lucide-react"
import { useAdminSession } from "@/hooks/use-admin-session"

import { useBalance } from "./hooks/use-balance"
import { useTransferList } from "./hooks/use-transfer-list"
import { useExternalTransfers } from "./hooks/use-external-transfers"
import { usePendingApprovals } from "./hooks/use-pending-approvals"
import { useOttaKeys } from "./hooks/use-otta-keys"
import { useCreateTransfer } from "./hooks/use-create-transfer"
import { useRealtimeTransfers } from "./hooks/use-realtime-transfers"

import { BalanceCard } from "./components/BalanceCard"
import { PendingApprovalsPanel } from "./components/PendingApprovalsPanel"
import { OttaKeysPanel } from "./components/OttaKeysPanel"
import { TransferListPanel } from "./components/TransferListPanel"
import { ExternalWithdrawalsPanel } from "./components/ExternalWithdrawalsPanel"
import { CreateTransferModal } from "./components/CreateTransferModal"

export function TransfersClient() {
  useAdminSession()

  const { balances, balanceError, loadBalance } = useBalance()
  const { transfers, page, setPage, totalPages, loadingList, listError, loadList } = useTransferList()
  const { externalTransfers, externalPage, setExternalPage, loadingExternal, externalError, loadExternal } = useExternalTransfers()
  const { ottaKeys, generatingOtta, newOttaKey, setNewOttaKey, loadOttaKeys, generateOtta, revokeOtta } = useOttaKeys()

  function refreshAll() {
    loadBalance(); loadList(page); loadExternal(externalPage); loadPending(); loadOttaKeys()
  }

  const { pending, pendingError, approving, loadPending, approve } = usePendingApprovals(refreshAll)
  const createForm = useCreateTransfer(refreshAll)

  useEffect(() => { loadBalance(); loadPending(); loadOttaKeys() }, [loadBalance, loadPending, loadOttaKeys])
  useEffect(() => { loadList(page) }, [page, loadList])
  useEffect(() => { loadExternal(externalPage) }, [externalPage, loadExternal])

  // Live status pushes (a webhook resolving a transfer, another admin
  // approving, etc.) — re-fetches the list + pending approvals whenever
  // Supabase reports a change, instead of waiting on a manual refresh.
  useRealtimeTransfers(() => { loadList(page); loadPending() })

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#6b2fa5]" /> Transfers
          </h1>
          <p className="text-sm text-slate-500">Wallet-to-bank transfers, requiring every admin's sign-off (or a valid OTTA key).</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshAll} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={createForm.open}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Create Transfer
          </button>
        </div>
      </div>

      <BalanceCard balances={balances} balanceError={balanceError} />

      <PendingApprovalsPanel
        pending={pending}
        pendingError={pendingError}
        approving={approving}
        onApprove={approve}
      />

      <OttaKeysPanel
        ottaKeys={ottaKeys}
        generatingOtta={generatingOtta}
        newOttaKey={newOttaKey}
        onDismissNewKey={() => setNewOttaKey(null)}
        onGenerate={generateOtta}
        onRevoke={revokeOtta}
      />

      <TransferListPanel
        transfers={transfers}
        loadingList={loadingList}
        listError={listError}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <ExternalWithdrawalsPanel
        transfers={externalTransfers}
        loading={loadingExternal}
        error={externalError}
        page={externalPage}
        onPageChange={setExternalPage}
      />

      {createForm.showCreate && <CreateTransferModal form={createForm} onClose={createForm.close} />}
    </div>
  )
}
