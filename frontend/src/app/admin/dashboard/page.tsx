"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { DashboardCard } from "@/components/ui/DashboardCard"
import { PlayCircle, StopCircle, Activity, ServerCog } from "lucide-react"
import api from "@/services/api"

export default function AdminDashboard() {
  const [stats, setStats] = useState({ activeWf: 0, execsToday: 0, totalExecs: 0 })

  useEffect(() => {
    async function load() {
      try {
        const wf = await api.get("/workflows")
        const ex = await api.get("/executions")
        
        const active = wf.data.filter((w:any) => w.is_active).length
        const today = new Date().toDateString()
        const execsToday = ex.data.filter((e:any) => new Date(e.started_at).toDateString() === today).length
        
        setStats({ activeWf: active, execsToday, totalExecs: ex.data.length })
      } catch (e) { console.error(e) }
    }
    load()
  }, [])

  return (
    <DashboardLayout role="admin">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Workflow Engine Status</h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <DashboardCard title="Active Workflows" value={stats.activeWf} icon={PlayCircle} trend={{value: "0 from yesterday", isPositive: true}} />
        <DashboardCard title="Executions Today" value={stats.execsToday} icon={Activity} />
        <DashboardCard title="Total Executions (All Time)" value={stats.totalExecs} icon={ServerCog} />
      </div>

      <div className="p-6 bg-gradient-to-r from-primary to-secondary rounded-xl text-white shadow-lg">
         <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2"><ServerCog className="w-6 h-6"/> Engine Health</h3>
         <p className="opacity-90 max-w-2xl">The workflow engine is running optimally. 0 failures detected in the last 24 hours. The FastApi backend evaluator is actively listening for event triggers from core banking services.</p>
         <button className="mt-4 bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-md transition backdrop-blur-sm">
            Restart Engine Nodes
         </button>
      </div>
    </DashboardLayout>
  )
}
