"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Snowflake, ArrowUpCircle, CheckCircle, Loader2, X } from "lucide-react"
import api from "@/services/api"

export default function ManagerAlerts() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Escalation modal state
  const [escalateAlert, setEscalateAlert] = useState<any | null>(null)
  const [escalateMsg, setEscalateMsg] = useState("")
  const [escalating, setEscalating] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      setLoading(true)
      const res = await api.get("/accounts/low-balance-alerts")
      setAlerts(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleFreeze = async (alertId: string) => {
    if (!confirm("Are you sure you want to freeze this account?")) return
    setProcessingId(alertId)
    try {
      const res = await api.post(`/accounts/alert-freeze/${alertId}`)
      alert(res.data.message || "Account frozen.")
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to freeze account.")
    } finally {
      setProcessingId(null)
    }
  }


  const handleEscalateSubmit = async () => {
    if (!escalateAlert || !escalateMsg.trim()) return
    setEscalating(true)
    try {
      const res = await api.post(`/accounts/alert-escalate/${escalateAlert.alert_id}`, { message: escalateMsg })
      alert(res.data.message || "Escalated to MD.")
      setEscalateAlert(null)
      setEscalateMsg("")
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to escalate.")
    } finally {
      setEscalating(false)
    }
  }

  return (
    <DashboardLayout role="manager">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-orange-500" /> Low Balance Alerts
        </h2>
        <p className="text-gray-500 mt-1">
          Active low balance alerts. You can freeze the account, escalate to MD, or resolve.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading alerts...
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium text-lg">No active low balance alerts</p>
            <p className="text-gray-400 text-sm mt-1">All accounts are within safe balance thresholds.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const acc = alert.accounts || {}
            const profile = acc.customer_profile || {}
            const isEscalated = alert.status === "escalated"
            return (
              <Card key={alert.alert_id} className={`border-l-4 shadow-sm ${isEscalated ? "border-l-purple-500" : "border-l-orange-500"}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className={`w-5 h-5 ${isEscalated ? "text-purple-500" : "text-orange-500"}`} />
                      {profile.full_name || "Unknown Customer"}
                      {isEscalated && (
                        <span className="ml-2 text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          Escalated to MD
                        </span>
                      )}
                    </CardTitle>
                    <span className="text-xs text-gray-400">{new Date(alert.created_at).toLocaleString("en-IN")}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Account No.</p>
                      <p className="text-sm font-mono font-semibold">{acc.account_number || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Type</p>
                      <p className="text-sm font-medium capitalize">{acc.account_type || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Current Balance</p>
                      <p className="text-sm font-bold text-red-600">₹{Number(alert.balance || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Threshold</p>
                      <p className="text-sm font-medium">₹{Number(alert.threshold || 1000).toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  {/* Escalation message if escalated */}
                  {isEscalated && alert.escalation_message && (
                    <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
                      <span className="font-semibold block mb-1">Manager Note:</span>
                      {alert.escalation_message}
                    </div>
                  )}

                  {/* Actions */}
                  {!isEscalated && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={() => handleFreeze(alert.alert_id)}
                        disabled={!!processingId}
                        className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                      >
                        {processingId === alert.alert_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Snowflake className="w-3.5 h-3.5" />}
                        Freeze Account
                      </button>
                      <button
                        onClick={() => { setEscalateAlert(alert); setEscalateMsg("") }}
                        disabled={!!processingId}
                        className="flex items-center gap-1.5 bg-purple-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Escalate to MD
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Escalation Modal */}
      {escalateAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-purple-500" /> Escalate to MD
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Account: <span className="font-mono font-semibold">{escalateAlert.accounts?.account_number}</span>
                </p>
              </div>
              <button onClick={() => setEscalateAlert(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-sm text-orange-800">
              <strong>Balance:</strong> ₹{Number(escalateAlert.balance).toLocaleString("en-IN")} 
              &nbsp;(threshold ₹{Number(escalateAlert.threshold).toLocaleString("en-IN")})
            </div>

            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason for Escalation <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none resize-none"
              rows={4}
              placeholder="Describe why you are escalating this to the MD..."
              value={escalateMsg}
              onChange={e => setEscalateMsg(e.target.value)}
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleEscalateSubmit}
                disabled={escalating || !escalateMsg.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-2.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
              >
                {escalating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
                Escalate to MD
              </button>
              <button
                onClick={() => setEscalateAlert(null)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
