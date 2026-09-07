'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getClientAgentsAction } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot, Phone, Activity, Clock, SmilePlus, Sparkles, CheckCircle2 } from 'lucide-react'

function AgentsContent() {
  const searchParams = useSearchParams()
  const queryClientId = searchParams?.get('clientId')
  const [agents, setAgents] = useState<any[]>([])
  const [clientName, setClientName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgents()
  }, [queryClientId])

  const fetchAgents = async () => {
    setLoading(true)
    const res = await getClientAgentsAction(queryClientId || undefined)
    if (res.success) {
      setAgents(res.agents || [])
      setClientName(res.clientName || '')
    }
    setLoading(false)
  }

  const totalCalls = agents.reduce((acc, a) => acc + (a.stats?.totalCalls || 0), 0)
  const totalMinutes = agents.reduce((acc, a) => acc + (a.stats?.totalMinutes || 0), 0)
  const avgSatisfaction = agents.length > 0 
    ? Math.round(agents.reduce((acc, a) => acc + (a.stats?.satisfactionRate || 0), 0) / agents.length)
    : 100

  if (loading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-[#e6e2d6] rounded-sm" />
            <div className="h-8 w-64 bg-[#dfdbd2] rounded-sm" />
            <div className="h-4 w-96 bg-[#eae7df] rounded-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-white border border-[#e6e2d6] rounded-sm p-6" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-white border border-[#e6e2d6] rounded-sm p-6" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
              <span>•</span> VOICE FLEET
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">Voice AI Agents</h1>
            <p className="text-sm text-[#73706b]">
              Assigned conversational agents and live phone line connections {clientName ? `for ${clientName}` : ''}
            </p>
          </div>
        </div>

        {/* Fleet KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Active Agents</CardTitle>
              <Bot className="h-4 w-4 text-[#9e4733]" />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-3xl font-bold text-[#1a1918]">{agents.length}</div>
              <p className="text-xs text-[#73706b] mt-1">Dedicated AI bots</p>
            </CardContent>
          </Card>

          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Total Minutes Served</CardTitle>
              <Clock className="h-4 w-4 text-[#73706b]" />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-3xl font-bold text-[#1a1918]">{totalMinutes.toFixed(1)}m</div>
              <p className="text-xs text-[#73706b] mt-1">Across {totalCalls} completed calls</p>
            </CardContent>
          </Card>

          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-[#2e6930]">Avg. Sentiment Rating</CardTitle>
              <SmilePlus className="h-4 w-4 text-[#2e6930]" />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-3xl font-bold text-[#2e6930]">{avgSatisfaction}%</div>
              <p className="text-xs text-[#73706b] mt-1">Positive caller experience</p>
            </CardContent>
          </Card>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col justify-between">
              <div>
                <CardHeader className="border-b border-[#f0ece4] py-4 px-6 bg-[#faf8f5] flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-sm bg-[#1a1918] text-white flex items-center justify-center">
                      <Bot className="h-5 w-5 text-[#9e4733]" />
                    </div>
                    <div>
                      <CardTitle className="font-serif text-xl font-bold text-[#1a1918]">
                        {agent.agent_name}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono text-[#73706b]">
                        ID: {agent.retell_agent_id}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-[#eef7ee] text-[#2e6930] border border-[#d2ead2] rounded-sm text-xs font-semibold shadow-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2e6930] animate-pulse" />
                    LIVE & ACTIVE
                  </Badge>
                </CardHeader>

                <CardContent className="p-6 space-y-5">
                  {/* Capabilities Pill Row */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#faf8f5] border border-[#e6e2d6] text-[#1a1918] font-medium">
                      <Sparkles className="h-3 w-3 text-[#9e4733]" /> Multi-turn Voice AI
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#faf8f5] border border-[#e6e2d6] text-[#1a1918] font-medium">
                      <CheckCircle2 className="h-3 w-3 text-[#2e6930]" /> Auto-transcription
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#faf8f5] border border-[#e6e2d6] text-[#1a1918] font-medium">
                      <Activity className="h-3 w-3 text-[#8a6519]" /> Real-time Sentiment
                    </span>
                  </div>

                  {/* Agent Stats */}
                  <div className="grid grid-cols-3 gap-2 py-3 px-4 bg-[#faf9f7] rounded-sm border border-[#f0ece4] text-center">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider">Total Calls</div>
                      <div className="font-serif text-xl font-bold text-[#1a1918] mt-0.5">{agent.stats?.totalCalls || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider">Minutes</div>
                      <div className="font-serif text-xl font-bold text-[#1a1918] mt-0.5">{agent.stats?.totalMinutes || 0}m</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider">Positive</div>
                      <div className="font-serif text-xl font-bold text-[#2e6930] mt-0.5">{agent.stats?.satisfactionRate || 100}%</div>
                    </div>
                  </div>

                  {/* Forward webhook status if any */}
                  {agent.forward_webhook_url && (
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-[10px] uppercase tracking-wider text-[#73706b]">Connected Webhook Relay</div>
                      <div className="font-mono text-[11px] text-[#1a1918] truncate bg-[#faf8f5] p-2 rounded-sm border border-[#e6e2d6]">
                        {agent.forward_webhook_url}
                      </div>
                    </div>
                  )}
                </CardContent>
              </div>

              <div className="p-4 border-t border-[#f0ece4] bg-[#faf9f7]/50 flex items-center justify-between text-xs text-[#73706b]">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#9e4733]" /> Ready to handle inbound & outbound calls
                </span>
                <span className="font-mono text-[11px]">
                  Created {new Date(agent.created_at).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>

        {agents.length === 0 && (
          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm p-12 text-center shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <Bot className="h-12 w-12 text-[#a09c93] mx-auto mb-4" />
            <h3 className="font-serif text-xl font-bold text-[#1a1918]">No Voice Agents Assigned Yet</h3>
            <p className="text-sm text-[#73706b] max-w-md mx-auto mt-2">
              Your BerinAgents voice assistant is currently being set up. Contact your agency account manager to configure your phone numbers and prompts.
            </p>
          </Card>
        )}

      </div>
    </div>
  )
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#73706b]">Loading agents...</div>}>
      <AgentsContent />
    </Suspense>
  )
}
