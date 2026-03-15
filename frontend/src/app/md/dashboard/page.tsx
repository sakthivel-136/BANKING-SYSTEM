"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { DashboardCard } from "@/components/ui/DashboardCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, BarChart, TrendingUp, HandCoins } from "lucide-react"
import api from "@/services/api"

export default function MDDashboard() {
  const [report, setReport] = useState<any>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/reports/summary")
        setReport(res.data)
      } catch (e) { console.error(e) }
    }
    load()
  }, [])

  if (!report) return <DashboardLayout role="md"><div className="p-8">Loading analytics...</div></DashboardLayout>

  return (
    <DashboardLayout role="md">
      <h2 className="text-3xl font-bold tracking-tight mb-6 flex items-center gap-2">
         <TrendingUp className="text-primary w-8 h-8"/> Overall Analytics
      </h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <DashboardCard 
          title="Total Platform Balance" 
          value={`₹${report['Total Balance']}`} 
          icon={HandCoins} 
        />
        <DashboardCard 
          title="Total Accounts" 
          value={report['Total Accounts']} 
          icon={PieChart} 
        />
        <DashboardCard 
          title="Blocked/Frozen Assets" 
          value={report['Blocked Accounts'] + report['Frozen Accounts']} 
          icon={BarChart} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card>
            <CardHeader><CardTitle>Transaction Volume Trends</CardTitle></CardHeader>
            <CardContent>
               <div className="h-64 bg-gray-50 flex items-center justify-center border border-dashed rounded text-sm text-gray-500">
                  {/* Real implementation would use Recharts here, mocked for preview */}
                  [Bar Chart Placeholder: Deposits vs Withdrawals vs Transfers]
               </div>
               <div className="flex justify-around mt-4 text-sm font-medium">
                  <span className="text-green-600">Deposits: ₹{report['Total Deposits']}</span>
                  <span className="text-red-600">Withdraws: ₹{report['Total Withdrawals']}</span>
                  <span className="text-blue-600">Transfers: ₹{report['Total Transfers']}</span>
               </div>
            </CardContent>
         </Card>
         <Card>
            <CardHeader><CardTitle>Account Status Distribution</CardTitle></CardHeader>
            <CardContent>
               <div className="h-64 bg-gray-50 flex items-center justify-center border border-dashed rounded text-sm text-gray-500 relative">
                  [Donut Chart Placeholder]
                  <div className="absolute flex flex-col items-center">
                     <span className="text-2xl font-bold text-gray-800">{report['Total Accounts']}</span>
                     <span className="text-xs text-gray-400 uppercase">Accounts</span>
                  </div>
               </div>
               <div className="flex justify-around mt-4 text-sm font-medium">
                  <span className="text-green-600">Active: {report['Total Accounts'] - report['Frozen Accounts'] - report['Blocked Accounts']}</span>
                  <span className="text-orange-600">Frozen: {report['Frozen Accounts']}</span>
                  <span className="text-red-600">Blocked: {report['Blocked Accounts']}</span>
               </div>
            </CardContent>
         </Card>
      </div>
    </DashboardLayout>
  )
}
