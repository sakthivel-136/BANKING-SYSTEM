"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, X, RefreshCcw } from "lucide-react"
import api from "@/services/api"
import { format } from "date-fns"

interface ManagerTransactionModalProps {
  account: any
  onClose: () => void
}

export function ManagerTransactionModal({ account, onClose }: ManagerTransactionModalProps) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reversingId, setReversingId] = useState<string | null>(null)
  const [bulkReversing, setBulkReversing] = useState(false)

  useEffect(() => {
    loadTransactions()
  }, [account.account_id])

  const loadTransactions = async () => {
    try {
      const res = await api.get(`/transactions/${account.account_id}`)
      setTransactions(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const requestReversal = async (txn: any) => {
    const reason = prompt("Enter reason for reversal request:")
    if (reason === null) return

    setReversingId(txn.transaction_id)
    try {
      await api.post(`/reversals/from-complaint/DIRECT_${txn.transaction_id.slice(0, 8)}`, {
        transaction_id: txn.transaction_id,
        amount: txn.amount,
        type: "charge_double",
        reason: `MGR DIRECT: ${reason}`,
      })
      alert("Reversal request successfully sent to MD for approval.")
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create reversal request.")
    } finally {
      setReversingId(null)
    }
  }

  const handleBulkReversal = async () => {
    if (!confirm("Multiple charges detected. Are you sure you want to reverse ALL duplicate monthly charges for this account at once?")) return
    
    setBulkReversing(true)
    try {
      await api.post(`/reversals/bulk-account-charges/${account.account_id}`)
      alert("All duplicate charges consolidated into one reversal request sent to MD for approval.")
      onClose()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to initiate bulk reversal.")
    } finally {
      setBulkReversing(false)
    }
  }

  // Filter for matching charges in the current month
  const currentMonthCharges = transactions.filter(t => {
    const isCharge = t.description?.toLowerCase().includes("monthly notification charge") || 
                     t.description?.toLowerCase().includes("min balance fine")
    const date = new Date(t.created_at)
    const now = new Date()
    return isCharge && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })

  const hasDuplicateCharges = currentMonthCharges.length > 1

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <CardHeader className="bg-gray-50 border-b flex flex-row justify-between items-center py-4 px-6">
          <div>
            <CardTitle className="text-xl font-bold">Transaction History</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Account: <span className="font-mono font-bold text-gray-700">{account.account_number}</span> ({account.account_type})
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
            <X className="w-6 h-6" />
          </button>
        </CardHeader>
        <CardContent className="overflow-y-auto p-0 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-gray-500 font-medium">Fetching transaction details...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 font-bold">Date & Time</th>
                    <th className="px-6 py-4 font-bold">Type</th>
                    <th className="px-6 py-4 font-bold">Description</th>
                    <th className="px-6 py-4 font-bold text-right">Amount</th>
                    <th className="px-6 py-4 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((t) => {
                    const isCredit = ["deposit", "transfer_receive", "refund", "reversal"].includes(t.transaction_type)
                    return (
                      <tr key={t.transaction_id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                          {format(new Date(t.created_at), "MMM d, yyyy HH:mm")}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {t.transaction_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-900 font-medium max-w-[200px] truncate">{t.description || t.receiver_account || "—"}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5 uppercase">ID: {t.transaction_id.slice(0, 8)}...</p>
                        </td>
                        <td className={`px-6 py-4 text-right font-bold text-base ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                          {isCredit ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          {/* Hide individual reversal button for monthly charges if it's the only one, as per user request */}
                          {(!t.description?.toLowerCase().includes("monthly notification charge") && 
                            !t.description?.toLowerCase().includes("min balance fine")) || 
                            hasDuplicateCharges ? (
                            <button
                              onClick={() => requestReversal(t)}
                              disabled={reversingId === t.transaction_id}
                              className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-lg transition font-bold shadow-sm disabled:opacity-50"
                            >
                              {reversingId === t.transaction_id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                  <RefreshCcw className="w-3.5 h-3.5" />
                              )}
                              Reversal
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">No duplicates</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center">
                          <p className="text-gray-400 font-medium">No transactions found for this account.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
             <div className="flex-1">
               {hasDuplicateCharges && (
                 <button 
                  onClick={handleBulkReversal}
                  disabled={bulkReversing}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-red-700 transition flex items-center gap-2 animate-pulse"
                 >
                   {bulkReversing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                   REVERSE ALL DUPLICATE CHARGES
                 </button>
               )}
             </div>
             <button onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition">
                Close Details
             </button>
        </div>
      </Card>
    </div>
  )
}
