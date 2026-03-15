"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { DashboardCard } from "@/components/ui/DashboardCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, BarChart, TrendingUp, HandCoins } from "lucide-react"
import api from "@/services/api"

export default function MDDashboard() {
  const [report, setReport] = useState<any>(null)
  const [showManagerModal, setShowManagerModal] = useState(false)
  const [managerData, setManagerData] = useState({
    full_name: "",
    email: "",
    aadhaar_number: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/reports/summary")
        setReport(res.data)
      } catch (e) { console.error(e) }
    }
    load()
  }, [])

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    setSuccessMsg("")
    try {
      await api.post("/auth/staff/create-request", managerData)
      setSuccessMsg("Manager invitation sent! They can log in via OTP and set their password.")
      setManagerData({ full_name: "", email: "", aadhaar_number: "" })
      setTimeout(() => setShowManagerModal(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to add manager")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!report) return <DashboardLayout role="md"><div className="p-8">Loading analytics...</div></DashboardLayout>

  return (
    <DashboardLayout role="md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
           <TrendingUp className="text-primary w-8 h-8"/> Overall Analytics
        </h2>
        <button 
          onClick={() => setShowManagerModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition shadow-sm font-medium"
        >
          <PieChart className="w-4 h-4" /> Add New Manager
        </button>
      </div>

      {showManagerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Add New Manager</h3>
              <p className="text-sm text-gray-500">Provide details to invite a new manager to the platform.</p>
            </div>
            <form onSubmit={handleAddManager} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-100">{error}</div>}
              {successMsg && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-100">{successMsg}</div>}
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" required 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="e.g. John Doe"
                  value={managerData.full_name}
                  onChange={(e) => setManagerData({...managerData, full_name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" required 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="manager@smartbank.test"
                  value={managerData.email}
                  onChange={(e) => setManagerData({...managerData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Aadhaar Number</label>
                <input 
                  type="text" required maxLength={12}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono tracking-widest"
                  placeholder="0000 0000 0000"
                  value={managerData.aadhaar_number}
                  onChange={(e) => setManagerData({...managerData, aadhaar_number: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowManagerModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition shadow-md shadow-primary/20 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? "Processing..." : "Invite Manager"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
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
