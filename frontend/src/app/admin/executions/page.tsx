"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import api from "@/services/api"
import { FileCode2, ChevronDown, ChevronRight } from "lucide-react"

export default function AdminExecutions() {
  const [executions, setExecutions] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/executions")
        setExecutions(res.data)
      } catch (e) { console.error(e) }
    }
    load()
  }, [])

  return (
    <DashboardLayout role="admin">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Execution Traces</h2>
      
      <Card>
         <CardHeader>
            <CardTitle>Historical Execution Log</CardTitle>
            <CardDescription>Detailed rule evaluation and payload tracing for every triggered workflow.</CardDescription>
         </CardHeader>
         <CardContent>
            <div className="space-y-4">
               {executions.map((ex, i) => (
                  <div key={i} className="border rounded-md bg-white overflow-hidden text-sm">
                     <div 
                        onClick={() => setExpandedId(expandedId === ex.execution_id ? null : ex.execution_id)}
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition"
                     >
                        <div className="flex items-center gap-3 w-1/3">
                           {expandedId === ex.execution_id ? <ChevronDown size={18} className="text-gray-400"/> : <ChevronRight size={18} className="text-gray-400"/>}
                           <span className="font-semibold">{ex.workflows?.name || 'Unknown Workflow'} (v{ex.workflow_version})</span>
                        </div>
                        <div className="flex-1 text-gray-500 font-mono text-xs">{ex.execution_id}</div>
                        <div className="w-1/4 text-right pr-4 text-gray-500">{new Date(ex.started_at).toLocaleString()}</div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full w-24 text-center ${ex.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{ex.status}</span>
                     </div>
                     
                     {expandedId === ex.execution_id && (
                        <div className="p-4 border-t bg-gray-50 grid lg:grid-cols-2 gap-4">
                           <div>
                              <h5 className="font-semibold mb-2 flex items-center gap-2"><FileCode2 size={16}/> Input Payload Object</h5>
                              <pre className="bg-[#1e1e1e] text-green-400 p-3 rounded font-mono text-xs overflow-x-auto">
                                 {JSON.stringify(ex.data, null, 2)}
                              </pre>
                           </div>
                           <div>
                              <h5 className="font-semibold mb-2 flex items-center gap-2"><FileCode2 size={16}/> Trace Log (Rules Evaluated)</h5>
                              <div className="bg-[#1e1e1e] text-green-400 p-3 rounded font-mono text-xs max-h-[250px] overflow-y-auto space-y-2">
                                 {(ex.logs || []).map((log: any, idx: number) => (
                                    <div key={idx} className="flex gap-4">
                                       <span className="text-blue-400 whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                       <span className="text-gray-300">Step {log.step}:</span>
                                       <span>{log.msg}</span>
                                    </div>
                                 ))}
                                 {(!ex.logs || ex.logs.length === 0) && <span className="text-gray-500">No trace logs recorded. Engine might not have evaluated fully.</span>}
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               ))}
               {executions.length === 0 && <p className="text-center text-gray-500 py-6">No historical executions to display.</p>}
            </div>
         </CardContent>
      </Card>
    </DashboardLayout>
  )
}
