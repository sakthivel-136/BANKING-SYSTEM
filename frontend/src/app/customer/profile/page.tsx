"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { UserCircle, ShieldCheck, Loader2, Save, ArrowRight } from "lucide-react"
import api from "@/services/api"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1) // 1: Editing, 2: OTP
  const [requestId, setRequestId] = useState("")
  const [otp, setOtp] = useState("")
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get("/auth/me")
        setUser(res.data)
        if (res.data.profile) {
          setFormData({
            full_name: res.data.profile.full_name,
            phone_number: res.data.profile.phone_number,
            address: res.data.profile.address,
            city: res.data.profile.city,
            state: res.data.profile.state,
            postal_code: res.data.profile.postal_code
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleRequestUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    try {
      const res = await api.post("/customers/profile-update-request", formData)
      setRequestId(res.data.request_id)
      setStep(2)
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to request profile update")
    } finally {
      setProcessing(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    try {
      await api.post("/customers/profile-update-verify", {
        request_id: requestId,
        otp_code: otp
      })
      setSuccess(true)
    } catch (err: any) {
      alert(err.response?.data?.detail || "Invalid OTP")
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-500">Loading Profile...</div>

  if (success) {
      return (
          <div className="max-w-2xl mx-auto py-12 text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Request Submitted</h1>
              <p className="text-gray-600 text-lg mb-8">Your profile update request has been verified and sent to the manager for approval. You will be notified once the changes are applied.</p>
              <button 
                onClick={() => window.location.href = '/customer/dashboard'}
                className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition shadow-lg shadow-primary/20"
              >
                  Return to Dashboard
              </button>
          </div>
      )
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <UserCircle className="text-primary w-8 h-8" />
            My Profile
        </h1>
        <p className="text-gray-500 mt-2">Manage your personal information and contact details.</p>
      </div>

      <div className="grid gap-8">
        {step === 1 ? (
          <Card className="border-gray-200 shadow-sm overflow-hidden">
             <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Personal Information</span>
                <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-md">Edit Mode</span>
             </div>
            <CardContent className="p-8">
              <form onSubmit={handleRequestUpdate} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <input 
                            required 
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" 
                            value={formData.full_name}
                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Phone Number</label>
                        <input 
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" 
                            value={formData.phone_number}
                            onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                        />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                        <label className="text-sm font-medium text-gray-700">Address</label>
                        <textarea 
                            rows={3}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" 
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">City</label>
                        <input 
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" 
                            value={formData.city}
                            onChange={(e) => setFormData({...formData, city: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Postal Code</label>
                        <input 
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" 
                            value={formData.postal_code}
                            onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-end">
                    <button 
                        disabled={processing}
                        type="submit" 
                        className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                      {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Request Changes</>}
                    </button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-emerald-200 shadow-xl shadow-emerald-50 bg-emerald-50/10">
            <CardContent className="p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Confirm Profile Changes</h2>
                    <p className="text-sm text-gray-600 mt-2">Enter the verification code sent to your email to proceed.</p>
                </div>
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Verification Code</label>
                  <input 
                    required 
                    type="text" 
                    maxLength={6}
                    className="w-full px-4 py-4 bg-white border-2 border-emerald-100 rounded-xl text-3xl text-center font-bold tracking-[0.5em] text-gray-900 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
                <button 
                  disabled={processing}
                  type="submit" 
                  className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify & Submit for Approval"}
                </button>
                <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500 font-medium hover:text-gray-800 transition">Discard Changes</button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
