"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus, GripVertical, Settings2, Save } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminWorkflowEditor() {
  const router = useRouter()
  const [steps, setSteps] = useState([
     { id: 1, type: "task", name: "Check Balance Threshold", condition: "balance < 1000" },
     { id: 2, type: "notification", name: "Send Customer Email Alert", condition: "true" }
  ])

  const addStep = (type: string) => {
     setSteps([...steps, { id: steps.length + 1, type, name: `New ${type} step`, condition: "true" }])
  }

  const handleSave = () => {
     alert("Workflow saved dynamically (Mock save in MVP)")
     router.push("/admin/workflows")
  }

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-3xl font-bold tracking-tight">Visual Workflow Builder</h2>
         <button onClick={handleSave} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium text-sm">
            <Save className="w-4 h-4"/> Save Version
         </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-4">
            {steps.map((step, idx) => (
               <Card key={step.id} className="relative transition hover:border-gray-300">
                  <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center bg-gray-50 border-r rounded-l-md cursor-grab active:cursor-grabbing text-gray-400">
                     <GripVertical size={16}/>
                  </div>
                  <CardContent className="pl-12 pt-6 pb-6">
                     <div className="flex justify-between items-start">
                        <div>
                           <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-primary uppercase tracking-wider">Step {idx+1}: {step.type}</span>
                           </div>
                           <input type="text" value={step.name} onChange={(e) => {
                              const newSt = [...steps]
                              newSt[idx].name = e.target.value; setSteps(newSt)
                           }} className="font-semibold text-lg border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none w-full bg-transparent"/>
                        </div>
                        <button className="text-gray-400 hover:text-gray-700 p-2"><Settings2 size={18}/></button>
                     </div>
                     <div className="mt-4 bg-gray-50 border border-dashed rounded p-3">
                        <label className="text-xs font-medium text-gray-500 block mb-1">Execution Rule Condition (Python eval format)</label>
                        <input className="w-full bg-white border p-1 rounded text-sm font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary" value={step.condition} onChange={e=>{
                           const newSt=[...steps]; newSt[idx].condition = e.target.value; setSteps(newSt)
                        }}/>
                     </div>
                  </CardContent>
               </Card>
            ))}
            <div className="flex justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 bg-gray-50">
               <span className="text-sm font-medium text-gray-500 flex items-center gap-2"><Plus size={16}/> Drag components from right panel to append steps</span>
            </div>
         </div>

         <div>
            <Card className="sticky top-6">
               <CardHeader>
                  <CardTitle>Nodes</CardTitle>
                  <CardDescription>Click to add step</CardDescription>
               </CardHeader>
               <CardContent className="space-y-3">
                  <button onClick={()=>addStep('task')} className="w-full text-left p-3 border rounded hover:border-primary hover:bg-gray-50 transition flex items-center gap-3">
                     <div className="bg-blue-100 text-blue-600 p-2 rounded"><Settings2 size={16}/></div>
                     <div><p className="font-medium text-sm">Task Node</p><p className="text-xs text-gray-500">Automated system action</p></div>
                  </button>
                  <button onClick={()=>addStep('approval')} className="w-full text-left p-3 border rounded hover:border-primary hover:bg-gray-50 transition flex items-center gap-3">
                     <div className="bg-orange-100 text-orange-600 p-2 rounded"><Settings2 size={16}/></div>
                     <div><p className="font-medium text-sm">Approval Node</p><p className="text-xs text-gray-500">Manager/MD intervention</p></div>
                  </button>
                  <button onClick={()=>addStep('notification')} className="w-full text-left p-3 border rounded hover:border-primary hover:bg-gray-50 transition flex items-center gap-3">
                     <div className="bg-green-100 text-green-600 p-2 rounded"><Settings2 size={16}/></div>
                     <div><p className="font-medium text-sm">Notification Node</p><p className="text-xs text-gray-500">Send alerts/emails</p></div>
                  </button>
               </CardContent>
            </Card>
         </div>
      </div>
    </DashboardLayout>
  )
}
