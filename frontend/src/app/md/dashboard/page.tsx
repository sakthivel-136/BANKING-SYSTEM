"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { DashboardCard } from "@/components/ui/DashboardCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, BarChart, TrendingUp, HandCoins, Download, Landmark, PieChart as PieIcon, BarChart3 } from "lucide-react"
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

  const handleDownloadReport = async (format: "csv" | "pdf") => {
    try {
      const endpoint = format === "csv" ? "/reports/monthly-download" : "/reports/monthly-download-pdf"
      const res = await api.get(endpoint, { responseType: "blob" })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      const now = new Date()
      const ext = format === "csv" ? "csv" : "pdf"
      link.setAttribute("download", `smartbank_report_${now.getFullYear()}_${String(now.getMonth()+1).padStart(2,'0')}.${ext}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(`Failed to download ${format.toUpperCase()} report: ` + (err.response?.data?.detail || err.message))
    }
  }

  if (!report) return <DashboardLayout role="md"><div className="p-8">Loading analytics...</div></DashboardLayout>

  return (
    <DashboardLayout role="md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
           <TrendingUp className="text-primary w-8 h-8"/> Overall Analytics
        </h2>
        <div className="flex gap-3">
          <button 
            onClick={() => handleDownloadReport("csv")}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition shadow-sm font-medium"
          >
            <Download className="w-4 h-4" /> CSV Report
          </button>
          <button 
            onClick={() => handleDownloadReport("pdf")}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition shadow-sm font-medium"
          >
            <Download className="w-4 h-4" /> PDF Report
          </button>
          <button 
            onClick={() => setShowManagerModal(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition shadow-sm font-medium"
          >
            <PieChart className="w-4 h-4" /> Add New Manager
          </button>
        </div>
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
         <Card className="border-gray-200">
            <CardHeader className="pb-2">
               <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" /> Transaction Volume Trends
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-64 flex items-end justify-between px-8 py-4 bg-gray-50/50 rounded-xl border border-gray-100">
                  {/* CSS/SVG Bar Chart */}
                  {[
                    { label: "Deposits", value: report['Total Deposits'], color: "bg-emerald-500" },
                    { label: "Withdraws", value: report['Total Withdrawals'], color: "bg-rose-500" },
                    { label: "Transfers", value: report['Total Transfers'], color: "bg-blue-500" }
                  ].map((bar, idx) => {
                    const maxVal = Math.max(report['Total Deposits'], report['Total Withdrawals'], report['Total Transfers'], 1);
                    const height = (bar.value / maxVal) * 100;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-3 w-1/4 h-full justify-end group">
                        <div className="relative w-full flex justify-center items-end h-full">
                          <div 
                            className={`${bar.color} w-16 rounded-t-lg transition-all duration-500 group-hover:opacity-80 shadow-sm`}
                            style={{ height: `${height}%` }}
                          />
                          <div className="absolute -top-8 text-[10px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded border shadow-sm">
                            ₹{bar.value.toLocaleString()}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">{bar.label}</span>
                      </div>
                    )
                  })}
               </div>
               <div className="flex justify-around mt-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <span className="font-medium text-gray-600">Deposits: <span className="text-emerald-700 font-bold">₹{report['Total Deposits'].toLocaleString()}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-rose-500 rounded-full" />
                    <span className="font-medium text-gray-600">Withdraws: <span className="text-rose-700 font-bold">₹{report['Total Withdrawals'].toLocaleString()}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="font-medium text-gray-600">Transfers: <span className="text-blue-700 font-bold">₹{report['Total Transfers'].toLocaleString()}</span></span>
                  </div>
               </div>
            </CardContent>
         </Card>

         <Card className="border-gray-200">
            <CardHeader className="pb-2">
               <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-orange-600" /> Account Status Distribution
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-64 flex items-center justify-center relative">
                  {/* CSS Conic Gradient Donut */}
                  <div 
                    className="w-48 h-48 rounded-full shadow-inner flex items-center justify-center"
                    style={{
                      background: `conic-gradient(
                        #10b981 0% ${((report['Total Accounts'] - report['Frozen Accounts'] - report['Blocked Accounts']) / report['Total Accounts']) * 100}%, 
                        #f59e0b ${((report['Total Accounts'] - report['Frozen Accounts'] - report['Blocked Accounts']) / report['Total Accounts']) * 100}% ${((report['Total Accounts'] - report['Blocked Accounts']) / report['Total Accounts']) * 100}%, 
                        #ef4444 ${((report['Total Accounts'] - report['Blocked Accounts']) / report['Total Accounts']) * 100}% 100%
                      )`
                    }}
                  >
                    <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-lg border border-gray-50">
                       <span className="text-3xl font-extrabold text-gray-900">{report['Total Accounts']}</span>
                       <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Total Assets</span>
                    </div>
                  </div>
               </div>
               <div className="flex justify-around mt-6 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <span className="text-gray-600">Active: <span className="text-emerald-700 font-bold">{report['Total Accounts'] - report['Frozen Accounts'] - report['Blocked Accounts']}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full" />
                    <span className="text-gray-600">Frozen: <span className="text-orange-700 font-bold">{report['Frozen Accounts']}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-rose-500 rounded-full" />
                    <span className="text-gray-600">Blocked: <span className="text-rose-700 font-bold">{report['Blocked Accounts']}</span></span>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>
    </DashboardLayout>
  )
}
