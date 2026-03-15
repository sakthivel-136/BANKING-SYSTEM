"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AlertTriangle, CheckSquare, XSquare, Loader2, Shield, AlertCircle, Snowflake, CheckCircle } from "lucide-react"
import api from "@/services/api"

export default function MDEscalations() {
  const [deactivations, setDeactivations] = useState<any[]>([])
  const [balanceAlerts, setBalanceAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)


  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const [deactRes, alertsRes] = await Promise.all([
        api.get("/accounts/activity-pending-md"),
        api.get("/accounts/escalated-alerts").catch(() => ({ data: [] }))
      ])
      setDeactivations(deactRes.data)
      setBalanceAlerts(alertsRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try {
      const res = await api.post(`/accounts/activity-md-approve/${id}`)
      alert(res.data.message || "Deactivation approved successfully.")
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to approve deactivation.")
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)
    try {
      const res = await api.post(`/accounts/activity-md-reject/${id}`)
      alert(res.data.message || "Deactivation request rejected.")
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to reject request.")
    } finally {
      setProcessingId(null)
    }
  }

  const handleAlertFreeze = async (alertId: string) => {
    if (!confirm("Freeze this account?")) return
    setProcessingId(alertId)
    try {
      const res = await api.post(`/accounts/alert-freeze/${alertId}`)
      alert(res.data.message)
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to freeze.")
    } finally {
      setProcessingId(null)
    }
  }

  const handleAlertResolve = async (alertId: string) => {
    setProcessingId(alertId)
    try {
      await api.post(`/accounts/alert-resolve/${alertId}`)
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to resolve.")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <DashboardLayout role="md">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Shield className="w-8 h-8 text-red-500" /> Deactivation Escalations
        </h2>
        <p className="text-gray-500 mt-1">
          Account deactivation requests forwarded by managers for MD approval. These require your final sign-off.
        </p>
      </div>
      
      {loading ? (
        <div className="p-12 text-center text-gray-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading escalations...
        </div>
      ) : deactivations.length === 0 ? (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg font-medium">No pending deactivation requests</p>
            <p className="text-gray-400 text-sm mt-1">All escalations have been addressed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {deactivations.map((req) => (
            <Card key={req.request_id} className="border-l-[4px] border-l-red-500 shadow-sm">
              <CardHeader className="py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="text-red-500 w-5 h-5"/>
                      Account Deactivation Request
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Account: <span className="font-mono font-medium">{req.accounts?.account_number}</span>
                      {" | "}
                      Type: <span className="font-medium uppercase">{req.accounts?.account_type}</span>
                    </CardDescription>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-tight ${
                    req.duration_months === 999 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {req.duration_months === 999 ? "⚠ Permanent" : `${req.duration_months} Months`}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {/* Customer & Account Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer Name</p>
                    <p className="text-sm font-bold text-gray-900">{req.accounts?.customer_profile?.full_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer Email</p>
                    <p className="text-sm text-gray-700">{req.accounts?.customer_profile?.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Balance</p>
                    <p className="text-sm font-semibold text-gray-900">₹{Number(req.accounts?.balance || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration</p>
                    <p className="text-sm font-bold text-gray-900">
                      {req.duration_months === 999 ? "Lifelong (Permanent)" : `${req.duration_months} Months`}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 border border-gray-100 mb-4">
                  <span className="font-semibold block mb-1 text-gray-500 uppercase text-[10px] tracking-widest">Reason for Deactivation</span>
                  <p className="text-gray-800">{req.reason || "No reason provided"}</p>
                </div>

                {/* Lifelong warning */}
                {req.duration_months === 999 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm text-red-800">
                    <p className="font-bold flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4" /> Permanent Deactivation Warning
                    </p>
                    <p>Approving this request will <strong>permanently delete</strong> all transaction history, complaints, and enquiries for this customer. This action cannot be undone.</p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleApprove(req.request_id)} 
                    disabled={!!processingId}
                    className="flex items-center justify-center gap-2 bg-red-600 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {processingId === req.request_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><CheckSquare className="w-4 h-4" /> Approve Deactivation</>
                    )}
                  </button>
                  <button 
                    onClick={() => handleReject(req.request_id)} 
                    disabled={!!processingId}
                    className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium py-2.5 px-5 rounded-lg shadow-sm hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    <XSquare className="w-4 h-4" /> Reject
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Low Balance Escalations from Manager ── */}
      <div className="mt-10 mb-4">
        <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-orange-500" /> Low Balance Alerts — Escalated by Manager
        </h3>
        <p className="text-gray-500 text-sm mt-1">These accounts were flagged for low balance and escalated to you by the branch manager.</p>
      </div>

      {balanceAlerts.length === 0 ? (
        <Card className="border-gray-200">
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No escalated low-balance alerts.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {balanceAlerts.map((alert) => {
            const acc = alert.accounts || {}
            const profile = acc.customer_profile || {}
            return (
              <Card key={alert.alert_id} className="border-l-4 border-l-orange-500 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      {profile.full_name || "Unknown Customer"}
                    </CardTitle>
                    <span className="text-xs text-gray-400">{new Date(alert.created_at).toLocaleString("en-IN")}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Account</p>
                      <p className="text-sm font-mono font-semibold">{acc.account_number || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Type</p>
                      <p className="text-sm capitalize">{acc.account_type || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Balance</p>
                      <p className="text-sm font-bold text-red-600">₹{Number(alert.balance||0).toLocaleString("en-IN")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Threshold</p>
                      <p className="text-sm">₹{Number(alert.threshold||1000).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  {alert.escalation_message && (
                    <div className="mb-3 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                      <span className="font-semibold block mb-1">Manager's Escalation Note:</span>
                      {alert.escalation_message}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleAlertFreeze(alert.alert_id)}
                      disabled={!!processingId}
                      className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {processingId === alert.alert_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Snowflake className="w-3.5 h-3.5" />}
                      Freeze Account
                    </button>
                    <button
                      onClick={() => handleAlertResolve(alert.alert_id)}
                      disabled={!!processingId}
                      className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Mark Resolved
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}

