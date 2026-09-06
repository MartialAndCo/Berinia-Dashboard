'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Link from 'next/link'
import { setClientActiveAction } from './actions'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    // Check URL parameters and hash for explicit errors (e.g. otp_expired, access_denied)
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const search = typeof window !== 'undefined' ? window.location.search : ''
    const fullUrl = `${search}&${hash.replace(/^#/, '')}`
    const params = new URLSearchParams(fullUrl)

    const urlError = params.get('error_description') || params.get('error')
    const errorCode = params.get('error_code')

    if (urlError || errorCode === 'otp_expired') {
      if (errorCode === 'otp_expired' || urlError?.includes('expired') || urlError?.includes('invalid')) {
        setLinkError('Ce lien d\'invitation a expiré ou a déjà été utilisé. Si vous avez déjà configuré votre compte, vous pouvez vous connecter directement. Sinon, vous pouvez réinitialiser votre mot de passe.')
      } else {
        setLinkError(urlError || 'Lien invalide.')
      }
      return
    }

    // 1. Listen for auth changes (this triggers when Supabase parses tokens from the invite URL hash)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (session) {
        setSessionChecked(true)
      }
    })

    // 2. If PKCE code is present in query, exchange it for session
    const code = new URLSearchParams(search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!mounted) return
        if (data?.session) {
          setSessionChecked(true)
        } else if (error) {
          console.error('Code exchange error:', error)
          setLinkError('Le code de vérification est invalide ou expiré.')
        }
      })
      return () => {
        mounted = false
        subscription.unsubscribe()
      }
    }

    // 3. If access_token is present in URL hash, directly set the session
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data, error }) => {
        if (!mounted) return
        if (data?.session) {
          setSessionChecked(true)
        } else {
          console.error('setSession error:', error)
          setLinkError('Impossible de valider votre session d\'accès. Le lien est peut-être expiré.')
        }
      })
      return () => {
        mounted = false
        subscription.unsubscribe()
      }
    }

    // 4. Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session) {
        setSessionChecked(true)
      } else {
        router.push('/login')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const { data: { user }, error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      if (user) {
        try {
          await setClientActiveAction(user.id)
        } catch (actErr) {
          console.error('Error setting client active:', actErr)
        }
      }

      toast.success("Mot de passe enregistré avec succès !")
      window.location.href = '/dashboard'
    } catch (err: any) {
      console.error('Update password error:', err)
      setError(err?.message || 'Une erreur inattendue est survenue.')
      setLoading(false)
    }
  }

  // Error state (expired or consumed link)
  if (linkError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f4f0] p-4 text-[#202020]">
        <div className="w-full max-w-[460px] space-y-6">
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-2">
              <img src="/logo-horizontal-black.png" alt="BerinAgents" className="h-9 w-auto object-contain" />
            </div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
              <span>•</span> ACCÈS PORTAIL
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1a1918]">
              Lien expiré ou déjà utilisé
            </h1>
          </div>

          <div className="bg-[#ffffff] border border-[#e6e2d6] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-8 space-y-6">
            <p className="text-sm text-[#73706b] leading-relaxed">
              {linkError}
            </p>

            <div className="space-y-3 pt-2">
              <Link href="/login" className="block w-full">
                <Button className="w-full bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm h-11 text-xs font-semibold tracking-wider uppercase transition-all">
                  Se connecter
                </Button>
              </Link>
              <Link href="/forgot-password" className="block w-full">
                <Button variant="outline" className="w-full border-[#e2dfd8] text-[#73706b] hover:text-[#1a1918] rounded-sm h-11 text-xs font-semibold tracking-wider uppercase">
                  Réinitialiser mon mot de passe
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading state while verifying token
  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f4f0] p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#9e4733] border-t-transparent animate-spin" />
          <p className="text-xs uppercase tracking-widest text-[#73706b] animate-pulse font-medium">
            Vérification de votre lien d&apos;accès...
          </p>
        </div>
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
            <span>•</span> ONBOARDING
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">
            Bienvenue !
          </h1>
          <p className="text-sm text-[#73706b]">
            Définissez votre mot de passe pour finaliser la création de votre compte
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
                Nouveau mot de passe
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
                htmlFor="confirmPassword"
                className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase"
              >
                Confirmer le mot de passe
              </Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                'Enregistrement...'
              ) : (
                <>
                  Enregistrer et accéder au portail <span className="text-[#9e4733] text-[16px] leading-none">•</span>
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
