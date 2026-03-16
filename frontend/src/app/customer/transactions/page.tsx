"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

import api from "@/services/api"
import { ArrowUpRight, ArrowDownRight, Download, Calendar as CalendarIcon, Filter, Loader2 } from "lucide-react"
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// Types for jsPDF autotable plugin
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function CustomerTransactions() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([])
  const [account, setAccount] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Filtering states
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  useEffect(() => {
    async function fetchData() {
      try {
        const profRes = await api.get("/customers/me")
        setProfile(profRes.data)

        const accRes = await api.get("/accounts/mine")
        if (accRes.data && accRes.data.length > 0) {
          setAccount(accRes.data[0])
          const txnRes = await api.get(`/transactions/${accRes.data[0].account_id}`)
          setTransactions(txnRes.data)
          setFilteredTransactions(txnRes.data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // No automatic filtering on date change
  const applyFilters = () => {
    let filtered = [...transactions]
    if (startDate) {
      filtered = filtered.filter(t => isAfter(new Date(t.created_at), startOfDay(new Date(startDate))) || format(new Date(t.created_at), "yyyy-MM-dd") === startDate)
    }
    if (endDate) {
      filtered = filtered.filter(t => isBefore(new Date(t.created_at), endOfDay(new Date(endDate))) || format(new Date(t.created_at), "yyyy-MM-dd") === endDate)
    }
    setFilteredTransactions(filtered)
  }


  const generatePDF = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      alert("No transactions available to download in this period.")
      return
    }

    try {
      const doc = new jsPDF()

      // Title: Centralised Bank Name
      doc.setFontSize(22)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 58, 138) // Primary #1E3A8A
      doc.text("SMARTBANK AUTOMATION SYSTEM", doc.internal.pageSize.width / 2, 20, { align: "center" })

      // Subtitle / Report info
      doc.setFontSize(14)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text("Account Statement", doc.internal.pageSize.width / 2, 28, { align: "center" })

      // Customer Details
      doc.setFontSize(11)
      doc.setTextColor(40, 40, 40)
      doc.text(`Customer Name: ${profile?.full_name || 'N/A'}`, 14, 45)
      doc.text(`Account Number: ${account?.account_number || 'N/A'}`, 14, 52)
      doc.text(`Current Balance: Rs. ${account?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}`, 14, 59)
    
      // Date Range Details
      doc.text(`Statement Period: ${startDate ? format(new Date(startDate), "MMM d, yyyy") : 'Start'} to ${endDate ? format(new Date(endDate), "MMM d, yyyy") : 'Present'}`, 14, 66)

      // Divider Line
      doc.setDrawColor(200, 200, 200)
      doc.line(14, 72, doc.internal.pageSize.width - 14, 72)

      // Transactions Table
      const tableColumn = ["Date", "Description", "Ref / Receiver", "Amount (Rs.)", "Balance (Rs.)"]
      const tableRows = filteredTransactions.map(txn => {
        const isDeduction = txn.transaction_type === 'withdraw' || txn.transaction_type === 'transfer'
        return [
          format(new Date(txn.created_at), "dd MMM yyyy, hh:mm a"),
          txn.transaction_type.toUpperCase(),
          txn.receiver_account || 'N/A',
          `${isDeduction ? '-' : '+'} ${Number(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          Number(txn.balance_after).toLocaleString(undefined, { minimumFractionDigits: 2 })
        ]
      })

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 80,
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
           3: { halign: 'right' },
           4: { halign: 'right' }
        }
      })

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
          doc.setFontSize(8)
          doc.setTextColor(150, 150, 150)
          doc.text(`Generated on ${format(new Date(), "dd MMM yyyy hh:mm a")} - Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: "center" })
      }

      // Save PDF
      doc.save(`SmartBank_Statement_${account?.account_number}_${format(new Date(), "yyyyMMdd")}.pdf`)
    } catch (err) {
      console.error("PDF generation error", err)
      alert("Something went wrong while generating the PDF. Please try again.")
    }
  }

  const handleRequestReversal = async (txn: any) => {
    const reason = prompt("Please enter the reason for reversal (e.g., Wrong account transfer):")
    if (reason === null) return // Cancelled
    if (!reason.trim()) {
      alert("Reason is required.")
      return
    }

    try {
      await api.post("/reversals/request", {
        transaction_id: txn.transaction_id,
        amount: txn.amount,
        reason: reason
      })
      alert("Reversal request submitted. It will be verified by a manager and then approved by the MD.")
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to submit reversal request.")
    }
  }

  return (
    <>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Transaction History</h2>
          <p className="text-gray-500 mt-1">View and download your account statements.</p>
        </div>
        <button 
          onClick={generatePDF}
          disabled={filteredTransactions.length === 0}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Download PDF Report
        </button>
      </div>

      <Card className="mb-6 shadow-sm border-0 ring-1 ring-gray-200">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-end gap-4">
             <div className="w-full sm:w-auto flex-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">From Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <CalendarIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
             </div>
             <div className="w-full sm:w-auto flex-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">To Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <CalendarIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
             </div>
             <div className="w-full sm:w-auto flex flex-row gap-2">
                <button 
                  onClick={applyFilters}
                  className="flex-1 flex justify-center items-center gap-2 px-6 py-2 bg-primary text-white shadow-sm text-sm font-medium rounded-lg hover:bg-primary/90 focus:outline-none"
                >
                  <Filter className="w-4 h-4" /> Search
                </button>
                <button 
                  onClick={() => { setStartDate(""); setEndDate(""); setFilteredTransactions(transactions) }}
                  className="flex-1 flex justify-center items-center gap-2 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  Clear
                </button>
             </div>

          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-0 ring-1 ring-gray-200">
        <CardHeader className="pb-0">
          <CardTitle>Filtered Results ({filteredTransactions.length})</CardTitle>
          <CardDescription>Transactions matching your date criteria.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
             <div className="flex justify-center p-12">
               <Loader2 className="w-8 h-8 animate-spin text-primary" />
             </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-600 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Type</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Ref / Receiver</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Amount (₹)</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Balance After (₹)</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map((txn, i) => (
                    <tr key={txn.transaction_id || i} className="bg-white hover:bg-blue-50/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {format(new Date(txn.created_at), "dd MMM yyyy, hh:mm a")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-full flex-shrink-0 ${txn.transaction_type === 'deposit' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                              {txn.transaction_type === 'deposit' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          </div>
                          <span className="capitalize font-medium text-gray-900">{txn.transaction_type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{txn.receiver_account || '—'}</td>
                      <td className={`px-6 py-4 text-right font-semibold ${txn.transaction_type === 'withdraw' || txn.transaction_type === 'transfer' ? 'text-gray-900' : 'text-emerald-600'}`}>
                        {txn.transaction_type === 'withdraw' || txn.transaction_type === 'transfer' ? '-' : '+'}
                        {txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-600">
                        {txn.balance_after.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleRequestReversal(txn)}
                          className="text-[10px] font-bold uppercase py-1 px-2 text-rose-600 border border-rose-200 hover:bg-rose-50 rounded bg-white transition"
                        >
                          Request Reversal
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                             <Filter className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-500">No transactions recorded for this period.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>

  )
}
