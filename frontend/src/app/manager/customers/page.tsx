"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Users, Search, Loader2 } from "lucide-react"
import api from "@/services/api"
import { format } from "date-fns"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [step, setStep] = useState<"form" | "otp">("form")
  const [requestId, setRequestId] = useState("")
  const [otpCode, setOtpCode] = useState("")
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    pan_card_number: "",
    date_of_birth: "",
    gender: "",
    nationality: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    initial_account_type: "Savings"
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const res = await api.get("/customers")
      setCustomers(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    try {
      const res = await api.post("/customers/create-request", formData)
      setRequestId(res.data.request_id)
      setStep("otp")
      setSuccessMsg("OTP sent to the customer's email. Please verify.")
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to initiate customer creation")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    setSuccessMsg("")
    try {
      await api.post("/customers/create-verify", {
        request_id: requestId,
        otp_code: otpCode
      })

      setShowModal(false)
      setStep("form")
      setFormData({ 
        full_name: "", email: "", phone_number: "", pan_card_number: "",
        date_of_birth: "", gender: "", nationality: "", address: "",
        city: "", state: "", country: "", postal_code: "",
        initial_account_type: "Savings"
      })
      setOtpCode("")
      loadCustomers()
      alert("Customer account created successfully! Check terminal for background OTP logs.")
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to verify OTP")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetModal = () => {
    setShowModal(false)
    setStep("form")
    setError("")
    setSuccessMsg("")
  }

  return (
    <DashboardLayout role="manager">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Customer Management</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add New Customer
        </button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" /> All Customers
            </CardTitle>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                 type="text" 
                 placeholder="Search customers..." 
                 className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Name</th>
                    <th className="px-6 py-3 font-semibold">Email</th>
                    <th className="px-6 py-3 font-semibold">Phone</th>
                    <th className="px-6 py-3 font-semibold">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((c) => (
                    <tr key={c.customer_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{c.full_name}</td>
                      <td className="px-6 py-4 text-gray-600">{c.email}</td>
                      <td className="px-6 py-4 text-gray-600">{c.phone_number || "—"}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {c.created_at ? format(new Date(c.created_at), "MMM d, yyyy") : "—"}
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                     <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No customers found</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900">Add New Customer</h3>
              <p className="text-sm text-gray-500 mt-1">
                {step === "form" ? "Enter complete customer details to trigger an OTP verification." : "Verify the OTP sent to the customer."}
              </p>
            </div>
            <div className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-100">
                  {successMsg}
                </div>
              )}

              {step === "form" ? (
                <form onSubmit={handleRequestOTP} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input type="text" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input type="email" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input type="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PAN Card</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none uppercase" value={formData.pan_card_number} onChange={(e) => setFormData({...formData, pan_card_number: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                       <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                       <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                       <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                       <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                       <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none" value={formData.postal_code} onChange={(e) => setFormData({...formData, postal_code: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Initial Account Type</label>
                       <select 
                         required
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary outline-none" 
                         value={formData.initial_account_type} 
                         onChange={(e) => setFormData({...formData, initial_account_type: e.target.value})}
                       >
                         <option value="Savings">Savings Account</option>
                         <option value="Current">Current Account</option>
                         <option value="Business">Business Account</option>
                         <option value="Investment">Investment Account</option>
                       </select>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button type="button" onClick={resetModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-70">
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Next (Send OTP)
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="flex flex-col justify-center items-center py-6">
                    <label className="block text-sm font-medium text-gray-700 text-center mb-4">Enter 6-Digit OTP sent to {formData.email}</label>
                    <input 
                      required 
                      type="text" 
                      maxLength={6}
                      value={otpCode} 
                      onChange={e => setOtpCode(e.target.value)} 
                      placeholder="••••••" 
                      className="block w-48 text-center text-3xl tracking-widest border border-gray-300 rounded-md py-4 px-3 focus:ring-primary focus:border-primary" 
                    />
                  </div>
                  <div className="mt-6 flex justify-between gap-3 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => { setStep("form"); setError(""); setSuccessMsg(""); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                      Back to Edit
                    </button>
                    <div className="flex gap-3">
                       <button type="button" onClick={resetModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                         Cancel
                       </button>
                       <button type="submit" disabled={isSubmitting || otpCode.length !== 6} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-70">
                         {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                         Verify & Create
                       </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
