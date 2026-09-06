'use client'

import { ShieldCheck, Lock, Server, FileCheck } from 'lucide-react'

interface EnterpriseSecurityProps {
  onOpenConsultation: () => void
}

export default function EnterpriseSecurity({ onOpenConsultation }: EnterpriseSecurityProps) {
  return (
    <section id="security" className="py-20 md:py-28 bg-[#f6f4f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
            <span>•</span> Enterprise Security & Compliance
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1918]">
            Built for Mission-Critical Telephony
          </h2>
          <p className="text-sm sm:text-base text-[#66635e]">
            Rigorous security protocols, strict deterministic guardrails, and carrier-grade infrastructure ensure complete peace of mind.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-[#ffffff] border border-[#e6e2d6] p-6 rounded-sm space-y-3">
            <div className="w-9 h-9 rounded-sm bg-[#faf9f7] border border-[#e2dfd8] flex items-center justify-center text-[#9e4733]">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-[#1a1918]">
              AES-256 & TLS 1.3
            </h3>
            <p className="text-xs text-[#66635e] leading-relaxed">
              Every stream is encrypted both in-transit and at rest. Strict token authorization on every SIP trunk handshake.
            </p>
          </div>

          <div className="bg-[#ffffff] border border-[#e6e2d6] p-6 rounded-sm space-y-3">
            <div className="w-9 h-9 rounded-sm bg-[#faf9f7] border border-[#e2dfd8] flex items-center justify-center text-[#9e4733]">
              <FileCheck className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-[#1a1918]">
              Automated PII Redaction
            </h3>
            <p className="text-xs text-[#66635e] leading-relaxed">
              Credit card numbers, social security digits, and medical identifiers are automatically scrubbed from transcripts.
            </p>
          </div>

          <div className="bg-[#ffffff] border border-[#e6e2d6] p-6 rounded-sm space-y-3">
            <div className="w-9 h-9 rounded-sm bg-[#faf9f7] border border-[#e2dfd8] flex items-center justify-center text-[#9e4733]">
              <Server className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-[#1a1918]">
              Dedicated SIP Trunks
            </h3>
            <p className="text-xs text-[#66635e] leading-relaxed">
              High-concurrency private telephony channels guarantee no dropped packets, jitter, or busy tones during spikes.
            </p>
          </div>

          <div className="bg-[#ffffff] border border-[#e6e2d6] p-6 rounded-sm space-y-3">
            <div className="w-9 h-9 rounded-sm bg-[#faf9f7] border border-[#e2dfd8] flex items-center justify-center text-[#9e4733]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-[#1a1918]">
              99.98% Telephony SLA
            </h3>
            <p className="text-xs text-[#66635e] leading-relaxed">
              Backed by enterprise service-level agreements and active carrier failover across global telecommunications zones.
            </p>
          </div>
        </div>

        {/* 4-Step Deployment Workflow */}
        <div className="bg-[#ffffff] border border-[#e6e2d6] rounded-sm p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#9e4733]">
              Rapid Onboarding
            </span>
            <h3 className="font-serif text-2xl font-bold text-[#1a1918] mt-1">
              From Discovery to Live Calls in Under 5 Days
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1a1918] text-white text-xs flex items-center justify-center font-bold">1</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#1a1918]">Persona & Knowledge</span>
              </div>
              <p className="text-xs text-[#66635e] leading-relaxed">
                We ingest your knowledge base, brand guidelines, and telephony call trees into our deterministic voice orchestrator.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1a1918] text-white text-xs flex items-center justify-center font-bold">2</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#1a1918]">Tools & CRM Wiring</span>
              </div>
              <p className="text-xs text-[#66635e] leading-relaxed">
                Seamlessly configure calendar booking, CRM record updating, ticket creation, and custom Webhook actions.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#1a1918] text-white text-xs flex items-center justify-center font-bold">3</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#1a1918]">Simulated Test Suite</span>
              </div>
              <p className="text-xs text-[#66635e] leading-relaxed">
                We stress-test hundreds of edge-case scenarios, interruptions, and background noise audio conditions.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#9e4733] text-white text-xs flex items-center justify-center font-bold">4</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#1a1918]">Live Telephony Launch</span>
              </div>
              <p className="text-xs text-[#66635e] leading-relaxed">
                Forward your existing phone numbers or provision global numbers. Monitor real-time calls in your dedicated portal.
              </p>
            </div>
          </div>

          {/* Consultation CTA Banner */}
          <div className="mt-10 pt-8 border-t border-[#f0ede6] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[#1a1918]">
                Require a custom on-premise or HIPAA-compliant deployment?
              </h4>
              <p className="text-xs text-[#73706b]">
                Our solutions engineering team works with your security and telecom architects.
              </p>
            </div>

            <button
              onClick={onOpenConsultation}
              className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] text-xs font-semibold tracking-wider uppercase px-5 py-2.5 rounded-sm transition-all shadow-none flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Schedule Architecture Review</span>
              <span className="text-[#9e4733]">•</span>
            </button>
          </div>
        </div>

      </div>
    </section>
  )
}
