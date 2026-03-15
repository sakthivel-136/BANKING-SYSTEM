"use client"

import { useState } from "react"
import api from "@/services/api"
import { Loader2, Key, Save, User, Lock, CheckCircle2 } from "lucide-react"

interface Customer {
  customer_id: string
  full_name: string
  email: string
  phone_number?: string
  date_of_birth?: string
  gender?: string
  nationality?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  pan_card_number?: string
}

interface Props {
  customer: Customer
  onClose: () => void
  onSuccess: () => void
}

type Step = "edit" | "verify" | "done"

export function ManagerCustomerEditModal({ customer, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("edit")
  const [formData, setFormData] = useState({
    phone_number: customer.phone_number || "",
    date_of_birth: customer.date_of_birth || "",
    gender: customer.gender || "",
    nationality: customer.nationality || "",
    address: customer.address || "",
    city: customer.city || "",
    state: customer.state || "",
    country: customer.country || "",
    postal_code: customer.postal_code || "",
  })
  const [otpSent, setOtpSent] = useState(false)
  const [managerPassword, setManagerPassword] = useState("")
  const [customerOtp, setCustomerOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSendOtp = async () => {
    setLoading(true)
    setError("")
    try {
      await api.post("/auth/customer-edit-otp", { customer_id: customer.customer_id })
      setOtpSent(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError("")
    try {
      await api.post("/customers/in-person-update", {
        customer_id: customer.customer_id,
        manager_password: managerPassword,
        customer_otp: customerOtp,
        new_data: formData,
      })
      setStep("done")
    } catch (err: any) {
      setError(err.response?.data?.detail || "Verification failed")
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
  const lockedCls = "w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Edit Customer Profile</h3>
              <p className="text-xs text-gray-500">{customer.full_name} • {customer.email}</p>
            </div>
          </div>
          {/* Step Indicator */}
          <div className="flex gap-2 mt-4">
            {["Edit Details", "Verify Identity", "Done"].map((s, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${
                i === 0 && step === "edit" ? "bg-primary" :
                i === 1 && (step === "verify" || step === "done") ? "bg-primary" :
                i === 2 && step === "done" ? "bg-green-500" :
                "bg-gray-100"
              }`} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg">{error}</div>
          )}

          {step === "edit" && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700 font-medium">
                🔒 <strong>Locked fields:</strong> Full Name and PAN Card cannot be changed in-person.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelCls}>Full Name (Locked)</label>
                  <input className={lockedCls} value={customer.full_name} readOnly />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelCls}>PAN Card (Locked)</label>
                  <input className={lockedCls} value={customer.pan_card_number || "—"} readOnly />
                </div>
                <div>
                  <label className={labelCls}>Phone Number</label>
                  <input type="tel" className={inputCls} value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
                </div>
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <input type="date" className={inputCls} value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                </div>
                <div>
                  <label className={labelCls}>Gender</label>
                  <select className={inputCls} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Nationality</label>
                  <input className={inputCls} value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Address</label>
                  <input className={inputCls} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input className={inputCls} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input className={inputCls} value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input className={inputCls} value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                </div>
                <div>
                  <label className={labelCls}>Postal Code</label>
                  <input className={inputCls} value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} />
                </div>
              </div>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-6">
              {/* Step 1: Send OTP to customer */}
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-center gap-3 mb-3">
                  <Key className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Step 1: Customer OTP Verification</h4>
                </div>
                <p className="text-sm text-blue-700 mb-4">An OTP will be sent to the customer's registered email (<strong>{customer.email}</strong>). Ask the customer to share it with you.</p>
                {!otpSent ? (
                  <button onClick={handleSendOtp} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Send OTP to Customer
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg text-sm font-medium border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" /> OTP sent! Ask the customer for the code.
                  </div>
                )}
                {otpSent && (
                  <div className="mt-4">
                    <label className={labelCls}>Customer's OTP Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="••••••"
                      className="w-48 text-center text-2xl tracking-widest border border-gray-300 rounded-lg py-3 px-4 font-mono focus:ring-primary focus:border-primary outline-none"
                      value={customerOtp}
                      onChange={e => setCustomerOtp(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Step 2: Manager password */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <Lock className="w-5 h-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-800">Step 2: Your Password</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">Enter your own manager login password to authorize this change.</p>
                <input
                  type="password"
                  className={inputCls}
                  placeholder="Your manager password"
                  value={managerPassword}
                  onChange={e => setManagerPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-5">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
              <p className="text-gray-500 max-w-sm">The profile update has been forwarded to the MD for final approval. The customer will receive an email once approved.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex justify-between gap-3 bg-gray-50/50">
          {step === "done" ? (
            <button onClick={() => { onSuccess(); onClose(); }} className="ml-auto bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition">
              Done
            </button>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              {step === "edit" ? (
                <button onClick={() => { setError(""); setStep("verify"); }} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition">
                  <Save className="w-4 h-4" /> Next: Verify Identity
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !otpSent || customerOtp.length < 6 || !managerPassword}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Submit for MD Approval
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
