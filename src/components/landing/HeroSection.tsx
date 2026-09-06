'use client'

import Link from 'next/link'
import { Play, ArrowRight, CheckCircle2, Shield, Activity, PhoneCall } from 'lucide-react'

interface HeroSectionProps {
  onOpenConsultation: () => void
}

export default function HeroSection({ onOpenConsultation }: HeroSectionProps) {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-[#f6f4f0]">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#1a1918_1px,transparent_1px)] [background-size:24px_24px]" />
      
      {/* Soft Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#e8e2d5]/60 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#e2dfd8] bg-[#ffffff]/80 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="w-2 h-2 rounded-full bg-[#9e4733] animate-pulse" />
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1a1918]">
              Next-Gen Voice Intelligence Platform
            </span>
          </div>

          {/* Main Title */}
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1a1918] leading-[1.12]">
            Autonomous Voice AI for Modern Enterprise Operations
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-[#615e58] font-normal leading-relaxed max-w-2xl mx-auto">
            Deploy human-grade conversational agents with sub-500ms latency, seamless CRM orchestration, and real-time sentiment analytics. Scale phone capacity effortlessly without growing headcount.
          </p>

          {/* Call to Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
            <button
              onClick={onOpenConsultation}
              className="w-full sm:w-auto bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] text-xs font-semibold tracking-wider uppercase px-7 py-3.5 rounded-sm transition-all shadow-[0_4px_14px_rgba(0,0,0,0.12)] flex items-center justify-center gap-2.5 cursor-pointer group"
            >
              <span>Schedule Enterprise Consultation</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-[#9e4733]" />
            </button>

            <a
              href="#voice-demo"
              className="w-full sm:w-auto bg-[#ffffff] hover:bg-[#faf9f7] text-[#1a1918] border border-[#e2dfd8] text-xs font-semibold tracking-wider uppercase px-6 py-3.5 rounded-sm transition-all flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
            >
              <Play className="w-3.5 h-3.5 fill-[#1a1918]" />
              <span>Listen to Live Demos</span>
            </a>

            <Link
              href="/login"
              className="w-full sm:w-auto text-[#66635e] hover:text-[#1a1918] text-xs font-semibold tracking-wider uppercase px-4 py-3.5 transition-colors flex items-center justify-center gap-1"
            >
              <span>Client Portal</span>
              <span className="text-[#9e4733]">•</span>
            </Link>
          </div>

          {/* Telemetry Strip / Metrics */}
          <div className="pt-10 border-t border-[#e6e2d6]/80 mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-left">
            <div className="bg-[#ffffff]/70 border border-[#e6e2d6] rounded-sm p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">Median Latency</span>
                <Activity className="w-3.5 h-3.5 text-[#9e4733]" />
              </div>
              <div className="mt-1 font-serif text-2xl font-bold text-[#1a1918]">
                &lt;420ms
              </div>
              <p className="text-[11px] text-[#73706b] mt-0.5">Real-time conversational response</p>
            </div>

            <div className="bg-[#ffffff]/70 border border-[#e6e2d6] rounded-sm p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">Telephony Uptime</span>
                <PhoneCall className="w-3.5 h-3.5 text-[#9e4733]" />
              </div>
              <div className="mt-1 font-serif text-2xl font-bold text-[#1a1918]">
                99.98%
              </div>
              <p className="text-[11px] text-[#73706b] mt-0.5">Carrier-grade SIP trunking</p>
            </div>

            <div className="bg-[#ffffff]/70 border border-[#e6e2d6] rounded-sm p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">Context Handoff</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9e4733]" />
              </div>
              <div className="mt-1 font-serif text-2xl font-bold text-[#1a1918]">
                &lt;2.0s
              </div>
              <p className="text-[11px] text-[#73706b] mt-0.5">Live warm human transfer</p>
            </div>

            <div className="bg-[#ffffff]/70 border border-[#e6e2d6] rounded-sm p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">Security Standard</span>
                <Shield className="w-3.5 h-3.5 text-[#9e4733]" />
              </div>
              <div className="mt-1 font-serif text-2xl font-bold text-[#1a1918]">
                SOC2 / HIPAA
              </div>
              <p className="text-[11px] text-[#73706b] mt-0.5">End-to-end encrypted audio</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
