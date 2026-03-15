"use client"

import { useState, useEffect } from "react"

import { Card, CardContent } from "@/components/ui/card"

import { FileText, Send, Loader2, AlertCircle, Clock, CheckCircle2 } from "lucide-react"
import api from "@/services/api"

export default function RequestsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState("")
  const [actionType, setActionType] = useState("unfreeze")
  const [duration, setDuration] = useState("3")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [pastRequests, setPastRequests] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const [accRes, reqRes] = await Promise.all([
          api.get("/accounts/mine"),
          api.get("/accounts/activity-pending") // This might return global pending, usually we'd filter for me. 
          // For simplicity, let's just fetch accounts and maybe add a separate endpoint for past requests if needed.
        ])
        setAccounts(accRes.data)
        if (accRes.data.length > 0) setSelectedAccount(accRes.data[0].account_id)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    try {
      await api.post("/accounts/activity-request", {
        account_id: selectedAccount,
        action_type: actionType,
        duration_months: parseInt(duration),
        reason: reason
      })
      setSuccess(true)
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to submit request")
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-500">Loading Requests...</div>

  if (success) {
      return (
          <div className="max-w-2xl mx-auto py-12 text-center">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Request Received</h1>
              <p className="text-gray-600 text-lg mb-8">Your account request has been submitted successfully. A manager will review your request and process it within 24-48 hours.</p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition shadow-lg shadow-primary/20"
              >
                  Submit Another Request
              </button>
          </div>
      )
  }

  return (
    <>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="text-blue-600 w-8 h-8" />
            Account Requests
        </h1>
        <p className="text-gray-500 mt-2">Request special actions like unfreezing, unblocking, or temporary deactivation.</p>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        <div className="md:col-span-3">
            <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Account</label>
                                <select 
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                >
                                    {accounts.map(acc => (
                                        <option key={acc.account_id} value={acc.account_id}>
                                            {acc.account_number} ({acc.account_type}) - ₹{acc.balance.toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Action Type</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        value={actionType}
                                        onChange={(e) => setActionType(e.target.value)}
                                    >
                                        <option value="unfreeze">Unfreeze Account</option>
                                        <option value="unblock">Unblock Account</option>
                                        <option value="deactivate">Deactivate (Temp)</option>
                                    </select>
                                </div>
                                {actionType === "deactivate" && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            value={duration}
                                            onChange={(e) => setDuration(e.target.value)}
                                        >
                                            <option value="3">3 Months</option>
                                            <option value="6">6 Months</option>
                                            <option value="999">Lifelong Deactivation</option>
                                        </select>
                                    </div>
                                )}

                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Request</label>
                                <textarea 
                                    required
                                    rows={4}
                                    placeholder="Please provide a detailed reason for this request..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>
                        </div>

                        <button 
                            disabled={processing}
                            type="submit" 
                            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary/90 transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-5 h-5" /> Submit Request</>}
                        </button>
                    </form>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
            <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="p-6">
                    <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-3">
                        <AlertCircle className="w-5 h-5 text-blue-600" />
                        Important Note
                    </h3>
                    <p className="text-sm text-blue-800 leading-relaxed">
                        Requests are processed based on security protocols. You may be contacted by a SmartBank officer for further verification before the request is approved.
                    </p>
                </CardContent>
            </Card>

            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    How it works
                </h3>
                <ol className="space-y-4">
                    <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">1</span>
                        <p className="text-sm text-gray-600 mt-0.5">Fill out the request form with your details.</p>
                    </li>
                    <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">2</span>
                        <p className="text-sm text-gray-600 mt-0.5">Manager reviews the request and risk factors.</p>
                    </li>
                    <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">3</span>
                        <p className="text-sm text-gray-600 mt-0.5">Approval/Rejection is applied to your account.</p>
                    </li>
                </ol>
            </div>
        </div>
      </div>
    </>

  )
}
