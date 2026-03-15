"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckSquare, CheckCircle, XCircle, ArrowRightLeft, Loader2 } from "lucide-react"
import api from "@/services/api"
import { format } from "date-fns"

export default function ManagerApprovals() {
  const [transfers, setTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadPendingTransfers()
  }, [])

  const loadPendingTransfers = async () => {
    try {
      const res = await api.get("/transactions/pending-transfers")
      setTransfers(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try {
      await api.post(`/transactions/transfer-approve/${id}`)
      setTransfers(transfers.filter(t => t.request_id !== id))
    } catch (e) {
      console.error("Failed to approve", e)
      alert("Failed to approve transfer.")
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    // In a real app we'd have a reject endpoint to update status and notify customer
    alert("Reject functionality would update the status to rejected and notify the customer.")
  }

  return (
    <DashboardLayout role="manager">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <CheckSquare className="w-8 h-8 text-primary" /> Transfer Approvals
        </h2>
        <p className="text-gray-500 mt-1">Review and approve high-value transactions exceeding ₹10,000.</p>
      </div>

      <Card className="shadow-sm border-0 ring-1 ring-gray-200">
        <CardHeader className="bg-white border-b border-gray-100">
           <CardTitle>Pending Transfer Queue</CardTitle>
           <CardDescription>Accounts awaiting manager verification.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
             <div className="flex justify-center p-12">
               <Loader2 className="w-8 h-8 animate-spin text-primary" />
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Initiated On</th>
                    <th className="px-6 py-4 font-semibold">From Account</th>
                    <th className="px-6 py-4 font-semibold">To Receiver</th>
                    <th className="px-6 py-4 font-semibold text-right">Amount (₹)</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transfers.map((req) => (
                    <tr key={req.request_id} className="hover:bg-gray-50 transition-colors bg-white">
                      <td className="px-6 py-4 text-gray-600">
                         {format(new Date(req.created_at), "dd MMM yyyy, hh:mm a")}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-900 font-medium">
                         {req.accounts?.account_number || "Unknown"}
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                            <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                            <span className="font-mono text-gray-600">{req.receiver_account}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                         {req.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleReject(req.request_id)}
                              disabled={processingId === req.request_id}
                              className="px-3 py-1.5 flex items-center gap-1.5 text-red-600 hover:bg-red-50 bg-white border border-red-200 rounded-md transition font-medium text-xs disabled:opacity-50"
                            >
                               <XCircle className="w-4 h-4" /> Reject
                            </button>
                            <button 
                              onClick={() => handleApprove(req.request_id)}
                              disabled={processingId === req.request_id}
                              className="px-3 py-1.5 flex items-center gap-1.5 text-white hover:bg-emerald-600 bg-emerald-500 rounded-md transition font-medium text-xs shadow-sm disabled:opacity-50"
                            >
                               {processingId === req.request_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} 
                               Approve
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {transfers.length === 0 && (
                     <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                           <div className="flex flex-col items-center justify-center space-y-3">
                              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                                 <CheckSquare className="w-6 h-6 text-emerald-500" />
                              </div>
                              <div>
                                 <p className="font-medium text-gray-900">All caught up!</p>
                                 <p className="text-gray-500 text-sm">There are no pending transfers requiring your approval.</p>
                              </div>
                           </div>
                        </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
