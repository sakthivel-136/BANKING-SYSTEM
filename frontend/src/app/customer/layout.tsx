"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Globe, LogOut, LayoutDashboard, Send, Home, FileText, Bell, Menu, UserCircle, CreditCard, HelpCircle, MessageSquare } from "lucide-react"
import { createBrowserClient } from '@supabase/ssr'
import { Logo } from "@/components/ui/Logo"

const navItems = [
  { name: "Dashboard", href: "/customer/dashboard", icon: LayoutDashboard },
  { name: "Transactions", href: "/customer/transactions", icon: FileText },
  { name: "Transfer", href: "/customer/transfer", icon: Send },
  { name: "Deposit", href: "/customer/deposit", icon: CreditCard },
  { name: "Withdraw", href: "/customer/withdrawal", icon: Home },
  { name: "Support", href: "/customer/enquiry", icon: MessageSquare },
  { name: "Complaints", href: "/customer/complaints", icon: Bell },
  { name: "Requests", href: "/customer/requests", icon: FileText },
  { name: "Profile", href: "/customer/profile", icon: UserCircle },
]

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <Logo />
        </div>
        <nav className="flex-1 py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-gray-400"}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 opacity-80" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:hidden">
           <Logo />
           <button className="p-2 -mr-2 text-gray-600">
             <Menu className="w-6 h-6" />
           </button>
        </header>
        
        <div className="flex-1 overflow-auto bg-gray-50/50 p-4 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
