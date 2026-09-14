'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getClientAgentsAction } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot, Phone, Activity, Clock, SmilePlus, Sparkles, CheckCircle2 } from 'lucide-react'
import PageLoading from '@/components/PageLoading'

// Module-level cache for instant 0ms tab switching
let cachedAgents: any[] | null = null
let cachedClientName: string | null = null

function AgentsContent() {
  const searchParams = useSearchParams()
  const queryClientId = searchParams?.get('clientId')
  const [agents, setAgents] = useState<any[]>(() => cachedAgents || [])
  const [clientName, setClientName] = useState<string>(() => cachedClientName || '')
  const [loading, setLoading] = useState(() => !cachedAgents)

  useEffect(() => {
    fetchAgents()
  }, [queryClientId])

  const fetchAgents = async () => {
    if (!cachedAgents) setLoading(true)
    const res = await getClientAgentsAction(queryClientId || undefined)
    if (res.success) {
      cachedAgents = res.agents || []
      cachedClientName = res.clientName || ''
      setAgents(res.agents || [])
      setClientName(res.clientName || '')
    }
    setLoading(false)
  }

  const totalCalls = agents.reduce((acc, a) => acc + (a.stats?.totalCalls || 0), 0)
  const totalMinutes = agents.reduce((acc, a) => acc + (a.stats?.totalMinutes || 0), 0)
  const agentsWithCalls = agents.filter(a => (a.stats?.totalCalls || 0) > 0)
  const avgSatisfaction = agentsWithCalls.length > 0 
    ? Math.round(agentsWithCalls.reduce((acc, a) => acc + (a.stats?.satisfactionRate ?? 0), 0) / agentsWithCalls.length)
    : null

  if (loading) {
    return <PageLoading message="Loading Voice Agents..." />
  }

  return (
    <div className="p-3 sm:p-8 space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-36 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9e4733]"></span> VOICE FLEET
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1918]">Voice AI Agents</h1>
          <p className="text-xs sm:text-sm text-[#73706b]">
            Assigned conversational agents & live lines {clientName ? `for ${clientName}` : ''}
          </p>
        </div>
      </div>

      {/* Fleet KPI Summary - Apple 3-card grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur-xl p-3 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#73706b]">Agents</span>
            <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#9e4733]" />
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="font-serif text-xl sm:text-3xl font-bold text-[#1a1918]">{agents.length}</div>
            <p className="text-[10px] sm:text-xs text-[#73706b] mt-0.5 truncate">Active bots</p>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur-xl p-3 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#73706b]">Minutes</span>
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#73706b]" />
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="font-serif text-xl sm:text-3xl font-bold text-[#1a1918]">{totalMinutes.toFixed(0)}m</div>
            <p className="text-[10px] sm:text-xs text-[#73706b] mt-0.5 truncate">{totalCalls} calls</p>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur-xl p-3 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#2e6930]">Sentiment</span>
            <SmilePlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#2e6930]" />
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="font-serif text-xl sm:text-3xl font-bold text-[#2e6930]">
              {avgSatisfaction !== null ? `${avgSatisfaction}%` : '—'}
            </div>
            <p className="text-[10px] sm:text-xs text-[#73706b] mt-0.5 truncate">Positive</p>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {agents.map((agent) => (
          <div 
            key={agent.id} 
            className="rounded-2xl border border-stone-200/80 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col justify-between transition-all hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)]"
          >
            <div>
              {/* Card Top Header */}
              <div className="border-b border-stone-100 p-4 sm:p-5 bg-gradient-to-b from-stone-50/80 to-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-2xl bg-[#1a1918] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="h-5 w-5 text-[#9e4733]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1a1918] truncate">
                      {agent.agent_name}
                    </h2>
                    <p className="text-[11px] font-mono text-stone-500 truncate">
                      ID: {agent.retell_agent_id}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] sm:text-xs font-semibold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  LIVE
                </span>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {/* Capabilities Pill Row */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-50 border border-stone-200 text-[#1a1918] font-medium">
                    <Sparkles className="h-3 w-3 text-[#9e4733]" /> Multi-turn Voice AI
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-50 border border-stone-200 text-[#1a1918] font-medium">
                    <CheckCircle2 className="h-3 w-3 text-[#2e6930]" /> Auto-transcription
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-50 border border-stone-200 text-[#1a1918] font-medium">
                    <Activity className="h-3 w-3 text-[#8a6519]" /> Real-time Sentiment
                  </span>
                </div>

                {/* Agent Stats Box */}
                <div className="grid grid-cols-3 gap-2 py-3 px-3 sm:px-4 bg-stone-50/70 rounded-xl border border-stone-100 text-center">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">Calls</div>
                    <div className="font-serif text-lg sm:text-xl font-bold text-[#1a1918] mt-0.5">{agent.stats?.totalCalls || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">Minutes</div>
                    <div className="font-serif text-lg sm:text-xl font-bold text-[#1a1918] mt-0.5">{agent.stats?.totalMinutes || 0}m</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">Positive</div>
                    <div className="font-serif text-lg sm:text-xl font-bold text-[#2e6930] mt-0.5">
                      {agent.stats?.totalCalls && agent.stats.totalCalls > 0 && agent.stats.satisfactionRate !== null
                        ? `${agent.stats.satisfactionRate}%`
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-5 py-3 border-t border-stone-100 bg-stone-50/40 flex items-center justify-between text-[11px] sm:text-xs text-stone-500">
              <span className="flex items-center gap-1.5 truncate">
                <Phone className="h-3.5 w-3.5 text-[#9e4733] shrink-0" /> Inbound & Outbound Ready
              </span>
              <span className="font-mono text-[10px] sm:text-[11px] shrink-0">
                {new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-8 sm:p-12 text-center shadow-sm">
          <Bot className="h-12 w-12 text-stone-400 mx-auto mb-3" />
          <h3 className="font-serif text-xl font-bold text-[#1a1918]">No Voice Agents Assigned Yet</h3>
          <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto mt-2">
            Your BerinAgents voice assistant is currently being configured. Contact your agency account manager to configure your dedicated phone numbers and prompts.
          </p>
        </div>
      )}

      {/* Safe mobile spacing for lowbar clearance */}
      <div className="h-12 md:hidden" />
    </div>
  )
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading Voice Agents..." />}>
      <AgentsContent />
    </Suspense>
  )
}
