"use client"

import { Bell, User, LogOut } from "lucide-react"
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from "next/navigation"

export function TopBar({ role }: { role: string }) {
  const router = useRouter()
  
  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm">
      <div className="flex items-center">
        <h1 className="text-lg text-gray-800 font-semibold capitalize opacity-70 border-l-[3px] border-secondary pl-3">{role} Portal</h1>
      </div>
      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center p-1 rounded-md bg-gray-50 border gap-2 px-3 shadow-inner">
          <User className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 capitalize">{role}</span>
        </div>
        <button 
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 text-gray-400 hover:text-red-500 transition focus:outline-none"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
