import Link from "next/link"
import { Home, List, Send, HelpCircle, AlertTriangle, Shield, CheckSquare, Activity, Settings, Users } from "lucide-react"

export function Sidebar({ role }: { role: string }) {
  let navItems: { name: string, href: string, icon: any }[] = []

  if (role === 'customer') {
    navItems = [
      { name: 'Dashboard', href: '/customer/dashboard', icon: Home },
      { name: 'Transactions', href: '/customer/transactions', icon: List },
      { name: 'Transfer', href: '/customer/transfer', icon: Send },
      { name: 'Enquiry', href: '/customer/enquiry', icon: HelpCircle },
      { name: 'Complaints', href: '/customer/complaints', icon: AlertTriangle },
    ]
  } else if (role === 'manager') {
    navItems = [
      { name: 'Dashboard', href: '/manager/dashboard', icon: Home },
      { name: 'Accounts', href: '/manager/accounts', icon: List },
      { name: 'Customers', href: '/manager/customers', icon: Users },
      { name: 'Alerts', href: '/manager/alerts', icon: Activity },
      { name: 'Approvals', href: '/manager/approvals', icon: CheckSquare },
      { name: 'Profile Requests', href: '/manager/profile-requests', icon: Shield },
      { name: 'Chat (Enquiries)', href: '/manager/enquiries', icon: HelpCircle },
      { name: 'Complaints', href: '/manager/complaints', icon: AlertTriangle },
    ]
  } else if (role === 'md') {
    navItems = [
      { name: 'Dashboard', href: '/md/dashboard', icon: Home },
      { name: 'Accounts', href: '/md/accounts', icon: List },
      { name: 'Reports', href: '/md/reports', icon: Activity },
      { name: 'Escalations', href: '/md/escalations', icon: AlertTriangle },
      { name: 'Complaints (All)', href: '/manager/complaints', icon: AlertTriangle },
    ]
  } else if (role === 'admin') {
    navItems = [
      { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
      { name: 'Customers', href: '/admin/customers', icon: Users },
      { name: 'Workflows', href: '/admin/workflows', icon: Settings },
      { name: 'Executions', href: '/admin/executions', icon: Activity },
    ]
  }

  return (
    <div className="flex flex-col w-64 bg-primary text-white">
      <div className="flex items-center justify-center h-16 border-b border-primary-foreground/20">
        <span className="text-xl font-bold tracking-wider">SmartBank</span>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <nav className="px-2 py-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.name} href={item.href} className="flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-white/10 transition">
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
