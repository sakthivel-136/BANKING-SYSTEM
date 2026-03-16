"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, Send, Loader2, User, Headset, Clock, XCircle, ShieldCheck } from "lucide-react"
import api from "@/services/api"

export default function CustomerEnquiry() {
  const [messages, setMessages] = useState<any[]>([])
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000) // Poll faster for active chat
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
     if (scrollRef.current) {
         scrollRef.current.scrollTop = scrollRef.current.scrollHeight
     }
  }, [messages])

  const load = async () => {
    try {
      const res = await api.get("/enquiries")
      // Sort messages chronologically for the chat thread
      const sorted = res.data.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      setMessages(sorted)
    } catch (e) {
      console.error("Failed to load messages", e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!msg.trim()) return
    setSending(true)
    try {
      console.log("SENDING MESSAGE:", msg);
      const postRes = await api.post("/enquiries/", { message: msg })
      console.log("POST RESPONSE:", postRes.data);
      setMsg("")
      await load()
    } catch (e: any) {
      console.error("CHAT SEND ERROR:", e);
      alert("Failed to send: " + (e.response?.data?.detail || "Unknown error"))
    } finally {
      setSending(false)
    }
  }

  const handleEndChat = async () => {
    if (!confirm("Are you sure you want to end this chat? It will be archived.")) return;
    try {
      // Use the dedicated close-session endpoint — it places farewell on last message
      await api.post("/enquiries/close-session")
      await load()
    } catch (err: any) {
      alert("Failed to end chat: " + (err.response?.data?.detail || err.message))
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-400 font-medium">Loading Support...</div>

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-6 flex justify-between items-center px-2">
        <div>
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                <MessageSquare className="text-primary w-8 h-8" />
                Live Support
            </h1>
            <p className="text-gray-500 text-sm mt-1 font-medium">Our managers are usually online and ready to help.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full ring-1 ring-emerald-200 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Connected
            </div>
            {messages.length > 0 && (
                <button
                    onClick={handleEndChat}
                    className="text-xs bg-white text-gray-600 hover:text-red-600 px-3 py-1.5 rounded-xl border border-gray-200 transition font-bold flex items-center gap-1.5 shadow-sm"
                >
                    <XCircle className="w-3.5 h-3.5" /> End Session
                </button>
            )}
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-gray-200 shadow-2xl rounded-3xl bg-white relative">
        <CardContent 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/20"
        >
          {messages.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-4 border border-gray-100 shadow-inner">
                    <MessageSquare className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Start a conversation</h3>
                <p className="text-sm text-gray-500 max-w-xs mt-2 font-medium">Send a message below and a manager will assist you shortly.</p>
             </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className="space-y-4">
                {/* User Message */}
                <div className="flex justify-end gap-3">
                    <div className="max-w-[75%]">
                        <div className="bg-primary text-white p-4 rounded-2xl rounded-tr-none shadow-lg shadow-primary/10">
                            <p className="text-sm leading-relaxed font-medium">{m.message}</p>
                        </div>
                        <div className="flex justify-end items-center gap-2 mt-1.5 px-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <User className="w-3 h-3 text-gray-300" />
                        </div>
                    </div>
                </div>

                {/* Manager Response */}
                {m.response ? (
                   <div className="flex justify-start gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-gray-900 flex items-center justify-center shrink-0 shadow-md">
                            <Headset className="w-5 h-5 text-white" />
                        </div>
                        <div className="max-w-[75%]">
                            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
                                <p className="text-sm text-gray-800 leading-relaxed font-medium">{m.response}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 px-1">
                                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Support Team</span>
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">• Sent</span>
                            </div>
                        </div>
                   </div>
                ) : (
                    <div className="flex justify-start gap-3 opacity-40">
                        <div className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                            <Clock className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100">
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Waiting for response...</p>
                        </div>
                    </div>
                )}
              </div>
            ))
          )}
        </CardContent>

        <div className="p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSubmit} className="relative">
                <input 
                    type="text"
                    disabled={sending}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-6 pr-16 py-5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:ring-4 focus:ring-primary/5 focus:border-primary/50 focus:bg-white outline-none transition-all shadow-inner"
                    placeholder="Describe your issue or ask a question..."
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                />
                <button 
                    disabled={sending || !msg.trim()}
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 transition shadow-xl shadow-primary/20 disabled:bg-gray-100 disabled:shadow-none disabled:text-gray-300"
                >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </form>
            <div className="flex items-center justify-center gap-2 mt-4">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Safe & Encryption Guaranteed</p>
            </div>
        </div>
      </Card>
    </div>
  )
}
