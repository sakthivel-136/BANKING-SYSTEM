"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import api from "@/services/api"

export default function MDReversalsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await api.get("/reversals/all")
      // Only show those that are verified by manager but pending MD approval
      const verified = (res.data || []).filter((r: any) => r.created_by_manager_id && r.status === 'pending')
      setItems(verified)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const approve = async (id: string) => {
    try {
      await api.post(`/reversals/${id}/approve`, {})
      await load()
      alert("Reversal approved and processed.")
    } catch (e: any) {
      console.error(e)
      alert(e?.response?.data?.detail || "Failed to approve reversal.")
    }
  }

  return (
    <DashboardLayout role="md">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Pending Reversal Requests</h2>
      {loading ? (
        <div className="p-8 text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-gray-500">No pending reversal requests.</div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <Card key={r.reversal_id}>
              <CardHeader className="flex flex-row justify-between items-start gap-4">
                <div>
                  <CardTitle className="text-lg">Reversal for Complaint</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    Complaint ID: {r.complaint_id || "N/A"} • Type: {r.type} • Amount: ₹{Number(r.amount).toFixed(2)}
                  </CardDescription>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  Pending
                </span>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-700">
                {r.complaints && (
                  <div>
                    <p className="font-semibold mb-1">Complaint</p>
                    <p className="text-gray-900">{r.complaints.title}</p>
                    <p className="text-gray-600 mt-1">{r.complaints.description}</p>
                  </div>
                )}
                {r.transactions && (
                  <div>
                    <p className="font-semibold mb-1">Original Transaction</p>
                    <p>
                      {r.transactions.transaction_type?.toUpperCase()} • ₹
                      {Number(r.transactions.amount).toFixed(2)} •{" "}
                      {new Date(r.transactions.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {r.reason && (
                  <div>
                    <p className="font-semibold mb-1">Manager Note</p>
                    <p>{r.reason}</p>
                  </div>
                )}
                <div className="pt-2">
                  <button
                    onClick={() => approve(r.reversal_id)}
                    className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-sm"
                  >
                    Approve & Reverse Amount
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

