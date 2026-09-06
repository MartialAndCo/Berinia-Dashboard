'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    // 1. Listen for auth changes (this triggers when Supabase parses tokens from the recovery URL)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (session) {
        setSessionChecked(true)
      }
    })

    // 2. Direct check for tokens in hash or code in query
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const search = typeof window !== 'undefined' ? window.location.search : ''
    const fullUrl = `${search}&${hash.replace(/^#/, '')}`
    const params = new URLSearchParams(fullUrl)

    const code = params.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
        if (!mounted) return
        if (data?.session) setSessionChecked(true)
      })
    }

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ data }) => {
        if (!mounted) return
        if (data?.session) setSessionChecked(true)
      })
    }

    // 3. Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session) {
        setSessionChecked(true)
      } else {
        const hasTokens = hash.includes('access_token') || hash.includes('type=recovery') || search.includes('code=')
        if (!hasTokens) {
          router.push('/login')
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    toast.success('Password updated successfully!')
    router.push('/login')
  }

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f4f0] p-4">
        <p className="text-xs uppercase tracking-widest text-[#73706b] animate-pulse">
          Verifying password reset link...
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f4f0] p-4 text-[#202020]">
      <div className="w-full max-w-[440px] space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-2">
            <img src="/logo-horizontal-black.png" alt="BerinAgents" className="h-9 w-auto object-contain" />
          </div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
            <span>•</span> AUTHENTICATION
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">
            New Password
          </h1>
          <p className="text-sm text-[#73706b]">
            Choose a new secure password for your account
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#ffffff] border border-[#e6e2d6] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-8 space-y-6">
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="space-y-1.5">
              <Label 
                htmlFor="password"
                className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase"
              >
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="border-[#e2dfd8] bg-[#faf9f7]/50 focus-visible:ring-[#1a1918] focus-visible:border-[#1a1918] rounded-sm h-11 text-sm text-[#202020]"
              />
            </div>

            <div className="space-y-1.5">
              <Label 
                htmlFor="confirm"
                className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase"
              >
                Confirm Password
              </Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="border-[#e2dfd8] bg-[#faf9f7]/50 focus-visible:ring-[#1a1918] focus-visible:border-[#1a1918] rounded-sm h-11 text-sm text-[#202020]"
              />
            </div>

            {error && (
              <div className="p-3 rounded-sm bg-[#fdf2f0] border border-[#f5c6cb] text-xs text-[#9e4733] font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9e4733] shrink-0" />
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm h-11 text-xs font-semibold tracking-wider uppercase transition-all shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                'Updating...'
              ) : (
                <>
                  Update Password <span className="text-[#9e4733] text-[16px] leading-none">•</span>
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-[#8c8880]">
          <p>Protected client & admin portal &middot; BerinAgents</p>
        </div>

      </div>
    </div>
  )
}
