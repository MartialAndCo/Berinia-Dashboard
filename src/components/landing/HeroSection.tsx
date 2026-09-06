'use client'

import { Play, ArrowRight, PhoneIncoming, Clock, DollarSign, CalendarCheck } from 'lucide-react'

interface HeroSectionProps {
  onOpenDemo: () => void
}

export default function HeroSection({ onOpenDemo }: HeroSectionProps) {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-[#f6f4f0]">
      {/* Subtle Background Accent */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#1a1918_1px,transparent_1px)] [background-size:24px_24px]" />
      
      {/* Warm Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#e8e2d5]/60 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#e2dfd8] bg-[#ffffff]/80 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="w-2 h-2 rounded-full bg-[#9e4733] animate-pulse" />
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1a1918]">
              Never Miss Another Paying Customer
            </span>
          </div>

          {/* Main Title Focused on the Business Pain */}
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1a1918] leading-[1.12]">
            Every Missed Call Is Money Handed to Your Competitor.
          </h1>

          {/* Subheading Focused on SMB Business Value */}
          <p className="text-base sm:text-lg text-[#615e58] font-normal leading-relaxed max-w-2xl mx-auto">
            When potential customers call your business, they need an answer right now. BerinAgents answers 100% of your calls 24/7, books jobs directly into your calendar, and captures high-value leads—even while you sleep or work in the field.
          </p>

          {/* Call to Actions (No Portal Clutter) */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
            <button
              onClick={onOpenDemo}
              className="w-full sm:w-auto bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] text-xs font-semibold tracking-wider uppercase px-8 py-4 rounded-sm transition-all shadow-[0_4px_14px_rgba(0,0,0,0.12)] flex items-center justify-center gap-2.5 cursor-pointer group"
            >
              <span>Request a Live Demo</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-[#9e4733]" />
            </button>

            <a
              href="#voice-demos"
              className="w-full sm:w-auto bg-[#ffffff] hover:bg-[#faf9f7] text-[#1a1918] border border-[#e2dfd8] text-xs font-semibold tracking-wider uppercase px-7 py-4 rounded-sm transition-all flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
            >
              <Play className="w-3.5 h-3.5 fill-[#1a1918]" />
              <span>Hear Real Call Examples</span>
            </a>
          </div>

          {/* Real Business Metrics Strip */}
          <div className="pt-10 border-t border-[#e6e2d6]/80 mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-left">
            <div className="bg-[#ffffff]/80 border border-[#e6e2d6] rounded-sm p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">Call Pickup</span>
                <PhoneIncoming className="w-3.5 h-3.5 text-[#9e4733]" />
              </div>
              <div className="mt-1 font-serif text-2xl font-bold text-[#1a1918]">
                100%
              </div>
              <p className="text-[11px] text-[#73706b] mt-0.5">Every call answered on Ring 1</p>
            </div>

            <div className="bg-[#ffffff]/80 border border-[#e6e2d6] rounded-sm p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">Availability</span>
                <Clock className="w-3.5 h-3.5 text-[#9e4733]" />
              </div>
              <div className="mt-1 font-serif text-2xl font-bold text-[#1a1918]">
                24/7/365
              </div>
              <p className="text-[11px] text-[#73706b] mt-0.5">Nights, weekends &amp; holidays</p>
            </div>

            <div className="bg-[#ffffff]/80 border border-[#e6e2d6] rounded-sm p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">Lead Capture</span>
                <CalendarCheck className="w-3.5 h-3.5 text-[#9e4733]" />
              </div>
              <div className="mt-1 font-serif text-2xl font-bold text-[#1a1918]">
                Instant
              </div>
              <p className="text-[11px] text-[#73706b] mt-0.5">Direct into your Google or Outlook calendar</p>
            </div>

            <div className="bg-[#ffffff]/80 border border-[#e6e2d6] rounded-sm p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">Cost Savings</span>
                <DollarSign className="w-3.5 h-3.5 text-[#9e4733]" />
              </div>
              <div className="mt-1 font-serif text-2xl font-bold text-[#1a1918]">
                70%+
              </div>
              <p className="text-[11px] text-[#73706b] mt-0.5">Versus hiring full-time reception staff</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
