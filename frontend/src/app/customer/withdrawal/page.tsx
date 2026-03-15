"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { MinusCircle, ShieldCheck, ArrowRight, Loader2 } from "lucide-react"
import api from "@/services/api"
import { useRouter } from "next/navigation"

export default function WithdrawalPage() {
  const [user, setUser] = useState<any>(null)
  const [account, setAccount] = useState<any>(null)
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1) // 1: Amount, 2: OTP
  const [requestId, setRequestId] = useState("")
  const [otp, setOtp] = useState("")
  const [processing, setProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, accRes] = await Promise.all([
          api.get("/auth/me"),
          api.get("/accounts/mine")
        ])
        setUser(meRes.data)
        if (accRes.data && accRes.data.length > 0) setAccount(accRes.data[0])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    try {
      const res = await api.post("/transactions/operation-request?op_type=withdraw", {
        account_id: account.account_id,
        amount: parseFloat(amount)
      })
      setRequestId(res.data.request_id)
      setStep(2)
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to request OTP")
    } finally {
      setProcessing(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    try {
      await api.post("/transactions/operation-verify", {
        request_id: requestId,
        otp_code: otp
      })
      alert("Withdrawal successful!")
      router.push("/customer/dashboard")
    } catch (err: any) {
      alert(err.response?.data?.detail || "Invalid OTP")
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-500">Loading Withdrawal...</div>

  const displayName = user?.profile?.full_name || user?.email || "Guest"
  const balance = account?.balance || 0
  const customerId = user?.profile?.customer_number || "---"

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MinusCircle className="text-rose-600 w-8 h-8" />
            Withdraw Funds
        </h1>
        <p className="text-gray-500 mt-2">Withdraw cash from your SmartBank account.</p>
      </div>

      <div className="grid gap-6">
        <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-6">
                <div className="flex justify-between items-center text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                    <span>Account Details</span>
                    <span className="text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full ring-1 ring-rose-200 uppercase">Secure Only</span>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Customer Name</span>
                        <span className="font-semibold text-gray-900">{displayName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Customer ID</span>
                        <span className="font-semibold text-gray-900">{customerId}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Available Balance</span>
                        <span className="font-bold text-rose-600">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        {step === 1 ? (
          <Card className="border-rose-100 shadow-lg shadow-rose-50">
            <CardContent className="p-8">
              <form onSubmit={handleRequestOTP} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Withdrawal Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">₹</span>
                    <input 
                      required 
                      type="number" 
                      min="1"
                      max={balance}
                      step="0.01"
                      className="w-full pl-10 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl text-2xl font-bold text-gray-900 focus:ring-rose-500 focus:border-rose-500 transition-all outline-none" 
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  {parseFloat(amount) > balance && <p className="text-xs text-rose-500 font-medium mt-2">Insufficient funds available.</p>}
                </div>
                <button 
                  disabled={processing || parseFloat(amount) > balance || !amount}
                  type="submit" 
                  className="w-full bg-rose-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-rose-700 transition shadow-lg shadow-rose-200 disabled:bg-gray-200 disabled:shadow-none flex items-center justify-center gap-2 group"
                >
                  {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Continue to OTP <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                </button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-rose-200 shadow-xl shadow-rose-50 bg-rose-50/10">
            <CardContent className="p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">OTP Verification</h2>
                    <p className="text-sm text-gray-600 mt-2">We sent a 6-digit code to your registered email for withdrawal.</p>
                </div>
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Enter OTP</label>
                  <input 
                    required 
                    type="text" 
                    maxLength={6}
                    className="w-full px-4 py-4 bg-white border-2 border-rose-100 rounded-xl text-3xl text-center font-bold tracking-[0.5em] text-gray-900 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" 
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
                <button 
                  disabled={processing}
                  type="submit" 
                  className="w-full bg-rose-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-rose-700 transition shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                >
                  {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify & Withdraw"}
                </button>
                <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500 font-medium hover:text-gray-800 transition">Go Back</button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
