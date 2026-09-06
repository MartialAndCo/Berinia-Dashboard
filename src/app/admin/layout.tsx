'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Receipt, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else if (session.user.email !== 'admin@berinia.com') {
        router.push('/dashboard')
      } else {
        
      }
    })
  }, [router])

  

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#f6f4f0]">
      {/* Sidebar */}
      <div className="w-64 bg-[#ffffff] border-r border-[#e6e2d6] flex flex-col shrink-0">
        <div className="h-20 flex flex-col justify-center px-6 border-b border-[#e6e2d6]">
          <div className="flex items-center justify-between">
            <img src="/logo-horizontal-black.png" alt="BerinAgents" className="h-6 w-auto object-contain" />
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-widest bg-[#1a1918] text-[#f6f4f0] uppercase">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-[#9e4733] uppercase mt-1">
            <span>•</span> CONSOLE
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1.5">
          <Link 
            href="/admin" 
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-xs tracking-wide transition-all ${
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
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-xs tracking-wide transition-all ${
              pathname === '/admin/billing' 
                ? 'bg-[#f0ede6] text-[#1a1918] font-semibold border-l-2 border-[#9e4733]' 
                : 'text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]'
            }`}
          >
            <Receipt className="h-4 w-4" />
            Billing (Stripe)
          </Link>
          <Link 
            href="/admin/settings" 
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-xs tracking-wide transition-all ${
              pathname === '/admin/settings' 
                ? 'bg-[#f0ede6] text-[#1a1918] font-semibold border-l-2 border-[#9e4733]' 
                : 'text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]'
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>
        <div className="p-4 border-t border-[#e6e2d6]">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-[#73706b] hover:text-[#9e4733] hover:bg-[#fdf2f0] rounded-sm text-xs uppercase tracking-wider font-semibold" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
