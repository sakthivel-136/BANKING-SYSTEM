"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/services/api"
import { useRouter } from "next/navigation"

export default function AdminWorkflows() {
  const [workflows, setWorkflows] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const res = await api.get("/workflows")
      setWorkflows(res.data)
    } catch (e) { console.error(e) }
  }

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-3xl font-bold tracking-tight">Installed Workflows</h2>
         <button onClick={() => router.push('/admin/workflow-editor')} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium text-sm">
            Create New Workflow
         </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-y">
                <tr>
                  <th className="px-6 py-3">Workflow Name</th>
                  <th className="px-6 py-3 text-center">Version</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Steps configured</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((wf, i) => (
                  <tr key={i} className="bg-white border-b hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-semibold text-gray-800">{wf.name.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 text-center font-mono text-xs">v{wf.version}</td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-2 py-1 text-xs font-semibold rounded-full ${wf.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                         {wf.is_active ? 'Active' : 'Inactive'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-gray-500">{wf.workflow_steps?.length || 0}</td>
                    <td className="px-6 py-4 text-right">
                       <button className="text-primary hover:underline font-medium text-xs">Edit Rules</button>
                    </td>
                  </tr>
                ))}
                {workflows.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No workflows found in database</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
