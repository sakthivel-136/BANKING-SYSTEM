"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/services/api"

export default function ManagerComplaints() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [responseIds, setResponseIds] = useState<Record<string, string>>({})
  const [reversalAmounts, setReversalAmounts] = useState<Record<string, string>>({})
  const [reversalReasons, setReversalReasons] = useState<Record<string, string>>({})

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const res = await api.get("/complaints")
      setComplaints(res.data)
    } catch (e) { console.error(e) }
  }

  const updateComplaint = async (id: string, status: string, isResponse: boolean = false) => {
    try {
      const payload: any = { status }
      if (isResponse && responseIds[id]) {
        payload.manager_response = responseIds[id]
      }
      await api.put(`/complaints/${id}`, payload)
      load()
    } catch (e) {
      alert("Failed to update complaint")
    }
  }

  const requestReversal = async (complaint: any) => {
    const id = complaint.complaint_id as string
    const amountStr = reversalAmounts[id]
    const reason = reversalReasons[id] || ""
    const amount = parseFloat(amountStr)

    if (!amountStr || isNaN(amount) || amount <= 0) {
      alert("Enter a valid reversal amount.")
      return
    }

    try {
      // For now manager must paste the original transaction id into the reason/description
      await api.post(`/reversals/from-complaint/${id}`, {
        transaction_id: complaint.related_transaction_id || complaint.transaction_id || complaint.complaint_id,
        amount,
        type: "charge_double",
        reason,
      })
      alert("Reversal request sent to MD.")
      setReversalAmounts((prev) => ({ ...prev, [id]: "" }))
      setReversalReasons((prev) => ({ ...prev, [id]: "" }))
    } catch (e: any) {
      console.error(e)
      alert(e?.response?.data?.detail || "Failed to create reversal request.")
    }
  }

  return (
    <DashboardLayout role="manager">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Manage Complaints</h2>
      <div className="space-y-6">
        {complaints.map((c, i) => (
          <Card key={i}>
            <CardHeader className="bg-gray-50 border-b pb-4">
              <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{c.title}</CardTitle>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-bold">CUSTOMER ID:</span> {c.customer_id}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-bold">NAME:</span> {c.customer_profile?.full_name}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-bold">EMAIL:</span> {c.customer_profile?.email}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-bold">PHONE:</span> {c.customer_profile?.phone_number || 'N/A'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-bold">DATE:</span> {new Date(c.created_at).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-gray-400 font-bold">TICKET ID:</span> {c.complaint_id}
                      </span>
                    </div>
                  </div>

                 <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    c.status === 'Resolved' ? 'bg-green-100 text-green-800' : 
                    c.status === 'In Review' ? 'bg-blue-100 text-blue-800' : 
                    c.status === 'Escalated' ? 'bg-red-100 text-red-800' : 
                    'bg-yellow-100 text-yellow-800'
                  }`}>{c.status}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-gray-700 bg-gray-50 p-4 rounded-md text-sm border">{c.description}</p>
              
              {c.manager_response && (
                <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Your Response:</p>
                  <p className="text-sm text-blue-900">{c.manager_response}</p>
                </div>
              )}

              {c.status !== 'Resolved' && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium mb-2 block">Add Response</label>
                  <textarea 
                     rows={3} 
                     className="w-full border rounded-md p-2 text-sm focus:ring-primary focus:border-primary mb-3" 
                     placeholder="Write your resolution or update..."
                     value={responseIds[c.complaint_id] || ""}
                     onChange={(e) => setResponseIds({...responseIds, [c.complaint_id]: e.target.value})}
                  />
                  <div className="flex flex-col gap-3 mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                          Reversal Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={reversalAmounts[c.complaint_id] || ""}
                          onChange={(e) =>
                            setReversalAmounts({ ...reversalAmounts, [c.complaint_id]: e.target.value })
                          }
                          className="w-full border rounded-md p-2 text-sm focus:ring-primary focus:border-primary"
                          placeholder="e.g. 25.00"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                          Reversal Note
                        </label>
                        <input
                          type="text"
                          value={reversalReasons[c.complaint_id] || ""}
                          onChange={(e) =>
                            setReversalReasons({ ...reversalReasons, [c.complaint_id]: e.target.value })
                          }
                          className="w-full border rounded-md p-2 text-sm focus:ring-primary focus:border-primary"
                          placeholder="Why is this reversal needed?"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => requestReversal(c)}
                        className="mt-1 inline-flex justify-center items-center px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded shadow-sm hover:bg-amber-700"
                      >
                        Request Reversal (Send to MD)
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => updateComplaint(c.complaint_id, "Resolved", true)}
                        className="bg-green-600 text-white text-xs px-4 py-2 rounded shadow-sm hover:bg-green-700 focus:outline-none"
                      >
                        Mark Resolved
                      </button>
                      <button
                        onClick={() => updateComplaint(c.complaint_id, "In Review", true)}
                        className="bg-blue-600 text-white text-xs px-4 py-2 rounded shadow-sm hover:bg-blue-700 focus:outline-none"
                      >
                        Update & Keep In Review
                      </button>
                      <button
                        onClick={() => updateComplaint(c.complaint_id, "Escalated", false)}
                        className="bg-red-50 text-red-600 border border-red-200 text-xs px-4 py-2 rounded shadow-sm hover:bg-red-100 focus:outline-none ml-auto"
                      >
                        Escalate to MD
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {complaints.length === 0 && <p className="text-sm text-gray-500">No complaints available.</p>}
      </div>
    </DashboardLayout>
  )
}
