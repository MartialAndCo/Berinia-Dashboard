'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Receipt, LogOut, Settings, PhoneOutgoing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SwitchAccountDropdown from '@/components/SwitchAccountDropdown'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        const u = session.user
        const isUserAdmin = u.email?.toLowerCase() === 'admin@berinia.com' ||
          u.email?.toLowerCase() === 'yannrosemark@gmail.com' ||
          u.app_metadata?.role === 'admin' ||
          u.user_metadata?.role === 'admin'
        if (!isUserAdmin) {
          router.push('/dashboard')
        }
      }
    })
  }, [router])

  

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col md:flex-row bg-[#f6f4f0] text-[#1a1918]">
      {/* Sidebar: Fixed, full height, fits completely on screen without scrolling */}
      <aside className="w-full md:w-64 h-auto md:h-full bg-[#ffffff] border-r border-[#e6e2d6] flex flex-col shrink-0 z-20 select-none shadow-[1px_0_12px_rgba(0,0,0,0.02)]">
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
          <Link 
            href="/admin" 
            className={`flex items-center gap-3 px-3 py-2 rounded-sm text-xs tracking-wide transition-all ${
              pathname === '/admin' 
                ? 'bg-[#f0ede6] text-[#1a1918] font-semibold border-l-2 border-[#9e4733]' 
                : 'text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </Link>
          <Link 
            href="/admin/billing" 
            className={`flex items-center gap-3 px-3 py-2 rounded-sm text-xs tracking-wide transition-all ${
              pathname === '/admin/billing' 
                ? 'bg-[#f0ede6] text-[#1a1918] font-semibold border-l-2 border-[#9e4733]' 
                : 'text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]'
            }`}
          >
            <Receipt className="h-4 w-4" />
            Billing (Stripe)
          </Link>
          <Link 
            href="/admin/demo-calls" 
            className={`flex items-center gap-3 px-3 py-2 rounded-sm text-xs tracking-wide transition-all ${
              pathname === '/admin/demo-calls' 
                ? 'bg-[#f0ede6] text-[#1a1918] font-semibold border-l-2 border-[#9e4733]' 
                : 'text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]'
            }`}
          >
            <PhoneOutgoing className="h-4 w-4 text-[#9e4733]" />
            Demo Calls
          </Link>
          <Link 
            href="/admin/settings" 
            className={`flex items-center gap-3 px-3 py-2 rounded-sm text-xs tracking-wide transition-all ${
              pathname === '/admin/settings' 
                ? 'bg-[#f0ede6] text-[#1a1918] font-semibold border-l-2 border-[#9e4733]' 
                : 'text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]'
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
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
      
      {/* Main Content: The only area that scrolls */}
      <main className="flex-1 h-full overflow-y-auto min-w-0 bg-[#f6f4f0]">
        {children}
      </main>
    </div>
  )
}
