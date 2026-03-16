"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle, Clock } from "lucide-react"
import api from "@/services/api"

export default function MDComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchComplaints() {
      try {
        const res = await api.get("/complaints")
        setComplaints(res.data)
      } catch (err) {
        console.error("Failed to fetch complaints:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchComplaints()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved': return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case 'pending': return <Clock className="w-5 h-5 text-amber-500" />
      default: return <AlertTriangle className="w-5 h-5 text-rose-500" />
    }
  }

  return (
    <DashboardLayout role="md">
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <AlertTriangle className="text-primary" /> Customer Complaints Management
        </h1>

        {loading ? (
          <div>Loading complaints...</div>
        ) : (
          <div className="grid gap-6">
            {complaints.length === 0 ? (
              <div className="text-gray-500 text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed">
                No complaints found in the system.
              </div>
            ) : (
              complaints.map((c: any) => (
                <Card key={c.complaint_id} className="overflow-hidden border-gray-200 hover:shadow-md transition-shadow">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between pb-3">
                    <div className="flex flex-col">
                      <CardTitle className="text-lg font-bold text-gray-900">{c.subject}</CardTitle>
                      <span className="text-xs text-gray-400 font-medium">ID: {c.complaint_id} • {new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border shadow-sm">
                      {getStatusIcon(c.status)}
                      <span className="text-xs font-bold uppercase tracking-wider">{c.status}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Issue Description</label>
                        <p className="text-gray-700 leading-relaxed text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
                          {c.description}
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Impact Level</label>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${c.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {c.priority?.toUpperCase() || 'MEDIUM'}
                          </span>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Customer reference</label>
                          <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded truncate block">
                            {c.customer_id}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
