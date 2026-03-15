"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/services/api"
import { AlertCircle } from "lucide-react"

export default function ManagerAlerts() {
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => {
    // In a real app we would have an alerts API based on workflow executions
    // Here we just fetch executions filtered to LOW_BALANCE
    async function fetchAlerts() {
      try {
        const res = await api.get("/executions")
        const filtered = res.data.filter((e:any) => e.workflows?.name === 'LOW_BALANCE_MONITORING')
        setAlerts(filtered)
      } catch (e) {
        console.error(e)
      }
    }
    fetchAlerts()
  }, [])

  return (
    <DashboardLayout role="manager">
      <h2 className="text-3xl font-bold tracking-tight mb-6">System Alerts (Low Balance)</h2>
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
             {alerts.map((alert, i) => (
                <div key={i} className="flex flex-col md:flex-row md:items-center justify-between border p-4 rounded-md border-orange-200 bg-orange-50">
                  <div className="flex items-start gap-3">
                     <AlertCircle className="w-5 h-5 text-orange-500 mt-1" />
                     <div>
                       <h4 className="font-semibold text-orange-900">Low Balance Detected: Account {alert.data?.account_id}</h4>
                       <p className="text-sm text-orange-700">Triggered at {new Date(alert.started_at).toLocaleString()} (Execution ID: {alert.execution_id.substring(0,8)}...)</p>
                       <p className="text-sm font-medium mt-1">Current Balance: ₹{alert.data?.balance}</p>
                     </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex gap-2">
                     <button className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded shadow-sm">Review Account</button>
                     <button className="bg-white border text-gray-700 text-xs px-3 py-1.5 rounded shadow-sm hover:bg-gray-50">Dismiss</button>
                  </div>
                </div>
             ))}
             {alerts.length === 0 && <p className="text-sm text-gray-500 py-4">No active low balance alerts.</p>}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
