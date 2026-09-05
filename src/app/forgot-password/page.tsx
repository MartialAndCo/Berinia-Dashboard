'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      setLoading(false)

      if (!res.ok || data.error) {
        setError(data.error || "An error occurred while sending the email.")
        return
      }

      setSent(true)
    } catch (err: any) {
      setLoading(false)
      setError(err.message || "An unexpected error occurred.")
    }
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
            <span>•</span> PASSWORD RECOVERY
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">
            Forgot Password
          </h1>
          <p className="text-sm text-[#73706b]">
            {sent
              ? "Check your email inbox to reset your password."
              : "Enter your email address and we will send you a reset link."}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#ffffff] border border-[#e6e2d6] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-8 space-y-6">
          {sent ? (
            <div className="space-y-5 text-center">
              <p className="text-sm text-[#55524d] leading-relaxed">
                An email has been sent to <span className="font-medium text-[#1a1918]">{email}</span>.
                Click the link in the email to choose a new password.
              </p>
              <Link 
                href="/login" 
                className="inline-block text-xs font-semibold tracking-wider text-[#1a1918] uppercase underline-offset-4 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label 
                  htmlFor="email" 
                  className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase"
                >
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-[#e2dfd8] bg-[#faf9f7]/50 focus-visible:ring-[#1a1918] focus-visible:border-[#1a1918] rounded-sm h-11 text-sm text-[#202020] placeholder:text-[#a09d96]"
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
                  'Sending link...'
                ) : (
                  <>
                    Send reset link <span className="text-[#9e4733] text-[16px] leading-none">•</span>
                  </>
                )}
              </Button>

              <div className="text-center pt-2">
                <Link 
                  href="/login" 
                  className="text-xs text-[#73706b] hover:text-[#1a1918] transition-colors underline-offset-4 hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-[#8c8880]">
          <p>Protected client & admin portal &middot; BerinAgents</p>
        </div>

      </div>
    </div>
  )
}
