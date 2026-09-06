'use client'

import { Check, X, AlertTriangle, ArrowRight } from 'lucide-react'

interface CostComparisonProps {
  onOpenDemo: () => void
}

export default function CostComparison({ onOpenDemo }: CostComparisonProps) {
  return (
    <section id="comparison" className="py-20 md:py-28 bg-[#f6f4f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
            <span>•</span> The Economics of Missed Calls
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1918]">
            What Is An Unanswered Call Really Costing You?
          </h2>
          <p className="text-sm sm:text-base text-[#66635e]">
            Over 85% of people who reach a business voicemail hang up and call the next competitor on Google. Here is how your options compare:
          </p>
        </div>

        {/* 3-Way Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch mb-12">
          
          {/* Option 1: Voicemail / Missing Calls */}
          <div className="bg-[#ffffff] border border-[#e6e2d6] rounded-sm p-7 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9e4733]">
                  Status Quo
                </span>
                <h3 className="font-serif text-xl font-bold text-[#1a1918]">
                  Missing Calls &amp; Voicemail
                </h3>
                <p className="text-xs text-[#73706b]">
                  Relying on voicemail while working on jobs or after 5 PM.
                </p>
              </div>

              <ul className="space-y-3 pt-2 text-xs text-[#55524d]">
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-[#9e4733] shrink-0 mt-0.5" />
                  <span><strong>85% hang up</strong> without leaving a message when hitting voicemail.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-[#9e4733] shrink-0 mt-0.5" />
                  <span>Callers immediately dial the next business on Google Maps.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-[#9e4733] shrink-0 mt-0.5" />
                  <span>Wastes hard-earned ad spend and marketing dollars.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-[#9e4733] shrink-0 mt-0.5" />
                  <span>Frustrating endless phone tag trying to call prospects back.</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[#edeae4]">
              <div className="text-xs text-[#9e4733] font-semibold">
                Cost: Thousands in lost jobs every month
              </div>
            </div>
          </div>

          {/* Option 2: Full-Time Receptionist */}
          <div className="bg-[#ffffff] border border-[#e6e2d6] rounded-sm p-7 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">
                  Traditional Staffing
                </span>
                <h3 className="font-serif text-xl font-bold text-[#1a1918]">
                  Full-Time In-House Staff
                </h3>
                <p className="text-xs text-[#73706b]">
                  Hiring an on-site front desk receptionist or call service.
                </p>
              </div>

              <ul className="space-y-3 pt-2 text-xs text-[#55524d]">
                <li className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>$3,500 - $4,500/month</strong> in wages, payroll taxes, and benefits.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Only answers 9 AM to 5 PM, Monday through Friday.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Sick days, vacations, lunch breaks, and turnover headache.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Can only take 1 call at a time — other callers get busy tones.</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[#edeae4]">
              <div className="text-xs text-[#73706b] font-semibold">
                Cost: $40,000+ per year per employee
              </div>
            </div>
          </div>

          {/* Option 3: BerinAgents (Hero Card) */}
          <div className="bg-[#1a1918] text-[#f6f4f0] border-2 border-[#1a1918] rounded-sm p-7 space-y-6 flex flex-col justify-between shadow-[0_10px_35px_rgba(0,0,0,0.12)] relative">
            <div className="absolute -top-3 right-5 bg-[#9e4733] text-white text-[10px] font-semibold tracking-wider uppercase px-3 py-0.5 rounded-full">
              Recommended Solution
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9e4733]">
                  Modern 24/7 Voice AI
                </span>
                <h3 className="font-serif text-xl font-bold text-[#ffffff]">
                  Your BerinAgents Specialist
                </h3>
                <p className="text-xs text-[#b0aba2]">
                  Dedicated AI phone agent customized to your business.
                </p>
              </div>

              <ul className="space-y-3 pt-2 text-xs text-[#e8e4dc]">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#9e4733] shrink-0 mt-0.5" />
                  <span><strong>100% of calls picked up on Ring 1</strong>, 24 hours a day, 365 days a year.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#9e4733] shrink-0 mt-0.5" />
                  <span>Books appointments directly into your Google or Outlook calendar.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#9e4733] shrink-0 mt-0.5" />
                  <span>Handles unlimited simultaneous calls with zero hold music.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#9e4733] shrink-0 mt-0.5" />
                  <span>Sends instant text and email recap with caller details.</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[#33312e] space-y-3">
              <div className="text-xs text-emerald-400 font-semibold">
                Saves $30,000+/yr while capturing 100% of leads
              </div>
              <button
                onClick={onOpenDemo}
                className="w-full bg-[#ffffff] hover:bg-[#eae6dc] text-[#1a1918] text-xs font-semibold tracking-wider uppercase py-3 rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Request Your Free Demo</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#9e4733]" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
