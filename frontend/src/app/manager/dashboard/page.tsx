"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { DashboardCard } from "@/components/ui/DashboardCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, AlertTriangle, ShieldAlert, Activity } from "lucide-react"
import api from "@/services/api"

export default function ManagerDashboard() {
  const [stats, setStats] = useState({ accounts: 0, frozen: 0, complaints: 0, alerts: 0 })

  useEffect(() => {
    async function loadStats() {
      try {
        const accs = await api.get("/accounts")
        const cmpl = await api.get("/complaints")
        
        setStats({
           accounts: accs.data.length,
           frozen: accs.data.filter((a:any) => a.status === 'frozen').length,
           complaints: cmpl.data.filter((c:any) => c.status === 'Pending').length,
           alerts: 3 // mock for now, from alerts queue later
        })
      } catch (e) { console.error(e) }
    }
    loadStats()
  }, [])

  return (
    <DashboardLayout role="manager">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Manager Overview</h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <DashboardCard 
          title="Total Accounts" 
          value={stats.accounts} 
          icon={Users} 
        />
        <DashboardCard 
          title="Frozen Accounts" 
          value={stats.frozen} 
          icon={ShieldAlert} 
        />
        <DashboardCard 
          title="Pending Complaints" 
          value={stats.complaints} 
          icon={AlertTriangle} 
        />
        <DashboardCard 
          title="Low Balance Alerts" 
          value={stats.alerts} 
          icon={Activity} 
        />
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
