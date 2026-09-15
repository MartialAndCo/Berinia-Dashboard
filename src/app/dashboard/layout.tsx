'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Settings, LayoutDashboard, LogOut, Bot, Receipt, MessageSquare, Lock } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import SwitchAccountDropdown from '@/components/SwitchAccountDropdown'
import PwaRegister from '@/components/pwa/PwaRegister'
import { getClientAgentSetupStateAction } from '@/app/onboarding/actions'

const SupportChatBubble = dynamic(() => import('@/components/support/SupportChatBubble'), { ssr: false })
const PwaInstallPrompt = dynamic(() => import('@/components/pwa/PwaInstallPrompt'), { ssr: false })

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentClientId, setCurrentClientId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasActiveAgent, setHasActiveAgent] = useState(true)
  const currentClientIdRef = useRef<string | null>(null)

  useEffect(() => {
    checkAuth()
    fetchUnreadSupport()

    // Recheck unread count when window regains focus
    const handleFocus = () => fetchUnreadSupport()
    window.addEventListener('focus', handleFocus)

    // Realtime listener on support_messages & support_conversations
    const channel = supabase
      .channel('client_layout_support_badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_messages' },
        () => {
          fetchUnreadSupport()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_conversations' },
        () => {
          fetchUnreadSupport()
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener('focus', handleFocus)
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    updateCurrentClient()
  }, [pathname])

  const fetchUnreadSupport = async () => {
    try {
      const res = await fetch('/api/support/conversations')
      const data = await res.json()
      if (data.success && Array.isArray(data.conversations)) {
        const total = data.conversations.reduce((acc: number, c: any) => acc + (c.unread_client || 0), 0)
        setUnreadCount(total)
      }
    } catch {}
  }

  const updateCurrentClient = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const cId = params.get('clientId') || sessionStorage.getItem('admin_selected_client_id')
      if (cId !== currentClientIdRef.current) {
        currentClientIdRef.current = cId
        setCurrentClientId(cId)
        if (cId) {
          checkAgentStatus(cId)
        }
      }
    }
  }

  const checkAgentStatus = async (cId?: string | null) => {
    try {
      const stateRes = await getClientAgentSetupStateAction(cId || undefined)
      if (stateRes.success) {
        setHasActiveAgent(stateRes.hasActiveAgent)
      }
    } catch {}
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

    if (!isUserAdmin) {
      checkAgentStatus()
    }
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
    { 
      href: '/dashboard', 
      label: 'Overview', 
      shortLabel: 'Overview', 
      icon: LayoutDashboard,
      isLocked: !isAdmin && !hasActiveAgent,
      tag: (!isAdmin && !hasActiveAgent) ? 'Setup' : undefined
    },
    { 
      href: '/dashboard/agents', 
      label: 'Voice Agents', 
      shortLabel: 'Agents', 
      icon: Bot,
      isLocked: !isAdmin && !hasActiveAgent,
      tag: (!isAdmin && !hasActiveAgent) ? 'Setup' : undefined
    },
    { href: '/dashboard/billing', label: 'Billing & Invoices', shortLabel: 'Billing', icon: Receipt },
    { href: '/dashboard/support', label: 'Support', shortLabel: 'Support', icon: MessageSquare, badge: unreadCount },
    ...(!isAdmin ? [{ href: '/dashboard/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings }] : []),
  ]

  return (
    <div className="h-dvh w-screen overflow-hidden flex flex-col md:flex-row bg-[#f6f4f0] text-[#1a1918]">
      {/* Mobile App Header (with safe-area-inset-top for iPhone notch/Dynamic Island) */}
      <header className="md:hidden flex items-center justify-between px-4 pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] bg-[#ffffff]/95 backdrop-blur-md border-b border-[#e6e2d6] z-30 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <img src="/logo-horizontal-black.png" alt="BerinAgents" className="h-4.5 w-auto object-contain" />
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-[#faf8f5] border border-[#e6e2d6] text-[#73706b] uppercase">
            Portal
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="text-[10px] font-bold text-[#9e4733] bg-[#fdf2f0] px-2 py-0.5 rounded-full border border-[#fad4cf]">
              ADMIN
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-1.5 text-[#73706b] hover:text-[#9e4733] transition-colors rounded-lg cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar (Left fixed) */}
      <aside className="hidden md:flex inset-y-0 left-0 z-40 w-64 bg-[#ffffff] border-r border-[#e6e2d6] flex-col shrink-0 select-none shadow-[1px_0_12px_rgba(0,0,0,0.02)]">
        <div className="h-20 flex flex-col justify-center px-6 border-b border-[#e6e2d6]">
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
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-sm text-xs tracking-wide transition-all ${
                  isActive
                    ? 'bg-[#f0ede6] text-[#1a1918] font-semibold border-l-2 border-[#9e4733]' 
                    : 'text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#9e4733]' : 'text-[#73706b]'}`} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.tag && (
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 border border-amber-300/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> {item.tag}
                    </span>
                  )}
                  {item.badge && item.badge > 0 ? (
                    <span className="w-4 h-4 rounded-full bg-[#9e4733] text-white text-[9px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
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

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto min-w-0 bg-[#f6f4f0] relative">
        {children}
        
        {/* Support Chat Bubble: Visible ONLY on desktop so it NEVER blocks mobile typing or buttons */}
        <div className="hidden md:block">
          <SupportChatBubble />
        </div>
      </main>

      {/* Mobile Native Bottom Lowbar (Fixed Apple-style tab bar) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#ffffff]/95 backdrop-blur-2xl border-t border-[#e6e2d6] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <div className="h-16 flex items-center justify-around px-2">
          {navLinks.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={getHref(item.href)}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                  isActive ? 'text-[#1a1918]' : 'text-[#8a867f] active:scale-95'
                }`}
              >
                <div className="relative">
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-[#1a1918] text-white shadow-xs' : 'text-[#73706b]'}`}>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-[#73706b]'}`} />
                  </div>
                  {item.tag && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center text-white ring-1 ring-white" title="Setup in progress">
                      <Lock className="w-2 h-2" />
                    </span>
                  )}
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#9e4733] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-[#1a1918]' : 'font-medium text-[#73706b]'}`}>
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
