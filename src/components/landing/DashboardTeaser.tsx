'use client'

import Link from 'next/link'
import { Play, ArrowRight, SmilePlus, Meh } from 'lucide-react'

export default function DashboardTeaser() {
  return (
    <section id="portal-preview" className="py-20 md:py-28 bg-[#f0ede6] border-y border-[#e6e2d6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
            <span>•</span> Client Intelligence Suite
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1918]">
            Full Operational Visibility For Every Client
          </h2>
          <p className="text-sm sm:text-base text-[#66635e]">
            Every enterprise account receives dedicated portal access to listen to high-fidelity audio recordings, inspect automated transcripts, track latency, and audit call sentiment.
          </p>
        </div>

        {/* Dashboard Preview Mockup Card */}
        <div className="max-w-5xl mx-auto bg-[#ffffff] border border-[#e6e2d6] rounded-sm shadow-[0_12px_40px_rgba(0,0,0,0.06)] overflow-hidden">
          
          {/* Top Browser/Portal Header Bar */}
          <div className="bg-[#faf9f7] border-b border-[#e6e2d6] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#e2dfd8]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#e2dfd8]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#e2dfd8]" />
              </div>
              <span className="text-xs font-mono text-[#73706b] border-l border-[#e6e2d6] pl-3">
                https://berinagents.com/dashboard
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Telephony Stream
              </span>

              <Link
                href="/login"
                className="text-xs font-semibold uppercase tracking-wider text-[#1a1918] hover:text-[#9e4733] flex items-center gap-1 transition-colors"
              >
                <span>Portal Login</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Inner Dashboard Content Simulation */}
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#faf9f7] border border-[#e6e2d6] p-4 rounded-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">Total Handled Calls</span>
                <div className="mt-1 font-serif text-2xl font-bold text-[#1a1918]">14,892</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">↑ 18.4% this month</div>
              </div>

              <div className="bg-[#faf9f7] border border-[#e6e2d6] p-4 rounded-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">Avg Turnaround Time</span>
                <div className="mt-1 font-serif text-2xl font-bold text-[#1a1918]">2m 44s</div>
                <div className="text-[11px] text-[#73706b] mt-0.5">Zero wait queue</div>
              </div>

              <div className="bg-[#faf9f7] border border-[#e6e2d6] p-4 rounded-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">Positive Sentiment</span>
                <div className="mt-1 font-serif text-2xl font-bold text-[#1a1918]">94.6%</div>
                <div className="text-[11px] text-[#9e4733] mt-0.5">Scored by Voice NLP</div>
              </div>

              <div className="bg-[#faf9f7] border border-[#e6e2d6] p-4 rounded-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#85817a]">Resolution Rate</span>
                <div className="mt-1 font-serif text-2xl font-bold text-[#1a1918]">91.2%</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Without human intervention</div>
              </div>
            </div>

            {/* Simulated Live Call Table */}
            <div className="border border-[#e6e2d6] rounded-sm overflow-hidden bg-white">
              <div className="px-4 py-3 bg-[#faf9f7] border-b border-[#e6e2d6] flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-[#1a1918] text-[11px]">
                  Recent Call Intelligence Stream
                </span>
                <span className="text-[#73706b] text-[11px]">Auto-refreshing every 5s</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f6f4f0] text-[#73706b] font-medium border-b border-[#e6e2d6]">
                    <tr>
                      <th className="px-4 py-2.5">Caller ID</th>
                      <th className="px-4 py-2.5">Agent Persona</th>
                      <th className="px-4 py-2.5">Duration</th>
                      <th className="px-4 py-2.5">Sentiment</th>
                      <th className="px-4 py-2.5">Resolution / Action</th>
                      <th className="px-4 py-2.5 text-right">Recording</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edeae4]">
                    <tr className="hover:bg-[#faf9f7]">
                      <td className="px-4 py-3 font-mono text-[#1a1918]">+1 (415) •••-9201</td>
                      <td className="px-4 py-3 text-[#55524d]">Inbound Receptionist</td>
                      <td className="px-4 py-3 font-mono text-[#55524d]">2m 14s</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs text-[10px] font-medium">
                          <SmilePlus className="w-3 h-3" /> Positive
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#1a1918]">Booked Calendar (2:30 PM)</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-[#1a1918] bg-[#f0ede6] px-2 py-1 rounded-xs">
                          <Play className="w-2.5 h-2.5 fill-current" /> Audio Ready
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#faf9f7]">
                      <td className="px-4 py-3 font-mono text-[#1a1918]">+1 (212) •••-4481</td>
                      <td className="px-4 py-3 text-[#55524d]">Tier-1 Support Desk</td>
                      <td className="px-4 py-3 font-mono text-[#55524d]">3m 42s</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[#9e4733] bg-[#fdf2f0] px-2 py-0.5 rounded-xs text-[10px] font-medium">
                          <Meh className="w-3 h-3" /> Resolved Exchange
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#1a1918]">Dispatched Return Label</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-[#1a1918] bg-[#f0ede6] px-2 py-1 rounded-xs">
                          <Play className="w-2.5 h-2.5 fill-current" /> Audio Ready
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#faf9f7]">
                      <td className="px-4 py-3 font-mono text-[#1a1918]">+1 (312) •••-8052</td>
                      <td className="px-4 py-3 text-[#55524d]">Lead Qualifier (B2B)</td>
                      <td className="px-4 py-3 font-mono text-[#55524d]">1m 58s</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs text-[10px] font-medium">
                          <SmilePlus className="w-3 h-3" /> High Intent
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#1a1918]">Synced HubSpot CRM (Deal Created)</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-[#1a1918] bg-[#f0ede6] px-2 py-1 rounded-xs">
                          <Play className="w-2.5 h-2.5 fill-current" /> Audio Ready
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Portal Banner */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-[#73706b]">
                Protected client environment with multi-account switching and custom telephony carrier configurations.
              </p>
              <Link
                href="/login"
                className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] text-xs font-semibold tracking-wider uppercase px-5 py-2.5 rounded-sm transition-all flex items-center gap-2 shrink-0"
              >
                <span>Access Your Client Portal</span>
                <span className="text-[#9e4733]">•</span>
              </Link>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
