"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { DashboardCard } from "@/components/ui/DashboardCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, AlertTriangle, ShieldAlert, Activity, Clock, Landmark, PiggyBank, TrendingUp, Ban, Snowflake, CreditCard, Wallet } from "lucide-react"
import Link from "next/link"
import api from "@/services/api"

export default function ManagerDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/accounts/dashboard-stats")
        setStats(res.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || !stats) {
    return (
      <DashboardLayout role="manager">
        <div className="p-12 text-center text-gray-400 text-lg animate-pulse">Loading dashboard...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="manager">
      <h2 className="text-3xl font-bold tracking-tight mb-2">Manager Overview</h2>
      <p className="text-gray-500 mb-8">Real-time overview of all banking operations and accounts.</p>
      
      {/* Row 1: Key Metrics */}
      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4 mb-6">
        <DashboardCard title="Total Customers" value={stats.total_customers} icon={Users} />
        <DashboardCard title="Total Accounts" value={stats.total_accounts} icon={CreditCard} />
        <DashboardCard title="Total Balance" value={`₹${Number(stats.total_balance).toLocaleString('en-IN')}`} icon={Landmark} />
        <DashboardCard title="Pending Approvals" value={stats.pending_approvals} icon={Clock} />
      </div>

      {/* Row 2: Account Types */}
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 mt-2">Account Breakdown</h3>
      <div className="grid gap-5 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        <DashboardCard title="Active Accounts" value={stats.active_accounts} icon={Activity} />
        <DashboardCard title="Savings Accounts" value={stats.savings_accounts} icon={PiggyBank} />
        <DashboardCard title="Investment Accounts" value={stats.investment_accounts} icon={TrendingUp} />
        <DashboardCard title="Current Accounts" value={stats.current_accounts} icon={Wallet} />
        <DashboardCard title="Frozen Accounts" value={stats.frozen_accounts} icon={Snowflake} />
        <DashboardCard title="Blocked Accounts" value={stats.blocked_accounts} icon={Ban} />
      </div>

      {/* Low Balance Alerts */}
      {stats.low_balance_count > 0 && (
        <div className="mb-6">
          <DashboardCard title="Low Balance Alerts" value={stats.low_balance_count} icon={AlertTriangle} />
        </div>
      )}

      {/* Row 3: Approval Breakdown */}
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 mt-2">Approval Queue</h3>
      <div className="grid gap-5 grid-cols-1 md:grid-cols-3 mb-8">
        <Link href="/manager/approvals" className="block transition-transform hover:-translate-y-1">
          <Card className="border-gray-200 shadow-sm h-full hover:border-blue-200 hover:shadow-md transition-all">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Transfers</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pending_transfers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/manager/approvals" className="block transition-transform hover:-translate-y-1">
          <Card className="border-gray-200 shadow-sm h-full hover:border-orange-200 hover:shadow-md transition-all">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pending_activity_requests}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/manager/profile-requests" className="block transition-transform hover:-translate-y-1">
          <Card className="border-gray-200 shadow-sm h-full hover:border-purple-200 hover:shadow-md transition-all">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Profile Updates</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pending_profile_updates}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </DashboardLayout>
  )
}
