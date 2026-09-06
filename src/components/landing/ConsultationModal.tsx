'use client'

import { useState } from 'react'
import { X, CheckCircle2, ArrowRight } from 'lucide-react'

interface ConsultationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ConsultationModal({ isOpen, onClose }: ConsultationModalProps) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    businessName: '',
    fullName: '',
    phone: '',
    email: '',
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate submission
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 600)
  }

  const handleReset = () => {
    setSubmitted(false)
    setFormData({
      businessName: '',
      fullName: '',
      phone: '',
      email: '',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#ffffff] border border-[#e6e2d6] rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 p-2 text-[#73706b] hover:text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="p-8 sm:p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#1a1918]">
              Demo Request Received!
            </h3>
            <p className="text-sm text-[#66635e] max-w-xs mx-auto leading-relaxed">
              Thanks <span className="font-semibold text-[#1a1918]">{formData.fullName}</span>! We will prepare a live sample agent for <span className="font-semibold text-[#1a1918]">{formData.businessName}</span> and call you at <span className="font-semibold text-[#1a1918]">{formData.phone}</span>.
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
        ) : (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
                <span>•</span> Quick 30-Second Request
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#1a1918]">
                Request a Free Live Demo
              </h3>
              <p className="text-xs text-[#73706b]">
                Enter your details below to hear how an agent sounds answering calls for your business.
              </p>
            </div>

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
                  Phone Number (To Call You) *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 000-0000"
                  className="w-full text-xs px-3.5 py-2.5 rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/60 text-[#1a1918] focus:border-[#1a1918] outline-none"
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
                    'Sending Request...'
                  ) : (
                    <>
                      <span>Get My Free Demo Call</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#9e4733]" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className="text-[10px] text-[#8c8880]">
                  No credit card required &middot; 100% confidential
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
