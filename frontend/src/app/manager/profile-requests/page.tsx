"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { UserCheck, CheckCircle, XCircle, Loader2, Info } from "lucide-react"
import api from "@/services/api"
import { format } from "date-fns"

export default function ProfileRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const res = await api.get("/customers/profile-update-pending")
      setRequests(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try {
      await api.post(`/customers/profile-update-approve/${id}`)
      setRequests(requests.filter(r => r.request_id !== id))
      alert("Profile change approved successfully!")
    } catch (e: any) {
      alert(e.response?.data?.detail || "Approval failed")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <DashboardLayout role="manager">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UserCheck className="w-8 h-8 text-primary" /> Profile Change Requests
        </h2>
        <p className="text-gray-500 mt-1">Verify and approve customer profile updates (Address, KYC details, etc.).</p>
      </div>

      <Card className="shadow-sm border-0 ring-1 ring-gray-200">
        <CardHeader className="bg-white border-b border-gray-100">
          <CardTitle>Pending Verification Queue</CardTitle>
          <CardDescription>Changes awaiting manager approval after customer OTP verification.</CardDescription>
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
                    <th className="px-6 py-4 font-semibold">Customer</th>
                    <th className="px-6 py-4 font-semibold">Requested Changes</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((req) => (
                    <tr key={req.request_id} className="hover:bg-gray-50 transition-colors bg-white">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{req.customer_profile?.full_name}</div>
                        <div className="text-xs text-gray-500">{req.customer_profile?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {Object.entries(req.new_data).map(([key, val]: [string, any]) => (
                            <div key={key} className="text-xs">
                              <span className="font-bold text-gray-400 uppercase tracking-tighter mr-1">{key.replace(/_/g, ' ')}:</span>
                              <span className="text-primary font-medium">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleApprove(req.request_id)}
                            disabled={processingId === req.request_id}
                            className="px-3 py-1.5 flex items-center gap-1.5 text-white hover:bg-emerald-600 bg-emerald-500 rounded-md transition font-medium text-xs shadow-sm disabled:opacity-50"
                          >
                            {processingId === req.request_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} 
                            Approve Changes
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Info className="w-8 h-8 text-gray-300" />
                          <p>No profile update requests pending.</p>
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
