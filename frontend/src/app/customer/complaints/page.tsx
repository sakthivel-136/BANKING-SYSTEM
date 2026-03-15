"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Bell, Send, Loader2, AlertTriangle, CheckCircle2, History } from "lucide-react"
import api from "@/services/api"

export default function CustomerComplaints() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [form, setForm] = useState({ title: "", description: "" })
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const res = await api.get("/complaints")
      setComplaints(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await api.post("/complaints/", form)
      setForm({ title: "", description: "" })
      setSuccess(true)
      await load()
      setTimeout(() => setSuccess(false), 5000)
    } catch (e: any) {
      alert("Failed to submit complaint: " + (e.response?.data?.detail || "Unknown error"))
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-500">Loading Complaints...</div>

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="text-rose-600 w-8 h-8" />
            Lodge a Complaint
        </h1>
        <p className="text-gray-500 mt-2">If you have any issues with your transactions or account, please let us know.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
            <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-8">
                    {success && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium">Complaint submitted successfully! We will review it shortly.</span>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject / Title</label>
                                <input 
                                    required 
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                                    placeholder="Briefly describe the issue (e.g., Transaction failure)"
                                    value={form.title}
                                    onChange={(e) => setForm({...form, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Detailed Description</label>
                                <textarea 
                                    required
                                    rows={6}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                    placeholder="Provide more details, transaction IDs, dates, etc."
                                    value={form.description}
                                    onChange={(e) => setForm({...form, description: e.target.value})}
                                />
                            </div>
                        </div>

                        <button 
                            disabled={sending}
                            type="submit" 
                            className="w-full bg-rose-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-rose-700 transition shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                        >
                            {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-5 h-5" /> Submit Complaint</>}
                        </button>
                    </form>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2">
            <div className="sticky top-8 space-y-6">
                <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                        <History className="w-4 h-4 text-gray-400" />
                        <h3 className="font-bold text-gray-900">Ticket History</h3>
                    </div>
                    <CardContent className="p-0 overflow-y-auto max-h-[600px]">
                        {complaints.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <p className="text-sm italic">No past tickets found.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {complaints.map((c, i) => (
                                    <div key={i} className="p-5 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-900 text-sm leading-tight">{c.title}</h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                                c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                                {c.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.description}</p>
                                        <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
                                            <span>#{c.complaint_id.slice(0, 8)}</span>
                                            <span>{new Date(c.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {c.manager_response && (
                                            <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                                                <p className="text-[10px] font-bold text-blue-900 mb-1">Manager Response:</p>
                                                <p className="text-xs text-blue-800 leading-relaxed">{c.manager_response}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl">
                    <h4 className="text-rose-900 font-bold flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        Urgent Issue?
                    </h4>
                    <p className="text-xs text-rose-800 leading-relaxed">
                        For immediate assistance regarding blocked cards or suspicious activity, please use the <span className="font-bold underline">Requests</span> page or contact our 24/7 hotline.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}
