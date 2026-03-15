"use client"

import { useState, useEffect } from "react"

import { Card, CardContent } from "@/components/ui/card"

import { FileText, Send, Loader2, AlertCircle, Clock, CheckCircle2 } from "lucide-react"
import api from "@/services/api"

export default function RequestsPage() {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState("")
  const [actionType, setActionType] = useState("")
  const [duration, setDuration] = useState("3")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [pastRequests, setPastRequests] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const [accRes, meRes] = await Promise.all([
          api.get("/accounts/mine"),
          api.get("/auth/me")
        ])
        setAccounts(accRes.data)
        setUserProfile(meRes.data.profile)
        if (accRes.data.length > 0) {
          setSelectedAccount(accRes.data[0].account_id)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const selectedAccData = accounts.find(a => a.account_id === selectedAccount)

  // Determine available actions based on selected account status
  const getAvailableActions = () => {
    if (!selectedAccData) return []
    const status = selectedAccData.status
    if (status === "frozen") return [{ value: "unfreeze", label: "Unfreeze Account" }]
    if (status === "closed") return [{ value: "unblock", label: "Unblock Account" }]
    if (status === "active") return [{ value: "deactivate", label: "Deactivate Account" }]
    return []
  }

  const availableActions = getAvailableActions()

  // Auto-set action type when account changes
  useEffect(() => {
    if (availableActions.length > 0) {
      setActionType(availableActions[0].value)
    } else {
      setActionType("")
    }
  }, [selectedAccount, accounts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!actionType) return
    setProcessing(true)
    try {
      await api.post("/accounts/activity-request", {
        account_id: selectedAccount,
        action_type: actionType,
        duration_months: actionType === "deactivate" ? parseInt(duration) : null,
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
              <p className="text-gray-600 text-lg mb-8">
                {actionType === "deactivate"
                  ? "Your deactivation request has been submitted. It will be reviewed by a Manager and then approved by the MD."
                  : "Your account request has been submitted successfully. A manager will review your request and process it within 24-48 hours."}
              </p>
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
        <p className="text-gray-500 mt-2">Request account actions based on your current account status.</p>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        <div className="md:col-span-3">
            <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-8">
                    {/* Customer Info Header */}
                    {selectedAccData && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-2 gap-4">
                        <div className="col-span-2 pb-2 border-b border-gray-200/50 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer Name</p>
                            <p className="text-sm font-bold text-gray-800">{userProfile?.full_name || "Loading..."}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Customer ID</p>
                             <p className="text-sm font-mono font-medium text-gray-700">{userProfile?.customer_number || selectedAccData.customer_id}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Number</p>
                          <p className="text-sm font-mono font-medium text-gray-700 underline underline-offset-4 decoration-primary/20">{selectedAccData.account_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Current Status</p>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight ${
                            selectedAccData.status === 'active' ? 'bg-green-100 text-green-700' : 
                            selectedAccData.status === 'frozen' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {selectedAccData.status === 'closed' ? 'blocked' : selectedAccData.status}
                          </span>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Account</label>
                                <select 
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                >
                                    <option value="" disabled>Select an account to proceed</option>
                                    {accounts.map(acc => (
                                        <option key={acc.account_id} value={acc.account_id}>
                                            {acc.account_number} ({acc.account_type}) - Balance ₹{acc.balance.toLocaleString()} — Status: {acc.status === 'closed' ? 'Blocked' : acc.status.charAt(0).toUpperCase() + acc.status.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {availableActions.length === 0 && selectedAccData && (
                              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 text-center">
                                No actions available for this account status ({selectedAccData.status === 'closed' ? 'blocked' : selectedAccData.status}).
                              </div>
                            )}

                            {availableActions.length > 0 && (
                              <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Action Type</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            value={actionType}
                                            onChange={(e) => setActionType(e.target.value)}
                                        >
                                            {availableActions.map(act => (
                                              <option key={act.value} value={act.value}>{act.label}</option>
                                            ))}
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
                              </>
                            )}
                        </div>

                        {availableActions.length > 0 && (
                          <button 
                              disabled={processing || !selectedAccount || !actionType}
                              type="submit" 
                              className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary/90 transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-5 h-5" /> Submit Request</>}
                          </button>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
            {actionType === "deactivate" && (
              <Card className="bg-red-50/50 border-red-100">
                <CardContent className="p-6">
                    <h3 className="font-bold text-red-900 flex items-center gap-2 mb-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        Deactivation Warning
                    </h3>
                    <p className="text-sm text-red-800 leading-relaxed">
                        Deactivation requests require <strong>Manager review</strong> and then <strong>MD approval</strong>. 
                        Lifelong deactivation will permanently delete your account history, transaction records, and block all future access.
                    </p>
                </CardContent>
              </Card>
            )}

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
                        <p className="text-sm text-gray-600 mt-0.5">Fill out the request form with your details and reason.</p>
                    </li>
                    <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">2</span>
                        <p className="text-sm text-gray-600 mt-0.5">Manager reviews the request and risk factors.</p>
                    </li>
                    <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">3</span>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {actionType === "deactivate"
                            ? "MD provides final approval for deactivation. The account is then deactivated."
                            : "Approval/Rejection is applied to your account."}
                        </p>
                    </li>
                </ol>
            </div>
        </div>
      </div>
    </>

  )
}
