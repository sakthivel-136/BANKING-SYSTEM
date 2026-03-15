"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Globe, ShieldCheck, Mail, Lock, Eye, EyeOff, UserSquare2, KeyRound } from "lucide-react"
import api from "@/services/api"
import { createBrowserClient } from '@supabase/ssr'

export default function Login() {
  const router = useRouter()
  const [loginType, setLoginType] = useState<"customer" | "staff">("customer")
  
  // Shared state
  const [customerId, setCustomerId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Staff state
  const [password, setPassword] = useState("password123")
  const [showPassword, setShowPassword] = useState(false)
  
  // Customer OTP state
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request")
  const [otpCode, setOtpCode] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const supabase = createBrowserClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: customerId,
        password,
      })
      
      if (authError) throw authError
      if (!data.user) throw new Error("No user returned")
      
      const role = data.user.user_metadata?.roles || 'customer'
      if (role === 'customer') throw new Error("Customers must use OTP login.")
      
      setTimeout(() => {
         if (role === 'md') router.push('/md/dashboard')
         else if (role === 'admin') router.push('/admin/dashboard')
         else if (role === 'manager') router.push('/manager/dashboard')
      }, 500)

    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.")
      setLoading(false)
    }
  }

  const handleCustomerOTPRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccessMsg("")
    try {
      const res = await api.post("/auth/login-otp/request", { customer_id: customerId })
      setOtpStep("verify")
      setSuccessMsg("OTP has been sent to your registered email.")
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to send OTP.")
    }
    setLoading(false)
  }

  const handleCustomerOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
      const res = await api.post("/auth/login-otp/verify", { 
        identifier: customerId, 
        otp_code: otpCode 
      })
      
      if (res.data.status === "success") {
        // Establish the real Supabase session from the backend tokens
        if (res.data.session) {
          await supabase.auth.setSession({
            access_token: res.data.session.access_token,
            refresh_token: res.data.session.refresh_token,
          })
        }
        setSuccessMsg("Success! Redirecting...")
        setTimeout(() => {
           router.push('/customer/dashboard')
        }, 1000)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid OTP code.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
           <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
             <Globe className="text-white w-7 h-7" />
           </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          SmartBank Automation System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-xl border-0 ring-1 ring-gray-200">
          
          <div className="flex border-b border-gray-200 bg-gray-50 rounded-t-xl overflow-hidden">
            <button
              onClick={() => { setLoginType("customer"); setError(""); setSuccessMsg(""); }}
              className={`flex-1 py-4 text-sm font-medium text-center transition flex justify-center items-center gap-2 ${loginType === "customer" ? "bg-white text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
            >
               <UserSquare2 className="w-4 h-4" /> Customer Login
            </button>
            <button
              onClick={() => { setLoginType("staff"); setError(""); setSuccessMsg(""); }}
              className={`flex-1 py-4 text-sm font-medium text-center transition flex justify-center items-center gap-2 ${loginType === "staff" ? "bg-white text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
            >
               <ShieldCheck className="w-4 h-4" /> Staff Login
            </button>
          </div>

          <CardContent className="pt-6 bg-white rounded-b-xl min-h-[320px]">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm flex items-start gap-2">
                 <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0"/>
                 <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-md text-sm flex items-start gap-2">
                 <span>{successMsg}</span>
              </div>
            )}
            
            {loginType === "staff" ? (
              <form className="space-y-5" onSubmit={handleStaffLogin}>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Staff Email address</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2.5 border"
                      placeholder="manager1@smartbank.test"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="focus:ring-primary focus:border-primary block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-md py-2.5 border transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <button type="submit" disabled={loading} className="mt-4 w-full flex justify-center py-2.5 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none transition-colors disabled:opacity-70">
                    {loading ? "Authenticating..." : "Sign in securely"}
                  </button>
                </div>
              </form>
            ) : (
              // Customer Login Flow
              <>
                {otpStep === "request" ? (
                  <form className="space-y-5" onSubmit={handleCustomerOTPRequest}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer ID</label>
                      <p className="text-xs text-gray-500 mb-2 mt-1">Found in your welcome email (e.g., CU123456).</p>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserSquare2 className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          required
                          className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2.5 border"
                          placeholder="CU123456"
                          value={customerId}
                          onChange={(e) => setCustomerId(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <button type="submit" disabled={loading || !customerId} className="mt-4 w-full flex justify-center py-2.5 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none transition-colors disabled:opacity-70">
                     {loading ? "Sending..." : "Request Secure OTP"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form className="space-y-5" onSubmit={handleCustomerOTPVerify}>
                    <div className="flex flex-col items-center">
                       <KeyRound className="w-12 h-12 text-blue-500 mb-3 opacity-20" />
                       <label className="block text-sm font-medium text-gray-700">Enter 6-Digit OTP</label>
                       <p className="text-xs text-gray-500 text-center mb-4 mt-1 px-4">An email with the security code has been sent for account <span className="font-semibold text-gray-700">{customerId}</span></p>
                       
                       <input
                          type="text"
                          required
                          maxLength={8}
                          className="focus:ring-primary focus:border-primary block w-48 text-center text-3xl tracking-widest sm:text-2xl border-gray-300 rounded-md py-3 border"
                          placeholder="••••••••"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-3 pt-4">
                      <button type="submit" disabled={loading || otpCode.length < 6} className="w-full flex justify-center py-2.5 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none transition-colors disabled:opacity-70">
                        {loading ? "Verifying..." : "Verify & Sign In"}
                      </button>
                      <button type="button" onClick={() => setOtpStep("request")} className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 transition-colors">
                        Go Back
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            <div className="mt-8">
               <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Demo Accounts</span></div>
               <div className="mt-2 text-xs text-center text-gray-500 space-y-1">
                  <p>Customer: customer1@smartbank.test</p>
                  <p>Manager: manager1@smartbank.test</p>
                  <p>MD: md@smartbank.test</p>
               </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
