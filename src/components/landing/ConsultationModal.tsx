'use client'

import { useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'

interface ConsultationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ConsultationModal({ isOpen, onClose }: ConsultationModalProps) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    callVolume: '1,000 - 10,000 calls/mo',
    useCase: 'Inbound Customer Care',
    notes: '',
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate submission (can be wired to webhook or database)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 800)
  }

  const handleReset = () => {
    setSubmitted(false)
    setFormData({
      name: '',
      email: '',
      company: '',
      phone: '',
      callVolume: '1,000 - 10,000 calls/mo',
      useCase: 'Inbound Customer Care',
      notes: '',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#ffffff] border border-[#e6e2d6] rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden"
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
            <div className="w-12 h-12 rounded-full bg-[#fdf2f0] border border-[#f5c6cb] text-[#9e4733] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-[#9e4733]" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#1a1918]">
              Consultation Request Received
            </h3>
            <p className="text-sm text-[#66635e] max-w-sm mx-auto leading-relaxed">
              Thank you, <span className="font-semibold text-[#1a1918]">{formData.name}</span>. A BerinAgents solutions engineer will contact your team at <span className="font-semibold text-[#1a1918]">{formData.email}</span> within 2 business hours.
            </p>
            <div className="pt-4">
              <button
                onClick={handleReset}
                className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] text-xs font-semibold tracking-wider uppercase px-6 py-3 rounded-sm transition-all cursor-pointer"
              >
                Return to Site
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
                <span>•</span> Enterprise Solutions Desk
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#1a1918]">
                Schedule an Architecture Consultation
              </h3>
              <p className="text-xs text-[#73706b]">
                Discuss your telephony volume, custom CRM integrations, and voice latency benchmarks.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66635e]">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Jane Doe"
                    className="w-full text-xs px-3 py-2.5 rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/60 text-[#1a1918] focus:border-[#1a1918] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66635e]">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@company.com"
                    className="w-full text-xs px-3 py-2.5 rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/60 text-[#1a1918] focus:border-[#1a1918] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66635e]">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Acme Corp"
                    className="w-full text-xs px-3 py-2.5 rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/60 text-[#1a1918] focus:border-[#1a1918] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66635e]">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full text-xs px-3 py-2.5 rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/60 text-[#1a1918] focus:border-[#1a1918] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66635e]">
                    Primary Use Case
                  </label>
                  <select
                    value={formData.useCase}
                    onChange={e => setFormData({ ...formData, useCase: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/60 text-[#1a1918] focus:border-[#1a1918] outline-none"
                  >
                    <option>Inbound Customer Care</option>
                    <option>Appointment Scheduling</option>
                    <option>Outbound Sales & Qualification</option>
                    <option>Emergency Dispatch & Handoff</option>
                    <option>Custom Telephony Architecture</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66635e]">
                    Monthly Call Volume
                  </label>
                  <select
                    value={formData.callVolume}
                    onChange={e => setFormData({ ...formData, callVolume: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/60 text-[#1a1918] focus:border-[#1a1918] outline-none"
                  >
                    <option>&lt; 1,000 calls/mo</option>
                    <option>1,000 - 10,000 calls/mo</option>
                    <option>10,000 - 50,000 calls/mo</option>
                    <option>50,000+ calls/mo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#66635e]">
                  Additional Requirements / Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Tell us about your current telephony stack (Twilio, Retell, Genesys) or desired integrations..."
                  className="w-full text-xs px-3 py-2 rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/60 text-[#1a1918] focus:border-[#1a1918] outline-none resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] text-xs font-semibold tracking-wider uppercase py-3 rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    'Transmitting Request...'
                  ) : (
                    <>
                      <span>Confirm Consultation Request</span>
                      <span className="text-[#9e4733]">•</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className="text-[11px] text-[#8c8880]">
                  NDA protected &middot; Enterprise SLA guaranteed
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
