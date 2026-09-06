'use client'

import { useState } from 'react'
import { X, CheckCircle2, ArrowRight, PhoneCall, Loader2, Volume2, ShieldCheck } from 'lucide-react'

interface ConsultationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ConsultationModal({ isOpen, onClose }: ConsultationModalProps) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [callTriggered, setCallTriggered] = useState(false)
  const [calledPhone, setCalledPhone] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [formData, setFormData] = useState({
    businessName: '',
    fullName: '',
    phone: '',
    email: '',
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      const res = await fetch('/api/request-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit demo request.')
      }

      setCallTriggered(Boolean(data.callTriggered))
      setCalledPhone(data.phone || formData.phone)
      setSubmitted(true)
    } catch (err: any) {
      console.error('Submission error:', err)
      setErrorMessage(err.message || 'Something went wrong. Please check your details and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSubmitted(false)
    setCallTriggered(false)
    setCalledPhone('')
    setErrorMessage('')
    setFormData({
      businessName: '',
      fullName: '',
      phone: '',
      email: '',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#ffffff] border border-[#e6e2d6] rounded-sm shadow-[0_24px_70px_rgba(0,0,0,0.18)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 p-2 text-[#73706b] hover:text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm transition-colors cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          callTriggered ? (
            /* Live Instant Outbound Call Triggered */
            <div className="p-8 sm:p-10 text-center space-y-5">
              <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30 animate-ping" />
                <div className="relative w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                  <PhoneCall className="w-7 h-7 animate-bounce" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] text-emerald-700 uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <Volume2 className="w-3 h-3 animate-pulse" /> Outbound Call In Progress
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1a1918]">
                  Your Phone Is Ringing!
                </h3>
                <p className="text-sm text-[#5a5751] max-w-sm mx-auto leading-relaxed pt-1">
                  Pick up your phone right now. Our AI voice agent is calling <span className="font-semibold text-[#1a1918] font-mono">{calledPhone}</span> to demonstrate how it answers calls for <span className="font-semibold text-[#1a1918]">{formData.businessName}</span>.
                </p>
              </div>

              <div className="p-3.5 bg-[#faf8f5] border border-[#e6e2d6] rounded-sm text-left text-xs text-[#73706b] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#1a1918]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  What to expect on this call:
                </div>
                <p className="text-[11px] leading-relaxed">
                  The agent knows you represent <span className="font-semibold">{formData.businessName}</span>. Test its voice latency, interrupt it anytime, ask about services, and book a direct discovery meeting.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleReset}
                  className="w-full bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] text-xs font-semibold tracking-wider uppercase py-3.5 rounded-sm transition-all cursor-pointer shadow-sm"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            /* Fallback confirmation if call was queued or agent offline */
            <div className="p-8 sm:p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#1a1918]">
                Demo Request Received!
              </h3>
              <p className="text-sm text-[#66635e] max-w-xs mx-auto leading-relaxed">
                Thanks <span className="font-semibold text-[#1a1918]">{formData.fullName}</span>! We have received your request for <span className="font-semibold text-[#1a1918]">{formData.businessName}</span>. We will call you at <span className="font-semibold text-[#1a1918]">{calledPhone || formData.phone}</span> shortly.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleReset}
                  className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] text-xs font-semibold tracking-wider uppercase px-6 py-3 rounded-sm transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
                <span>•</span> Instant Live Voice Test
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#1a1918]">
                Test Our AI Agent on Your Phone
              </h3>
              <p className="text-xs text-[#73706b]">
                Enter your details and our AI agent will call your phone immediately so you can experience it live.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66635e]">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="e.g. Apex Heating & Air"
                  className="w-full text-xs px-3.5 py-2.5 rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/60 text-[#1a1918] focus:border-[#1a1918] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66635e]">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. John Miller"
                  className="w-full text-xs px-3.5 py-2.5 rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/60 text-[#1a1918] focus:border-[#1a1918] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66635e]">
                  Phone Number (We will call this now) *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 234-5678"
                  className="w-full text-xs px-3.5 py-2.5 rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/60 text-[#1a1918] focus:border-[#1a1918] outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66635e]">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@apexheating.com"
                  className="w-full text-xs px-3.5 py-2.5 rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/60 text-[#1a1918] focus:border-[#1a1918] outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] text-xs font-semibold tracking-wider uppercase py-3.5 rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Calling Your Phone...</span>
                    </>
                  ) : (
                    <>
                      <PhoneCall className="w-3.5 h-3.5 text-[#9e4733]" />
                      <span>Call My Phone Now</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#9e4733]" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className="text-[10px] text-[#8c8880]">
                  Instant live call &middot; No credit card &middot; 100% confidential
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
