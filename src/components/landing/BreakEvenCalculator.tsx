'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

interface BreakEvenCalculatorProps {
  onOpenDemo: () => void
}

const presets = [
  { label: '$250', desc: 'Clinic / Care', value: 250 },
  { label: '$500', desc: 'HVAC / Plumbing', value: 500 },
  { label: '$1,000', desc: 'Roofing / Remodel', value: 1000 },
  { label: '$2,000+', desc: 'High-Ticket / Legal', value: 2000 },
]

export default function BreakEvenCalculator({ onOpenDemo }: BreakEvenCalculatorProps) {
  // Monthly estimated subscription
  const monthlyCost = 499

  // State
  const [jobValue, setJobValue] = useState<number>(500)
  const [callsSaved, setCallsSaved] = useState<number>(4)

  // Math
  const breakEvenAt = Math.max(1, Math.ceil(monthlyCost / jobValue))
  const totalRevenue = callsSaved * jobValue
  const netProfit = totalRevenue - monthlyCost

  return (
    <section className="py-16 md:py-24 bg-[#ffffff] border-b border-[#e6e2d6]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
            <span>•</span> Instant Profitability
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1918]">
            How Many Saved Calls Until It Pays For Itself?
          </h2>
          <p className="text-base text-[#66635e]">
            You don&apos;t need dozens of calls. For most businesses, <strong className="text-[#1a1918]">just 1 or 2 saved calls a month</strong> covers the entire cost. Everything after is pure profit.
          </p>
        </div>

        {/* Ultra-Simple Interactive Card */}
        <div className="bg-[#faf9f7] border-2 border-[#1a1918] rounded-sm p-6 sm:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-8">
          
          {/* Step 1: Average Customer Value */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1a1918]">
                Select your average job or customer value:
              </span>
              <span className="font-serif text-xl font-bold text-[#1a1918]">
                ${jobValue.toLocaleString()}
              </span>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setJobValue(p.value)}
                  className={`p-3 rounded-sm text-center border transition-all cursor-pointer ${
                    jobValue === p.value
                      ? 'bg-[#1a1918] text-white border-[#1a1918] shadow-sm'
                      : 'bg-white text-[#55524d] border-[#e2dfd8] hover:border-[#1a1918]'
                  }`}
                >
                  <div className="font-serif font-bold text-sm">{p.label}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>

            {/* Range slider for fine tuning */}
            <input
              type="range"
              min={150}
              max={2500}
              step={50}
              value={jobValue}
              onChange={(e) => setJobValue(Number(e.target.value))}
              className="w-full h-2 bg-[#edeae4] rounded-lg appearance-none cursor-pointer accent-[#1a1918] mt-1"
            />
          </div>

          {/* Step 2: The Visual Break-Even Bar */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1a1918]">
                Saved calls per month:
              </span>
              <span className="text-xs font-semibold text-[#9e4733] bg-[#fdf2f0] px-2.5 py-1 rounded-xs border border-[#f5c6cb]">
                {callsSaved} calls caught
              </span>
            </div>

            {/* Step Slider */}
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={callsSaved}
              onChange={(e) => setCallsSaved(Number(e.target.value))}
              className="w-full h-2.5 bg-[#edeae4] rounded-lg appearance-none cursor-pointer accent-[#9e4733]"
            />
            <div className="flex justify-between text-[11px] text-[#8c8880]">
              <span>1 call</span>
              <span>5 calls</span>
              <span>10 calls</span>
            </div>
          </div>

          {/* Visual Call-by-Call Stepper (Simple 5-Call Visualizer) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
            {[1, 2, 3, 4, 5].map((callNum) => {
              const isBreakEven = callNum === breakEvenAt
              const isPastBreakEven = callNum > breakEvenAt
              const isSelected = callNum <= callsSaved

              return (
                <div
                  key={callNum}
                  onClick={() => setCallsSaved(callNum)}
                  className={`p-3 rounded-sm border text-center transition-all cursor-pointer ${
                    isSelected
                      ? isPastBreakEven
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : isBreakEven
                        ? 'bg-[#1a1918] text-white border-[#1a1918]'
                        : 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-white/60 border-[#e2dfd8] text-[#8c8880] opacity-60'
                  }`}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider">
                    Call #{callNum}
                  </div>
                  <div className="font-bold text-xs mt-1">
                    {isBreakEven ? (
                      <span className="text-amber-300">🎯 Break-Even</span>
                    ) : isPastBreakEven ? (
                      <span className="text-emerald-700 font-semibold">+${jobValue} Profit</span>
                    ) : (
                      <span>Towards Plan</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* The Big Bottom Result Box */}
          <div className="bg-[#ffffff] border border-[#e6e2d6] rounded-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="space-y-1">
              <div className="text-xs text-[#8c8880] font-semibold uppercase tracking-wider">
                The Bottom Line Result
              </div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1a1918]">
                {netProfit >= 0 ? (
                  <>
                    <span className="text-emerald-700">+${netProfit.toLocaleString()}</span>{' '}
                    <span className="text-base font-normal text-[#55524d]">net profit in your pocket each month</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#9e4733]">${Math.abs(netProfit).toLocaleString()}</span>{' '}
                    <span className="text-base font-normal text-[#55524d]">needed to break even</span>
                  </>
                )}
              </div>
              <p className="text-xs text-[#66635e]">
                At ${jobValue} per customer, you break even on{' '}
                <strong className="text-[#1a1918]">Call #{breakEvenAt}</strong>. Every call after that is 100% profit.
              </p>
            </div>

            <button
              onClick={onOpenDemo}
              className="w-full sm:w-auto bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] text-xs font-semibold tracking-wider uppercase px-7 py-4 rounded-sm transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Request a Demo</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#9e4733]" />
            </button>
          </div>

        </div>

      </div>
    </section>
  )
}
