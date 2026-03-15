"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, Send, Loader2, User, Headset, Clock, XCircle } from "lucide-react"
import api from "@/services/api"

export default function CustomerEnquiry() {
  const [enquiries, setEnquiries] = useState<any[]>([])
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
    // Poll for answers every 30 seconds
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
     if (scrollRef.current) {
         scrollRef.current.scrollTop = scrollRef.current.scrollHeight
     }
  }, [enquiries])

  const load = async () => {
    try {
      const res = await api.get("/enquiries")
      setEnquiries(res.data.reverse()) // Show newest at bottom if we want chat flow, or handle accordingly
    } catch (e) {
      console.error("Failed to load enquiries", e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!msg.trim()) return
    setSending(true)
    try {
      await api.post("/enquiries/", { message: msg }) // Added trailing slash just in case
      setMsg("")
      await load()
    } catch (e: any) {
      alert("Failed to send enquiry: " + (e.response?.data?.detail || "Unknown error"))
    } finally {
      setSending(false)
    }
  }

  const handleEndChat = async (id: string) => {
    if (!confirm("Are you sure you want to end this chat? It will be archived and removed from your view.")) return;
    try {
      await api.put(`/enquiries/${id}/close`)
      await load()
    } catch (err: any) {
      alert("Failed to end chat: " + (err.response?.data?.detail || err.message))
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-500">Loading Chat...</div>

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <MessageSquare className="text-primary w-8 h-8" />
                Customer Support
            </h1>
            <p className="text-gray-500 mt-1">Ask us anything, our managers are here to help.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full ring-1 ring-emerald-200">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Manager Online
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-gray-200 shadow-xl bg-white">
        {/* Chat Area */}
        <CardContent 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30"
        >
          {enquiries.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-bold text-gray-900">No conversations yet</h3>
                <p className="text-sm text-gray-500 max-w-xs mt-2">Send your first message below to start a conversation with our support team.</p>
             </div>
          ) : (
            enquiries.map((enq, i) => (
              <div key={i} className="space-y-4">
                {/* User Message */}
                <div className="flex justify-end gap-3">
                    <div className="max-w-[80%]">
                        <div className="bg-primary text-white p-4 rounded-2xl rounded-tr-none shadow-md shadow-primary/10">
                            <p className="text-sm leading-relaxed">{enq.message}</p>
                        </div>
                        <div className="flex justify-end items-center gap-2 mt-1.5 px-1">
                            <span className="text-[10px] font-medium text-gray-400">{new Date(enq.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <User className="w-3 h-3 text-gray-300" />
                        </div>
                    </div>
                </div>

                {/* Manager Response */}
                {enq.response ? (
                   <div className="flex justify-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                            <Headset className="w-4 h-4 text-white" />
                        </div>
                        <div className="max-w-[80%]">
                            <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm">
                                <p className="text-sm text-gray-800 leading-relaxed">{enq.response}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 px-1">
                                <span className="text-[10px] font-bold text-gray-900 uppercase tracking-tight">Manager</span>
                                <span className="text-[10px] font-medium text-gray-400">• Just now</span>
                            </div>
                        </div>
                   </div>
                ) : (
                    <div className="flex justify-start gap-3 opacity-60">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="bg-gray-100 px-4 py-2 rounded-full border border-gray-200">
                             <p className="text-xs text-gray-500 font-medium">Waiting for manager response...</p>
                        </div>
                    </div>
                )}
              </div>
            ))
          )}
        </CardContent>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSubmit} className="relative">
                <input 
                    type="text"
                    disabled={sending}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-5 pr-14 py-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="Type your message here..."
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                />
                <button 
                    disabled={sending || !msg.trim()}
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 transition shadow-lg shadow-primary/20 disabled:bg-gray-200 disabled:shadow-none"
                >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </form>
            <p className="text-[10px] text-center text-gray-400 mt-3 font-medium">SmartBank Support uses end-to-end encryption for all messages.</p>
        </div>
      </Card>
    </div>
  )
}
