"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MessageSquare, Send, User, Loader2, Search } from "lucide-react"
import api from "@/services/api"
import { format } from "date-fns"

export default function ManagerEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEnquiry, setSelectedEnquiry] = useState<any | null>(null)
  const [response, setResponse] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredEnquiries, setFilteredEnquiries] = useState<any[]>([])

  useEffect(() => {
    loadEnquiries()
  }, [])

  const loadEnquiries = async () => {
    try {
      const res = await api.get("/enquiries")
      setEnquiries(res.data)
      setFilteredEnquiries(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredEnquiries(enquiries)
      return
    }
    const filtered = enquiries.filter(e => 
      e.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.customer_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredEnquiries(filtered)
  }

  const handleAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEnquiry || !response.trim()) return
    setIsSubmitting(true)
    try {
      await api.put(`/enquiries/${selectedEnquiry.enquiry_id}`, { response })
      setResponse("")
      setSelectedEnquiry(null)
      loadEnquiries()
      alert("Response sent successfully!")
    } catch (err) {
      alert("Failed to send response")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout role="manager">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" /> Customer Enquiries
          </h2>
          <p className="text-gray-500 mt-1">Respond to customer messages and support requests.</p>
        </div>
        <div className="flex gap-2">
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                   type="text" 
                   placeholder="Search messages..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
            </div>
            <button 
              onClick={handleSearch}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition shadow-sm"
            >
              Search
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enquiry List */}
        <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : filteredEnquiries.map((enq) => (
            <Card 
              key={enq.enquiry_id} 
              className={`cursor-pointer transition-all hover:shadow-md ${selectedEnquiry?.enquiry_id === enq.enquiry_id ? 'ring-2 ring-primary border-transparent' : 'border-gray-100'}`}
              onClick={() => { setSelectedEnquiry(enq); setResponse(enq.response || ""); }}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{enq.customer_profile?.full_name || 'Customer'}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">{format(new Date(enq.created_at), "MMM d, h:mm a")}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${enq.status === 'Answered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {enq.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{enq.message}</p>
              </CardContent>
            </Card>
          ))}
          {filteredEnquiries.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
              No enquiries found.
            </div>
          )}
        </div>

        {/* Chat / Response Detail */}
        <div className="lg:col-span-2">
          {selectedEnquiry ? (
            <Card className="h-full flex flex-col min-h-[500px] border-0 ring-1 ring-gray-200 shadow-xl rounded-2xl overflow-hidden">
               <CardHeader className="bg-gray-50 border-b p-6">
                  <CardTitle className="text-lg flex items-center justify-between">
                     Chat Thread
                     <span className="text-xs font-normal text-gray-400">TICKET #{selectedEnquiry.enquiry_id.substring(0,8)}</span>
                  </CardTitle>
               </CardHeader>
               <CardContent className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
                  {/* Customer Message */}
                  <div className="flex flex-col items-start space-y-2">
                    <div className="bg-white border text-gray-800 p-4 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm relative">
                        <p className="text-sm leading-relaxed">{selectedEnquiry.message}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium ml-1">Customer • {format(new Date(selectedEnquiry.created_at), "h:mm a")}</span>
                  </div>

                  {/* Previous Response if any */}
                  {selectedEnquiry.response && (
                    <div className="flex flex-col items-end space-y-2">
                      <div className="bg-primary text-white p-4 rounded-2xl rounded-tr-none max-w-[85%] shadow-md">
                          <p className="text-sm leading-relaxed">{selectedEnquiry.response}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium mr-1">You • {selectedEnquiry.status === 'Answered' ? 'Sent' : 'Draft'}</span>
                    </div>
                  )}
               </CardContent>
               <div className="p-6 bg-white border-t border-gray-100 mt-auto">
                  <form onSubmit={handleAnswer} className="relative">
                    <textarea 
                      required
                      placeholder="Type your response to the customer..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none pr-16"
                      rows={3}
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                    />
                    <button 
                      type="submit"
                      disabled={isSubmitting || !response.trim()}
                      className="absolute right-4 bottom-4 p-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </form>
               </div>
            </Card>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
               <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4">
                  <MessageSquare className="w-10 h-10 text-gray-300" />
               </div>
               <h3 className="text-lg font-bold text-gray-900 mb-2">Select an Enquiry</h3>
               <p className="text-gray-500 max-w-xs mx-auto">Click on a customer message from the left to view the thread and send a response.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
