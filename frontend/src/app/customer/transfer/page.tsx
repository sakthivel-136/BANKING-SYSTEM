"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

import api from "@/services/api"
import { Send } from "lucide-react"

export default function CustomerTransfer() {
  const [accountId, setAccountId] = useState("")
  const [account, setAccount] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [accountStatus, setAccountStatus] = useState("active")

  const [receiver, setReceiver] = useState("")
  const [amount, setAmount] = useState("")
  const [status, setStatus] = useState({ type: "", message: "" })
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"request" | "verify">("request")
  const [requestId, setRequestId] = useState("")
  const [otpCode, setOtpCode] = useState("")

  useEffect(() => {
    async function fetchData() {
      try {
        const profRes = await api.get("/customers/me")
        setProfile(profRes.data)

        const accRes = await api.get("/accounts/mine")
        if (accRes.data && accRes.data.length > 0) {
          const acc = accRes.data[0]
          setAccount(acc)
          setAccountId(acc.account_id)
          setAccountStatus(acc.status || "active")
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchData()
  }, [])


  const isRestricted = accountStatus === "frozen" || accountStatus === "closed"


  const handleTransferRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus({ type: "", message: "" })
    try {
      const res = await api.post("/transactions/transfer-request", {
        account_id: accountId,
        amount: parseFloat(amount),
        receiver_account: receiver
      })
      setRequestId(res.data.request_id)
      setStep("verify")
      setStatus({ type: "success", message: `OTP sent to your email. (Check terminal for demo log)` })
    } catch (err: any) {
      setStatus({ type: "error", message: err.response?.data?.detail || "Failed to initiate transfer" })
    }
    setLoading(false)
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus({ type: "", message: "" })
    try {
      const res = await api.post("/transactions/transfer-verify", {
        request_id: requestId,
        otp_code: otpCode
      })
      setStatus({ type: "success", message: res.data.message })
      setReceiver("")
      setAmount("")
      setOtpCode("")
      setStep("request")
    } catch (err: any) {
      setStatus({ type: "error", message: err.response?.data?.detail || "Verification failed" })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-primary"/> Funds Transfer</CardTitle>
          <CardDescription>Send money safely to any SmartBank account.</CardDescription>
        </CardHeader>
        <CardContent>
          {status.message && (
            <div className={`p-4 mb-4 rounded-md ${status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {status.message}
            </div>
          )}
          {isRestricted && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-semibold text-sm">
                🔒 Account {accountStatus === "frozen" ? "Frozen" : "Blocked"}
              </p>
              <p className="text-red-600 text-xs mt-1">
                {accountStatus === "frozen"
                  ? "Your account is frozen. You can view your balance but cannot make transfers or withdrawals. Please contact your branch."
                  : "Your account has been blocked. Please contact your branch to resolve this."}
              </p>
            </div>
          )}
          {step === "request" ? (

            <form onSubmit={handleTransferRequest} className="space-y-4">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-inner space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>Your Account</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">ACTIVE</span>
                </div>
                <div className="grid grid-cols-2 gap-y-4">
                   <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Customer Name</p>
                      <p className="text-sm font-bold text-gray-900">{profile?.full_name || "Loading..."}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Customer ID</p>
                      <p className="text-sm font-mono font-bold text-primary">{profile?.customer_number || "..."}</p>
                   </div>
                   <div className="col-span-2 pt-4 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Available Balance</p>
                      <p className="text-3xl font-black text-primary mt-1">₹{account?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</p>
                   </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Receiver Account Number</label>
                <input required type="text" value={receiver} onChange={e => setReceiver(e.target.value)} placeholder="e.g. 100029384" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹)</label>
                <input required type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold text-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="font-semibold">Note:</span> Transfers exceeding ₹10,000 will be held for Manager Approval after OTP verification.
              </div>
              <button disabled={loading || !accountId || isRestricted} type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
                {loading ? "Processing..." : "Continue to Verification"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-6">
                <p className="text-sm text-blue-800 text-center font-medium">Please enter the 6-digit OTP sent to your registered email to confirm the transfer of ₹{amount}.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 text-center">6-Digit OTP</label>
                <input 
                  required 
                  type="text" 
                  maxLength={6}
                  value={otpCode} 
                  onChange={e => setOtpCode(e.target.value)} 
                  placeholder="••••••" 
                  className="mt-2 mx-auto block w-32 text-center text-2xl tracking-widest border border-gray-300 rounded-md py-3 px-3 focus:ring-primary focus:border-primary" 
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setStep("request")} className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition">
                  Cancel
                </button>
                <button disabled={loading || otpCode.length !== 6} type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none transition disabled:opacity-50">
                  {loading ? "Verifying..." : "Confirm Transfer"}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>

  )
}
