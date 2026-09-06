'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Settings, LayoutDashboard, LogOut, Phone } from 'lucide-react'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
    } else {
      
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }



  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col md:flex-row bg-[#f6f4f0] text-[#1a1918]">
      {/* Sidebar: Fixed, full height, no vertical scrolling with content */}
      <aside className="w-full md:w-64 h-auto md:h-full bg-[#ffffff] border-r border-[#e6e2d6] flex flex-col shrink-0 z-20 select-none shadow-[1px_0_12px_rgba(0,0,0,0.02)]">
        <div className="h-20 flex flex-col justify-center px-6 border-b border-[#e6e2d6]">
          <div className="flex items-center justify-between">
            <img src="/logo-horizontal-black.png" alt="BerinAgents" className="h-6 w-auto object-contain" />
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-widest bg-[#faf8f5] border border-[#e6e2d6] text-[#73706b] uppercase">
              Portal
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-[#9e4733] uppercase mt-1">
            <span>•</span> CLIENT
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <Link 
            href="/dashboard" 
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-xs tracking-wide transition-all ${
              pathname === '/dashboard' 
                ? 'bg-[#f0ede6] text-[#1a1918] font-semibold border-l-2 border-[#9e4733]' 
                : 'text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </Link>
          
          <Link 
            href="/dashboard/settings" 
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-xs tracking-wide transition-all ${
              pathname === '/dashboard/settings' 
                ? 'bg-[#f0ede6] text-[#1a1918] font-semibold border-l-2 border-[#9e4733]' 
                : 'text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]'
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>
        
        <div className="p-4 border-t border-[#e6e2d6] mt-auto">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-xs uppercase tracking-wider font-semibold text-[#73706b] hover:bg-[#fdf2f0] hover:text-[#9e4733] transition-colors w-full"
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
