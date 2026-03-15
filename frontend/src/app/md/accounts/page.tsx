"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/services/api"

export default function MDAccounts() {
  const [accounts, setAccounts] = useState<any[]>([])

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await api.get("/accounts")
      setAccounts(res.data)
    } catch (e) { console.error(e) }
  }

  const changeStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/accounts/${id}/status?status=${newStatus}`)
      load()
    } catch (e) {
      alert("Status update failed")
    }
  }

  return (
    <DashboardLayout role="md">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Account Management</h2>
      <Card>
        <CardHeader>
          <CardTitle>All Customer Accounts</CardTitle>
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
                {accounts.map((acc, i) => (
                  <tr key={i} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-left font-medium text-gray-900">{acc.customer_profile?.full_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-left font-mono">{acc.account_number}</td>
                    <td className="px-6 py-4 uppercase text-xs">{acc.account_type}</td>
                    <td className="px-6 py-4 text-right font-semibold">₹{Number(acc.balance).toLocaleString('en-IN')}</td>
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
                      {acc.status === 'active' ? (
                        <>
                          <button onClick={() => changeStatus(acc.account_id, 'frozen')} className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1 rounded transition">Freeze</button>
                          <button onClick={() => changeStatus(acc.account_id, 'closed')} className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded transition">Block</button>
                        </>
                      ) : (
                        <button onClick={() => changeStatus(acc.account_id, 'active')} className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded transition">Unblock / Unfreeze</button>
                      )}
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-gray-400">No accounts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
