'use client'

import { useState } from 'react'
import { Check, X, AlertTriangle, ArrowRight, DollarSign, Calculator, TrendingUp, Sparkles, Target } from 'lucide-react'

interface CostComparisonProps {
  onOpenDemo: () => void
}

const industryPresets = [
  { label: 'Dental & Clinic', value: 300, icon: '🦷' },
  { label: 'HVAC & Plumbing', value: 550, icon: '🔧' },
  { label: 'Roofing & Remodeling', value: 1500, icon: '🏠' },
  { label: 'Legal & Consulting', value: 1200, icon: '⚖️' },
]

export default function CostComparison({ onOpenDemo }: CostComparisonProps) {
  // Monthly plan price estimate
  const monthlyPlan = 499

  // State for ROI Calculator
  const [avgJobValue, setAvgJobValue] = useState<number>(550)
  const [callsSavedPerMonth, setCallsSavedPerMonth] = useState<number>(6)

  // Calculations
  const breakEvenCalls = Math.max(1, Math.ceil(monthlyPlan / avgJobValue))
  const totalRevenueGenerated = callsSavedPerMonth * avgJobValue
  const netProfit = totalRevenueGenerated - monthlyPlan
  const isProfitable = callsSavedPerMonth >= breakEvenCalls
  const roiMultiplier = (totalRevenueGenerated / monthlyPlan).toFixed(1)

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch mb-20">
          
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

        {/* ========================================================================= */}
        {/* INTERACTIVE BREAK-EVEN & ROI CALCULATOR SECTION */}
        {/* ========================================================================= */}
        <div className="max-w-4xl mx-auto bg-[#ffffff] border-2 border-[#1a1918] rounded-sm shadow-[0_16px_50px_rgba(0,0,0,0.06)] overflow-hidden">
          
          {/* Card Header */}
          <div className="bg-[#1a1918] text-[#f6f4f0] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
                <Calculator className="w-3.5 h-3.5" />
                <span>Interactive Break-Even Simulator</span>
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                How Many Calls Until You&apos;re 100% Profitable?
              </h3>
              <p className="text-xs sm:text-sm text-[#b0aba2]">
                Slide the bars below to see how fast your BerinAgents subscription pays for itself.
              </p>
            </div>

            <div className="bg-[#2a2826] border border-[#3e3b38] rounded-sm px-4 py-3 text-center sm:text-right shrink-0">
              <span className="text-[10px] uppercase font-semibold text-[#8c8880] tracking-wider block">Estimated Plan</span>
              <span className="font-serif text-xl font-bold text-white">${monthlyPlan}</span>
              <span className="text-[11px] text-[#8c8880]"> / month</span>
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-8">
            
            {/* Input 1: Average Customer / Job Value */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#1a1918]">
                  1. What is your average customer or job value?
                </label>
                <div className="text-sm font-serif font-bold text-[#9e4733] bg-[#fdf2f0] px-3 py-1 rounded-xs border border-[#f5c6cb]">
                  ${avgJobValue.toLocaleString()} per customer
                </div>
              </div>

              {/* Industry Preset Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {industryPresets.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setAvgJobValue(preset.value)}
                    className={`px-3 py-2 rounded-sm text-xs font-medium border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      avgJobValue === preset.value
                        ? 'bg-[#1a1918] text-white border-[#1a1918]'
                        : 'bg-[#faf9f7] text-[#55524d] border-[#e2dfd8] hover:border-[#1a1918]'
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span className="truncate">{preset.label}</span>
                    <span className="text-[10px] opacity-75">(${preset.value})</span>
                  </button>
                ))}
              </div>

              {/* Slider for Job Value */}
              <div className="pt-2">
                <input
                  type="range"
                  min={100}
                  max={2500}
                  step={50}
                  value={avgJobValue}
                  onChange={(e) => setAvgJobValue(Number(e.target.value))}
                  className="w-full h-2 bg-[#edeae4] rounded-lg appearance-none cursor-pointer accent-[#1a1918]"
                />
                <div className="flex justify-between text-[11px] text-[#8c8880] mt-1">
                  <span>$100</span>
                  <span>$1,000</span>
                  <span>$2,500+</span>
                </div>
              </div>
            </div>

            {/* Input 2: Number of Calls Answered & Converted Per Month */}
            <div className="space-y-3 pt-4 border-t border-[#edeae4]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#1a1918]">
                  2. Monthly calls answered &amp; captured by BerinAgents:
                </label>
                <div className="text-sm font-serif font-bold text-[#1a1918] bg-[#faf9f7] px-3 py-1 rounded-xs border border-[#e2dfd8]">
                  {callsSavedPerMonth} {callsSavedPerMonth === 1 ? 'call' : 'calls'} / month
                </div>
              </div>

              {/* Slider for Monthly Calls */}
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={callsSavedPerMonth}
                onChange={(e) => setCallsSavedPerMonth(Number(e.target.value))}
                className="w-full h-2.5 bg-[#edeae4] rounded-lg appearance-none cursor-pointer accent-[#9e4733]"
              />
              <div className="flex justify-between text-[11px] text-[#8c8880]">
                <span>1 call / mo</span>
                <span>10 calls / mo</span>
                <span>20+ calls / mo</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* THE VISUAL BREAK-EVEN BAR (LA BARRE DE RENTABILITÉ) */}
            {/* ========================================================================= */}
            <div className="space-y-3 bg-[#faf9f7] border border-[#e6e2d6] p-5 sm:p-6 rounded-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#1a1918] flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#9e4733]" />
                  <span>Break-Even Progress Tracker</span>
                </span>

                <div className="text-xs font-semibold">
                  {isProfitable ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xs">
                      <Check className="w-3.5 h-3.5" />
                      100% PROFITABLE (+${netProfit.toLocaleString()} Net)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xs">
                      Need {breakEvenCalls - callsSavedPerMonth} more call to break even
                    </span>
                  )}
                </div>
              </div>

              {/* Visual Multi-Segment Bar */}
              <div className="relative pt-6 pb-2">
                {/* Visual Marker for the Break-Even Point */}
                <div
                  className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-200"
                  style={{ left: `${Math.min(100, Math.max(5, (breakEvenCalls / 20) * 100))}%` }}
                >
                  <span className="bg-[#1a1918] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs whitespace-nowrap shadow-xs flex items-center gap-1">
                    🎯 Break-Even at #{breakEvenCalls}
                  </span>
                  <div className="w-0.5 h-3 bg-[#1a1918]" />
                </div>

                {/* The Progress Bar Container */}
                <div className="w-full bg-[#edeae4] h-4 rounded-full overflow-hidden flex relative">
                  {/* Active Filled Bar */}
                  <div
                    className={`h-full transition-all duration-200 ${
                      isProfitable ? 'bg-emerald-600' : 'bg-[#9e4733]'
                    }`}
                    style={{ width: `${Math.min(100, (callsSavedPerMonth / 20) * 100)}%` }}
                  />
                </div>

                {/* Bar Call Labels */}
                <div className="flex justify-between text-[10px] font-mono text-[#8c8880] mt-2">
                  <span>1 Call</span>
                  <span>5 Calls</span>
                  <span>10 Calls</span>
                  <span>15 Calls</span>
                  <span>20 Calls</span>
                </div>
              </div>

              {/* Break-Even Explanation Box */}
              <div className="p-3 bg-white border border-[#e6e2d6] rounded-xs text-xs text-[#55524d] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#9e4733]" />
                  <span>
                    At <strong>${avgJobValue}</strong> per customer, you only need 
                    <strong className="text-[#1a1918] font-bold"> {breakEvenCalls} {breakEvenCalls === 1 ? 'call' : 'calls'} </strong>
                    per month to pay for the entire service.
                  </span>
                </div>
                <div className="font-semibold text-emerald-700 whitespace-nowrap text-right">
                  Every call after #{breakEvenCalls} is pure profit!
                </div>
              </div>
            </div>

            {/* Live Financial Outcome Display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-[#faf9f7] border border-[#e6e2d6] p-4 rounded-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">
                  Extra Monthly Revenue
                </span>
                <div className="mt-1 font-serif text-2xl font-bold text-[#1a1918]">
                  +${totalRevenueGenerated.toLocaleString()}
                </div>
                <p className="text-[11px] text-[#73706b] mt-0.5">
                  From {callsSavedPerMonth} captured calls
                </p>
              </div>

              <div className="bg-[#faf9f7] border border-[#e6e2d6] p-4 rounded-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">
                  Net Monthly Profit
                </span>
                <div className={`mt-1 font-serif text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-[#9e4733]'}`}>
                  {netProfit >= 0 ? `+$${netProfit.toLocaleString()}` : `-$${Math.abs(netProfit).toLocaleString()}`}
                </div>
                <p className="text-[11px] text-[#73706b] mt-0.5">
                  After paying your ${monthlyPlan} plan
                </p>
              </div>

              <div className="bg-[#1a1918] text-white p-4 rounded-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9e4733]">
                    Estimated ROI
                  </span>
                  <div className="mt-1 font-serif text-2xl font-bold text-white flex items-center gap-1.5">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span>{roiMultiplier}x Return</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#b0aba2] mt-1">
                  +${(netProfit * 12).toLocaleString()}/yr net revenue
                </p>
              </div>
            </div>

            {/* Direct CTA */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-[#73706b]">
                No contract &middot; Cancel anytime &middot; Setup in under 48 hours
              </p>

              <button
                onClick={onOpenDemo}
                className="w-full sm:w-auto bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] text-xs font-semibold tracking-wider uppercase px-7 py-3.5 rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Request a Demo to Lock In These Returns</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#9e4733]" />
              </button>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
