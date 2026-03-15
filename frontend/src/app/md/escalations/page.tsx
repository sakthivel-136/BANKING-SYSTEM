"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AlertTriangle, CheckSquare, XSquare } from "lucide-react"

export default function MDEscalations() {
  // Static mock since API doesn't specifically route escalations explicitly yet
  // Usually this would fetch "workflows pending MD approval" or escalated complaints
  const [escalations, setEscalations] = useState([
     { id: '101', type: 'Unfreeze Request', account_id: 'eb38-192a', reason: 'Customer sent KYC documents via branch.', date: '2026-03-14T10:00:00Z', status: 'Pending' },
     { id: '102', type: 'Large Transaction', account_id: 'a91c-112f', reason: 'Transfer of ₹1,500,000 flagged by Workflow #3.', date: '2026-03-14T12:30:00Z', status: 'Pending' }
  ])

  const action = (id: string, newStatus: string) => {
     setEscalations(escalations.map(e => e.id === id ? { ...e, status: newStatus } : e))
     alert(`Case ${id} marked as ${newStatus}`)
  }

  return (
    <DashboardLayout role="md">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Escalations Queue</h2>
      
      <div className="space-y-4">
         {escalations.map((e, i) => (
            <Card key={i} className="border-l-[4px] border-l-red-500">
               <CardHeader className="py-4">
                 <div className="flex justify-between items-center">
                    <div>
                       <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="text-red-500 w-5 h-5"/> {e.type}</CardTitle>
                       <CardDescription>Target Account: {e.account_id} | Escalated on {new Date(e.date).toLocaleString()}</CardDescription>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${e.status === 'Approved' ? 'bg-green-100 text-green-800' : e.status === 'Rejected' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}>
                       {e.status}
                    </span>
                 </div>
               </CardHeader>
               <CardContent>
                 <div className="bg-gray-50 p-4 rounded text-sm text-gray-700 border mb-4">
                    <span className="font-semibold block mb-1">Details:</span>
                    {e.reason}
                 </div>
                 
                 {e.status === 'Pending' && (
                    <div className="flex gap-3">
                        <button onClick={() => action(e.id, 'Approved')} className="flex items-center justify-center gap-2 bg-green-600 text-white font-medium py-2 px-4 rounded shadow-sm hover:bg-green-700 transition">
                           <CheckSquare className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => action(e.id, 'Rejected')} className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded shadow-sm hover:bg-gray-50 transition">
                           <XSquare className="w-4 h-4" /> Reject
                        </button>
                    </div>
                 )}
               </CardContent>
            </Card>
         ))}
      </div>
    </DashboardLayout>
  )
}
