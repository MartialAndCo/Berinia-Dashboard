'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Settings, LayoutDashboard, LogOut, Bot, Receipt, Menu, X } from 'lucide-react'
import Link from 'next/link'
import SwitchAccountDropdown from '@/components/SwitchAccountDropdown'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentClientId, setCurrentClientId] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    checkAuth()
    updateCurrentClient()
  }, [pathname])

  const updateCurrentClient = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const cId = params.get('clientId') || sessionStorage.getItem('admin_selected_client_id')
      setCurrentClientId(cId)
    }
  }

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    const user = session.user
    const isUserAdmin = user.email?.toLowerCase() === 'admin@berinia.com' || 
      user.app_metadata?.role === 'admin' || 
      user.user_metadata?.role === 'admin'
    setIsAdmin(isUserAdmin)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const getHref = (path: string) => {
    if (currentClientId) {
      return `${path}?clientId=${currentClientId}`
    }
    return path
  }

  const navLinks = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/agents', label: 'Voice Agents', icon: Bot },
    { href: '/dashboard/billing', label: 'Billing & Invoices', icon: Receipt },
    ...(!isAdmin ? [{ href: '/dashboard/settings', label: 'Settings', icon: Settings }] : []),
  ]

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col md:flex-row bg-[#f6f4f0] text-[#1a1918]">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 h-16 bg-[#ffffff] border-b border-[#e6e2d6] z-30 shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <img src="/logo-horizontal-black.png" alt="BerinAgents" className="h-5 w-auto object-contain" />
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-widest bg-[#faf8f5] border border-[#e6e2d6] text-[#73706b] uppercase">
            Portal
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-[#1a1918] hover:bg-[#faf8f5] rounded-sm transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-[#1a1918]/40 backdrop-blur-xs animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop fixed, Mobile sliding drawer) */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#ffffff] border-r border-[#e6e2d6] flex flex-col shrink-0 select-none shadow-[1px_0_12px_rgba(0,0,0,0.02)] transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-20 hidden md:flex flex-col justify-center px-6 border-b border-[#e6e2d6]">
          <div className="flex items-center justify-between">
            <img src="/logo-horizontal-black.png" alt="BerinAgents" className="h-6 w-auto object-contain" />
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-widest bg-[#faf8f5] border border-[#e6e2d6] text-[#73706b] uppercase">
              Portal
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-[#9e4733] uppercase mt-1">
            <span>•</span> {isAdmin ? 'ADMIN SWITCH' : 'CLIENT'}
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={getHref(item.href)}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-xs tracking-wide transition-all ${
                  isActive
                    ? 'bg-[#f0ede6] text-[#1a1918] font-semibold border-l-2 border-[#9e4733]' 
                    : 'text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#9e4733]' : 'text-[#73706b]'}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-[#e6e2d6] mt-auto space-y-2">
          {isAdmin && (
            <SwitchAccountDropdown currentClientId={currentClientId} />
          )}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-xs uppercase tracking-wider font-semibold text-[#73706b] hover:bg-[#fdf2f0] hover:text-[#9e4733] transition-colors w-full cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content: Independently scrollable */}
      <main className="flex-1 h-full overflow-y-auto min-w-0 bg-[#f6f4f0]">
        {children}
      </main>
    </div>
  )
}
