'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [customerEmail, setCustomerEmail] = useState('')

  return (
    <div className="min-h-screen bg-[#f6f4f0] text-[#1a1918] flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <header className="max-w-xl mx-auto w-full flex items-center justify-between py-4 border-b border-[#e6e2d6]">
        <img
          src="/logo-horizontal-black.png"
          alt="BerinAgents"
          className="h-5 w-auto object-contain"
        />
        <div className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest text-[#9e4733] uppercase">
          <span>•</span> SECURE PAYMENT
        </div>
      </header>

      {/* Main Card */}
      <main className="max-w-xl mx-auto w-full my-auto py-8">
        <div className="bg-white border border-[#e6e2d6] rounded-sm shadow-[0_4px_32px_rgba(0,0,0,0.03)] p-6 sm:p-10 space-y-8 text-center">
          
          {/* Badge & Icon */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
              <span>•</span> SUBSCRIPTION CONFIRMED
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1918]">
              Payment Successful!
            </h1>
            <p className="text-sm text-[#73706b] max-w-md mx-auto leading-relaxed">
              Thank you for your business. Your Voice AI platform subscription is now active.
            </p>
          </div>

          {/* Email Notice Box */}
          <div className="p-5 bg-[#faf8f5] border border-[#e2dfd8] rounded-sm text-left space-y-3">
            <div className="flex items-center gap-2.5 text-[#1a1918] font-semibold text-sm">
              <Mail className="w-4 h-4 text-[#9e4733]" />
              <span>Next Step: Set Up Your Password</span>
            </div>
            <p className="text-xs text-[#55524d] leading-relaxed">
              A welcome email containing your unique access link has just been sent to your inbox. Simply click that link to choose your password and access your client portal.
            </p>
            <div className="text-[11px] text-[#73706b] pt-1 border-t border-[#e2dfd8]/60 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Secure encrypted link valid immediately. Please check your spam folder if needed.
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-2">
            <Link href="/login" className="block w-full">
              <Button className="w-full bg-[#1a1918] hover:bg-[#2d2d2d] text-white rounded-sm h-12 text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer">
                Access Client Portal <ArrowRight className="w-4 h-4 text-[#9e4733]" />
              </Button>
            </Link>
            <p className="text-xs text-[#73706b]">
              You can close this tab and return to your video call.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full text-center py-4 text-xs text-[#73706b] border-t border-[#e6e2d6]">
        &copy; {new Date().getFullYear()} BerinAgents &middot; Enterprise Voice AI Platform
      </footer>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f6f4f0] flex items-center justify-center text-xs text-[#73706b]">
        Confirming your subscription...
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
