import React from "react"
import { TopBar } from "./TopBar"
import { Sidebar } from "./Sidebar"

export function DashboardLayout({ children, role }: { children: React.ReactNode, role: string }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar role={role} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
