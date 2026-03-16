"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/services/api"
import { ManagerTransactionModal } from "@/components/ManagerTransactionModal"

export default function ManagerAccounts() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filteredAccounts, setFilteredAccounts] = useState<any[]>([])
  const [chargeResult, setChargeResult] = useState<any>(null)
  const [chargeLoading, setChargeLoading] = useState(false)
  const [isChargeApplied, setIsChargeApplied] = useState(false)
  const [chargeCount, setChargeCount] = useState(0)
  const [viewingAccount, setViewingAccount] = useState<any | null>(null)

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    handleSearch()
  }, [searchTerm, filterType, filterStatus, accounts])

  const load = async () => {
    try {
      const res = await api.get("/accounts")
      setAccounts(res.data)
      setFilteredAccounts(res.data)
      checkChargeStatus()
    } catch (e) { console.error(e) }
  }

  const checkChargeStatus = async () => {
    try {
      const res = await api.get("/accounts/monthly-charges-status")
      setIsChargeApplied(res.data.applied)
      setChargeCount(res.data.count || 0)
    } catch (e) { console.error(e) }
  }

  const handleSearch = () => {
    let result = accounts
    if (searchTerm.trim()) {
      result = result.filter(acc =>
        acc.account_number?.includes(searchTerm) ||
        acc.customer_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterType !== "all") {
      result = result.filter(acc => acc.account_type?.toLowerCase() === filterType.toLowerCase())
    }
    if (filterStatus !== "all") {
      result = result.filter(acc => acc.status?.toLowerCase() === filterStatus.toLowerCase())
    }
    setFilteredAccounts(result)
  }

  const changeStatus = async (id: string, newStatus: string) => {
    if (newStatus === 'active') {
      const account = accounts.find(a => a.account_id === id)
      if (account?.account_type?.toLowerCase() === 'savings' && account.balance < 1000) {
        alert("Strict Rule: Cannot unfreeze/unblock a savings account with a balance below ₹1,000.")
        return
      }
    }
    try {
      await api.put(`/accounts/${id}/status?status=${newStatus}`)
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Status update failed")
    }
  }

  const applyMonthlyCharges = async (dryRun: boolean) => {
    setChargeLoading(true)
    setChargeResult(null)
    try {
      const endpoint = dryRun ? "/accounts/preview-monthly-charges" : "/accounts/trigger-monthly-charges"
      const res = await api.post(endpoint, {}, { timeout: 120000 })
      const data = dryRun ? res.data.preview : res.data.summary
      setChargeResult({ ...data, isDryRun: dryRun, message: res.data.message })
      if (!dryRun) {
        load()
        setIsChargeApplied(true)
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to apply charges")
    } finally {
      setChargeLoading(false)
      load()
    }
  }

  const handleReverseCharges = async () => {
    if (!confirm("Are you sure you want to reverse ALL monthly charges for this month?")) return
    try {
      const res = await api.post("/accounts/reverse-monthly-charges")
      alert(res.data.message + " (" + res.data.count + " transactions reversed)")
      load()
    } catch (e: any) {
      alert(e.response?.data?.detail || "Reversal failed")
    }
  }

  return (
    <DashboardLayout role="manager">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Account Management</h2>

      {/* Monthly Charges Panel */}
      <Card className="mb-6 border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-orange-800 text-base flex items-center gap-2">
            🏦 Monthly Bank Charges (10th of Each Month)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-700 mb-4">
            Automatically applied on the <strong>10th of each month</strong>: Minimum balance fine
            (Savings ₹200 / Current ₹1,000 / Investment ₹10,000) + ₹50 notification charge per account.
            Use <strong>Preview</strong> to see what will be charged before applying.
          </p>
            <div className="flex gap-2">
              <button 
                onClick={() => applyMonthlyCharges(true)} 
                disabled={chargeLoading || isChargeApplied}
                className="flex-1 bg-white border border-orange-300 text-orange-700 py-2 rounded-lg hover:bg-orange-100 transition-all disabled:opacity-50"
              >
                Preview Charges
              </button>
              <button 
                onClick={() => {
                  if (confirm("Are you sure you want to apply monthly charges to ALL active accounts? This will deduct balance from customers and send email notifications.")) {
                    applyMonthlyCharges(false)
                  }
                }}
                disabled={chargeLoading || isChargeApplied}
                className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition-all disabled:opacity-50"
              >
                {chargeLoading ? "Applying..." : "Apply Charges"}
              </button>
              {chargeCount > 1 && (
                <button 
                  onClick={handleReverseCharges}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-bold transition-all shadow-lg animate-pulse"
                >
                  ↺ REVERSE BATCH CHARGES
                </button>
              )}
            </div>
            {isChargeApplied && (
              <p className="text-center text-xs text-green-600 mt-2 font-semibold">
                ✓ Monthly charges have already been applied for this month.
              </p>
            )}

          {/* Charge result summary */}
          {chargeResult && (
            <div className={`mt-4 p-4 rounded-lg border ${chargeResult.isDryRun ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-sm font-semibold mb-2 ${chargeResult.isDryRun ? 'text-blue-800' : 'text-green-800'}`}>
                {chargeResult.isDryRun ? "📋 Preview Results (No charges applied)" : "✅ Charges Applied Successfully"}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-white p-2 rounded border text-center">
                  <div className="font-bold text-gray-800">{chargeResult.accounts_processed}</div>
                  <div className="text-gray-500 text-xs">Accounts Processed</div>
                </div>
                <div className="bg-white p-2 rounded border text-center">
                  <div className="font-bold text-red-600">{chargeResult.fines_applied}</div>
                  <div className="text-gray-500 text-xs">Balance Fines Applied</div>
                </div>
                <div className="bg-white p-2 rounded border text-center">
                  <div className="font-bold text-orange-600">₹{chargeResult.total_fines_collected?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                  <div className="text-gray-500 text-xs">Total Fines</div>
                </div>
                <div className="bg-white p-2 rounded border text-center">
                  <div className="font-bold text-purple-600">₹{chargeResult.grand_total_collected?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                  <div className="text-gray-500 text-xs">Grand Total Charged</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>All Customer Accounts</CardTitle>
            <div className="flex flex-wrap gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Types</option>
                <option value="savings">Savings</option>
                <option value="current">Current</option>
                <option value="investment">Investment</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="frozen">Frozen</option>
                <option value="closed">Blocked</option>
              </select>

              <input
                type="text"
                placeholder="Search name or account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm w-full md:w-64 outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 text-center">
                <tr>
                  <th className="px-6 py-3 text-left">Customer Name</th>
                  <th className="px-6 py-3 text-left">Account No.</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3 text-right">Balance</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {filteredAccounts.map((acc, i) => (
                  <tr key={i} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-left font-medium text-gray-900">{acc.customer_profile?.full_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-left font-mono">{acc.account_number}</td>
                    <td className="px-6 py-4 uppercase text-xs">{acc.account_type}</td>
                    <td className="px-6 py-4 text-right font-semibold">₹{Number(acc.balance).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 text-xs rounded-full ${
                         acc.status === 'active' ? 'bg-green-100 text-green-800' :
                         acc.status === 'frozen' ? 'bg-orange-100 text-orange-800' :
                         'bg-red-100 text-red-800'
                       }`}>
                         {acc.status === 'closed' ? 'blocked' : acc.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 flex justify-center gap-2">
                       <button 
                         onClick={() => setViewingAccount(acc)}
                         className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded"
                       >
                         View Details
                       </button>
                      {acc.status === 'active' ? (
                        <>
                          <button onClick={() => changeStatus(acc.account_id, 'frozen')} className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1 rounded">Freeze</button>
                          <button onClick={() => changeStatus(acc.account_id, 'closed')} className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded">Block</button>
                        </>
                      ) : (
                        <button onClick={() => changeStatus(acc.account_id, 'active')} className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded">Unblock / Unfreeze</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {viewingAccount && (
        <ManagerTransactionModal 
          account={viewingAccount} 
          onClose={() => setViewingAccount(null)} 
        />
      )}
    </DashboardLayout>
  )
}
