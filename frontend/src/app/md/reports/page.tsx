"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Download, FileText, FileSpreadsheet } from "lucide-react"

export default function MDReports() {
  
  const handleDownload = (type: string) => {
     // Stub for downloading reports
     alert(`Downloading ${type} report... (Real implementation triggers blob download from API)`)
  }

  return (
    <DashboardLayout role="md">
      <h2 className="text-3xl font-bold tracking-tight mb-6">Financial Reports</h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         <Card className="hover:shadow-md transition">
            <CardHeader>
               <CardTitle className="flex gap-2"><FileText className="text-secondary"/> Monthly Operations</CardTitle>
               <CardDescription>Comprehensive ledger of all system transactions.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
               <button onClick={()=>handleDownload('PDF')} className="flex items-center gap-1 bg-red-50 text-red-700 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"><Download size={16}/> PDF</button>
               <button onClick={()=>handleDownload('CSV')} className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-2 rounded text-sm font-medium hover:bg-green-100"><Download size={16}/> CSV</button>
            </CardContent>
         </Card>
         
         <Card className="hover:shadow-md transition">
            <CardHeader>
               <CardTitle className="flex gap-2"><FileSpreadsheet className="text-secondary"/> Risk Assessment</CardTitle>
               <CardDescription>List of frozen/blocked accounts and low-balance users.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
               <button onClick={()=>handleDownload('PDF')} className="flex items-center gap-1 bg-red-50 text-red-700 px-3 py-2 rounded text-sm font-medium hover:bg-red-100"><Download size={16}/> PDF</button>
               <button onClick={()=>handleDownload('CSV')} className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-2 rounded text-sm font-medium hover:bg-green-100"><Download size={16}/> CSV</button>
            </CardContent>
         </Card>

         <Card className="hover:shadow-md transition">
            <CardHeader>
               <CardTitle className="flex gap-2"><FileText className="text-secondary"/> Workflow Efficiency</CardTitle>
               <CardDescription>Logs of all workflow executions and rule triggers.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
               <button onClick={()=>handleDownload('CSV')} className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-2 rounded text-sm font-medium hover:bg-green-100"><Download size={16}/> CSV</button>
            </CardContent>
         </Card>
      </div>
    </DashboardLayout>
  )
}
