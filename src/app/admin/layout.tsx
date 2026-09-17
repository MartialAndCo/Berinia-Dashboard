'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { LayoutDashboard, Receipt, LogOut, Settings, PhoneOutgoing, Film, MessageSquare, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SwitchAccountDropdown from '@/components/SwitchAccountDropdown'
import PwaRegister from '@/components/pwa/PwaRegister'

const PwaInstallPrompt = dynamic(() => import('@/components/pwa/PwaInstallPrompt'), { ssr: false })

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        const u = session.user
        const isUserAdmin = u.email?.toLowerCase() === 'admin@berinia.com' ||
          u.email?.toLowerCase() === 'yannrosemark@gmail.com' ||
          u.app_metadata?.role === 'admin'
        if (!isUserAdmin) {
          router.push('/dashboard')
        }
      }
    })
    fetchPendingCount()

    // Recheck pending count when window regains focus
    const handleFocus = () => fetchPendingCount()
    window.addEventListener('focus', handleFocus)

    // Realtime badge updates without polling
    const channel = supabase
      .channel('admin_layout_support_badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_conversations' },
        () => {
          fetchPendingCount()
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener('focus', handleFocus)
      supabase.removeChannel(channel)
    }
  }, [router])

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/support/conversations')
      const data = await res.json()
      if (data.success && Array.isArray(data.conversations)) {
        // Count active unread or pending chats (never resolved)
        const count = data.conversations.filter(
          (c: any) => c.status !== 'resolved' && (c.status === 'pending' || (c.unread_admin || 0) > 0)
        ).length
        setPendingCount(count)
      }
    } catch {}
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const navItems = [
    { href: '/admin', label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard },
    { href: '/admin/closing', label: 'Closing Visio (Lien)', shortLabel: 'Closing', icon: Video },
    { href: '/admin/support', label: 'Support Tickets', shortLabel: 'Support', icon: MessageSquare, badge: pendingCount },
    { href: '/admin/billing', label: 'Billing (Stripe)', shortLabel: 'Billing', icon: Receipt },
    { href: '/admin/demo-calls', label: 'Demo Calls', shortLabel: 'Calls', icon: PhoneOutgoing },
    { href: '/admin/funnel', label: 'Funnel Content', shortLabel: 'Funnel', icon: Film },
    { href: '/admin/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
  ]

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col md:flex-row bg-[#f6f4f0] text-[#1a1918]">
      {/* Mobile Header (Admin) */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-[#ffffff]/90 backdrop-blur-md border-b border-[#e6e2d6] z-30 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <img src="/logo-horizontal-black.png" alt="BerinAgents" className="h-4.5 w-auto object-contain" />
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-[#1a1918] text-white uppercase">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="p-1.5 text-[#73706b] hover:text-[#9e4733] transition-colors rounded-lg"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 h-full bg-[#ffffff] border-r border-[#e6e2d6] flex-col shrink-0 z-20 select-none shadow-[1px_0_12px_rgba(0,0,0,0.02)]">
        <div className="h-16 flex flex-col justify-center px-5 border-b border-[#e6e2d6] shrink-0">
          <div className="flex items-center justify-between">
            <img src="/logo-horizontal-black.png" alt="BerinAgents" className="h-5 w-auto object-contain" />
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-widest bg-[#1a1918] text-[#f6f4f0] uppercase">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-[#9e4733] uppercase mt-0.5">
            <span>•</span> CONSOLE
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-sm text-xs tracking-wide transition-all ${
                  isActive 
                    ? 'bg-[#f0ede6] text-[#1a1918] font-semibold border-l-2 border-[#9e4733]' 
                    : 'text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#9e4733]' : 'text-[#73706b]'}`} />
                  {item.label}
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-[#e6e2d6] mt-auto space-y-1.5 shrink-0">
          <SwitchAccountDropdown isAdminConsole />
          <Button 
            variant="ghost" 
            className="w-full justify-start text-[#73706b] hover:text-[#9e4733] hover:bg-[#fdf2f0] rounded-sm text-xs uppercase tracking-wider font-semibold h-8 px-3 cursor-pointer" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </aside>
      
      {/* Main Content Area (padded on mobile for lowbar) */}
      <main className="flex-1 h-full overflow-y-auto min-w-0 bg-[#f6f4f0] pb-24 md:pb-0">
        {children}
      </main>

      {/* Mobile Native Bottom Lowbar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#ffffff]/90 backdrop-blur-2xl border-t border-[#e6e2d6] pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <div className="h-16 flex items-center justify-around px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                  isActive ? 'text-[#1a1918]' : 'text-[#8a867f] active:scale-95'
                }`}
              >
                <div className="relative">
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-[#1a1918] text-white shadow-xs' : 'text-[#73706b]'}`}>
                    <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-[#73706b]'}`} />
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[9px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-[#1a1918]' : 'font-medium text-[#73706b]'}`}>
                  {item.shortLabel}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
      <PwaRegister />
      <PwaInstallPrompt />
    </div>
  )
}
