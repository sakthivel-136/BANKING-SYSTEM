"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { DashboardCard } from "@/components/ui/DashboardCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, AlertTriangle, ShieldAlert, Activity } from "lucide-react"
import api from "@/services/api"

export default function ManagerDashboard() {
  const [stats, setStats] = useState<any>({})
  const [lowBalanceCount, setLowBalanceCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [sRes, eRes] = await Promise.all([
          api.get("/executions/stats"),
          api.get("/executions")
        ])
        setStats(sRes.data)
        
        // Count low balance monitoring alerts
        const alerts = eRes.data.filter((ex: any) => 
          ex.workflow_name === "LOW_BALANCE_MONITORING" && ex.status === "completed"
        )
        setLowBalanceCount(alerts.length)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <DashboardLayout role="manager">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Manager Overview</h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <DashboardCard title="Active Workflows" value={stats.active_workflows || 3} icon={Activity} color="bg-primary" />
        <DashboardCard title="Low Balance Alerts" value={lowBalanceCount} icon={AlertTriangle} color="bg-rose-500" />
        <DashboardCard title="Pending Approvals" value={stats.pending_approvals || 12} icon={Clock} color="bg-secondary" />
        {/* The original fourth card is removed as per the instruction's implied replacement */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
           <ul className="space-y-4">
             <li className="flex gap-4 p-3 border-b border-gray-100">
               <div className="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
               <div>
                  <p className="font-medium text-sm text-gray-800">New complaint registered by customer #1092</p>
                  <p className="text-xs text-gray-500">10 mins ago</p>
               </div>
             </li>
             <li className="flex gap-4 p-3 border-b border-gray-100">
               <div className="w-2 h-2 mt-2 rounded-full bg-red-500"></div>
               <div>
                  <p className="font-medium text-sm text-gray-800">Account #9928 frozen due to unfreeze request escalation</p>
                  <p className="text-xs text-gray-500">45 mins ago</p>
               </div>
             </li>
           </ul>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
