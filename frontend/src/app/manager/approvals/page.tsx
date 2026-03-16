"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckSquare, CheckCircle, XCircle, ArrowRightLeft, Loader2, ArrowUpRight } from "lucide-react"
import api from "@/services/api"
import { format } from "date-fns"

export default function ManagerApprovals() {
  const [transfers, setTransfers] = useState<any[]>([])
  const [accountRequests, setAccountRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [reversals, setReversals] = useState<any[]>([])

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const [tRes, aRes, rRes] = await Promise.all([
        api.get("/transactions/pending-transfers"),
        api.get("/accounts/activity-pending"),
        api.get("/reversals/all")
      ])
      setTransfers(tRes.data)
      setAccountRequests(aRes.data)
      setReversals(rRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyReversal = async (id: string) => {
    const password = prompt("Manager verification required. Enter your password to escalate:")
    if (password === null) return
    
    try {
      await api.post("/auth/verify-password", { password })
      await api.post(`/reversals/${id}/verify`)
      alert("Reversal verified and escalated to MD.")
      load()
    } catch (e: any) {
      alert(e.response?.data?.detail || "Verification failed.")
    }
  }

  const handleApproveTransfer = async (id: string) => {
    setProcessingId(id)
    try {
      await api.post(`/transactions/transfer-approve/${id}`)
      load()
    } catch (e) {
      alert("Failed to approve transfer.")
    } finally {
      setProcessingId(null)
    }
  }

  const handleApproveAccountRequest = async (id: string, actionType: string) => {
    setProcessingId(id)
    try {
      await api.post(`/accounts/activity-approve/${id}`)
      if (actionType === "deactivate") {
        alert("🚀 Request successfully forwarded to MD for final review.")
      } else {
        alert("✅ Request approved successfully.")
      }
      load()
    } catch (e) {
      alert("Failed to process account request.")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <DashboardLayout role="manager">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <CheckSquare className="w-8 h-8 text-primary" /> Pending Approvals
        </h2>
        <p className="text-gray-500 mt-1">Review and approve high-value transactions and account status changes.</p>
      </div>

      <div className="space-y-10">
        {/* SECTION 1: TRANSFERS */}
        <Card className="shadow-sm border-0 ring-1 ring-gray-200">
          <CardHeader className="bg-white border-b border-gray-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-gray-400" /> Transfer Queue
            </CardTitle>
            <CardDescription>Large value transactions waiting for manager sign-off.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Initiated</th>
                    <th className="px-6 py-4 font-semibold">From Account</th>
                    <th className="px-6 py-4 font-semibold">To Receiver</th>
                    <th className="px-6 py-4 font-semibold text-right">Amount (₹)</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transfers.map((req) => (
                    <tr key={req.request_id} className="hover:bg-gray-50 bg-white">
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {req.created_at ? format(new Date(req.created_at), "dd MMM, hh:mm a") : "—"}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-900 font-medium">
                        {req.accounts?.account_number || "—"}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-500">{req.receiver_account}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        ₹{req.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleApproveTransfer(req.request_id)}
                          disabled={!!processingId}
                          className="px-4 py-1.5 text-white bg-emerald-500 hover:bg-emerald-600 rounded-md transition text-xs font-bold disabled:opacity-50"
                        >
                          {processingId === req.request_id ? "..." : "Approve"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transfers.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">No pending transfers</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: ACCOUNT REQUESTS */}
        <Card className="shadow-sm border-0 ring-1 ring-gray-200">
          <CardHeader className="bg-white border-b border-gray-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-400" /> Account Status Requests
            </CardTitle>
            <CardDescription>Unfreeze, Unblock, and Deactivation requests from customers.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Customer Name</th>
                    <th className="px-6 py-4 font-semibold text-center">Account Request</th>
                    <th className="px-6 py-4 font-semibold">Reason</th>
                    <th className="px-6 py-4 font-semibold text-center">Duration</th>
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {accountRequests.map((req) => (
                    <tr key={req.request_id} className="hover:bg-gray-50 bg-white">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{req.accounts?.customer_profile?.full_name}</p>
                        <p className="text-[10px] font-mono text-gray-400">ACC: {req.accounts?.account_number}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          req.action_type === 'deactivate' ? 'bg-red-100 text-red-700' :
                          req.action_type === 'unfreeze' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {req.action_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 italic text-xs max-w-xs">{req.reason}</td>
                      <td className="px-6 py-4 text-center text-xs text-gray-500">
                        {req.action_type === "deactivate" 
                          ? (req.duration_months === 999 ? "Lifelong" : `${req.duration_months} Months`)
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          req.status === 'pending_manager' ? 'bg-yellow-100 text-yellow-700' :
                          req.status === 'pending_approval' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {req.status === 'pending_manager' ? 'Needs Review' : req.status === 'pending_approval' ? 'Pending' : req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {req.action_type === "deactivate" ? (
                          <button 
                            onClick={() => handleApproveAccountRequest(req.request_id, "deactivate")}
                            disabled={!!processingId}
                            className="px-4 py-1.5 text-white bg-orange-500 hover:bg-orange-600 rounded-md transition text-xs font-bold disabled:opacity-50 flex items-center gap-1 ml-auto"
                          >
                            {processingId === req.request_id ? "..." : <><ArrowUpRight className="w-3 h-3" /> Forward to MD</>}
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleApproveAccountRequest(req.request_id, req.action_type)}
                            disabled={!!processingId}
                            className="px-4 py-1.5 text-white bg-primary hover:bg-primary/90 rounded-md transition text-xs font-bold disabled:opacity-50"
                          >
                            {processingId === req.request_id ? "..." : "Approve"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {accountRequests.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">No pending account requests</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
            {/* SECTION 3: REVERSAL VERIFICATION */}
        <Card className="shadow-sm border-0 ring-1 ring-gray-200">
          <CardHeader className="bg-white border-b border-gray-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-gray-400" /> Reversal Verification
            </CardTitle>
            <CardDescription>Verify and escalate customer-requested reversals to MD.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Customer</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Reason</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reversals.map((rev) => (
                    <tr key={rev.reversal_id} className="hover:bg-gray-50 bg-white">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{rev.accounts?.customer_profile?.full_name}</p>
                        <p className="text-[10px] font-mono text-gray-400">ACC: {rev.accounts?.account_number}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">₹{rev.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-600 text-xs italic max-w-xs">{rev.reason}</td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                           rev.created_by_manager_id ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                         }`}>
                           {rev.created_by_manager_id ? 'Verified & Escalated' : 'Needs Verification'}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!rev.created_by_manager_id && (
                          <button 
                            onClick={() => handleVerifyReversal(rev.reversal_id)}
                            className="px-4 py-1.5 text-white bg-amber-500 hover:bg-amber-600 rounded-md transition text-xs font-bold"
                          >
                            Verify & Escalate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reversals.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">No reversal requests</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
