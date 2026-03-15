"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRightLeft, TrendingUp, CreditCard, PlusCircle, MinusCircle } from "lucide-react"
import api from "@/services/api"
import Link from 'next/link'

export default function CustomerDashboard() {
  const [user, setUser] = useState<any>(null)
  const [account, setAccount] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, accRes] = await Promise.all([
          api.get("/auth/me"),
          api.get("/accounts/mine")
        ])
        setUser(meRes.data)
        if (accRes.data && accRes.data.length > 0) {
          const mainAccount = accRes.data[0]
          setAccount(mainAccount)
          const txnRes = await api.get(`/transactions/${mainAccount.account_id}`)
          setTransactions(txnRes.data.slice(0, 5))
        }
      } catch (err) {
        console.error("Dashboard error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>

  const displayName = user?.profile?.full_name || user?.email || "Guest"
  const balance = account?.balance || 0
  const accountNumber = account?.account_number || "N/A"

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {displayName}</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your accounts and transactions securely.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer ID</p>
          <p className="text-sm font-bold text-primary">{user?.profile?.customer_number || "---"}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-200 lg:col-span-2 bg-gradient-to-br from-primary to-primary/90 text-white relative overflow-hidden">
          <CardContent className="p-8 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-primary-foreground/80 font-medium text-sm text-blue-100">Total Available Balance</p>
                <h2 className="text-5xl font-bold mt-2 tracking-tight">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                <div className="mt-6 flex items-center gap-3">
                   <span className="px-2.5 py-1 bg-white/20 rounded-md text-xs font-medium backdrop-blur-md">Account: {accountNumber}</span>
                   <span className="px-2.5 py-1 bg-white/20 rounded-md text-xs font-medium backdrop-blur-md capitalize">{account?.account_type || "Savings"}</span>
                </div>
              </div>
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md ring-1 ring-white/20">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-foreground/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        </Card>

        {/* Action Card */}
        <Card className="border-0 shadow-sm ring-1 ring-gray-200 bg-white">
          <CardContent className="p-6 h-full flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Actions</h3>
              <p className="text-sm text-gray-500 mb-4">Quick access to banking operations.</p>
            </div>
            <div className="space-y-2">
              <Link href="/customer/deposit" className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition w-full shadow-sm shadow-emerald-200">
                <PlusCircle className="w-4 h-4" /> Deposit
              </Link>
              <Link href="/customer/withdrawal" className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition w-full shadow-sm shadow-rose-200">
                <MinusCircle className="w-4 h-4" /> Withdraw
              </Link>
              <Link href="/customer/transfer" className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition w-full shadow-sm">
                <ArrowRightLeft className="w-4 h-4" /> Transfer
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <h2 className="text-lg font-bold text-gray-900 pt-4">Recent Activity</h2>
      <Card className="border-0 shadow-sm ring-1 ring-gray-200 overflow-hidden">
        {transactions.length > 0 ? (
          <div className="divide-y divide-gray-100">
             {transactions.map((txn) => {
               const isPositive = txn.transaction_type === "deposit" || (txn.transaction_type === "transfer" && txn.receiver_account === accountNumber)
               return (
                 <div key={txn.transaction_id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-gray-50/50 transition cursor-default">
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                         {txn.transaction_type === 'transfer' ? <ArrowRightLeft className="w-5 h-5" /> : (isPositive ? <PlusCircle className="w-5 h-5" /> : <MinusCircle className="w-5 h-5" />)}
                       </div>
                       <div>
                         <p className="text-sm font-semibold text-gray-900 capitalize">{txn.transaction_type}</p>
                         <p className="text-xs text-gray-500">
                            {new Date(txn.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                         </p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                         {isPositive ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                       </p>
                       <p className="text-[10px] text-gray-400 uppercase font-medium mt-0.5 tracking-tight">Status: Completed</p>
                    </div>
                 </div>
               )
             })}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">No transactions found.</div>
        )}
      </Card>
    </div>
  )
}
