'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CallPlayer from '@/components/CallPlayer'
import { 
  ArrowUpDown, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  PhoneOutgoing, 
  SmilePlus, 
  Meh, 
  Frown, 
  Calendar, 
  RefreshCw, 
  Bot, 
  Clock, 
  Coins, 
  User, 
  Briefcase, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react'
import dynamic from 'next/dynamic'

const CallsBarChart = dynamic(() => import('@/components/charts/CallsBarChart'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-[#73706b] text-xs animate-pulse">
      Loading chart...
    </div>
  ),
})
import { toast } from 'sonner'
import { getDemoCallsDashboardAction, syncRetellDemoCallsAction } from './actions'
import PageLoading from '@/components/PageLoading'

type SortKey = 'created_at' | 'duration_secs' | 'cost'
type SortDir = 'asc' | 'desc'
type TimeRange = '24h' | '7d' | '30d' | 'all'

const timeRanges: { key: TimeRange; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'all', label: 'All Time' },
]

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs.toString().padStart(2, '0')}s`
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return <span className="text-xs text-[#8c8880]">—</span>
  const s = sentiment.toLowerCase()
  if (s.includes('pos')) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
        <SmilePlus className="w-3 h-3" /> Positive
      </span>
    )
  }
  if (s.includes('neg')) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
        <Frown className="w-3 h-3" /> Negative
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
      <Meh className="w-3 h-3" /> Neutral
    </span>
  )
}

// Module-level cache for instant 0ms tab switching
let cachedDemoData: { calls: any[]; settings: any; configured: boolean } | null = null
let lastDemoFetchTime = 0
const DEMO_CACHE_TTL = 60 * 1000

export default function DemoCallsPage() {
  const [calls, setCalls] = useState<any[]>(() => cachedDemoData?.calls || [])
  const [settings, setSettings] = useState<any>(() => cachedDemoData?.settings || null)
  const [configured, setConfigured] = useState(() => cachedDemoData?.configured ?? true)
  const [loading, setLoading] = useState(() => !cachedDemoData)
  const [syncing, setSyncing] = useState(false)
  const [expandedCall, setExpandedCall] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRange>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (force = false) => {
    const now = Date.now()
    if (!force && cachedDemoData && (now - lastDemoFetchTime < DEMO_CACHE_TTL)) {
      return
    }
    if (!cachedDemoData) {
      setLoading(true)
    }
    const res = await getDemoCallsDashboardAction()
    if (res.success) {
      const payload = {
        calls: res.calls || [],
        settings: res.settings,
        configured: res.configured ?? true,
      }
      cachedDemoData = payload
      lastDemoFetchTime = Date.now()
      setConfigured(payload.configured)
      setSettings(payload.settings)
      setCalls(payload.calls)
    } else {
      toast.error(res.error || 'Failed to load demo calls.')
    }
    setLoading(false)
  }

  const handleSyncRetell = async () => {
    setSyncing(true)
    const toastId = toast.loading('Synchronizing outbound calls from Retell API...')
    const res = await syncRetellDemoCallsAction()
    setSyncing(false)

    if (res.success) {
      toast.success(`Synced ${res.count} outbound call(s) successfully!`, { id: toastId })
      loadData(true)
    } else {
      toast.error(res.error || 'Sync failed.', { id: toastId })
    }
  }

  // Filter calls by time range
  const callsInPeriod = useMemo(() => {
    const now = new Date()
    return calls.filter(call => {
      const callDate = new Date(call.created_at)
      if (timeRange === '24h') {
        return now.getTime() - callDate.getTime() <= 24 * 60 * 60 * 1000
      }
      if (timeRange === '7d') {
        return now.getTime() - callDate.getTime() <= 7 * 24 * 60 * 60 * 1000
      }
      if (timeRange === '30d') {
        return now.getTime() - callDate.getTime() <= 30 * 24 * 60 * 60 * 1000
      }
      return true
    })
  }, [calls, timeRange])

  // Filter calls by search query
  const filteredCalls = useMemo(() => {
    return callsInPeriod
      .filter(call => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        const matchNumber = call.from_number?.toLowerCase().includes(query)
        const matchTranscript = call.transcript?.toLowerCase().includes(query)
        const matchSummary = call.call_summary?.toLowerCase().includes(query)
        const matchLeadName = call.lead?.fullName?.toLowerCase().includes(query)
        const matchBusiness = call.lead?.businessName?.toLowerCase().includes(query)
        const matchAgent = call.agents?.agent_name?.toLowerCase().includes(query)
        return matchNumber || matchTranscript || matchSummary || matchLeadName || matchBusiness || matchAgent
      })
      .sort((a, b) => {
        let valA = a[sortKey]
        let valB = b[sortKey]
        if (sortKey === 'created_at') {
          valA = new Date(valA).getTime()
          valB = new Date(valB).getTime()
        }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1
        if (valA > valB) return sortDir === 'asc' ? 1 : -1
        return 0
      })
  }, [callsInPeriod, searchQuery, sortKey, sortDir])

  // KPI Calculations
  const totalSeconds = callsInPeriod.reduce((acc, c) => acc + (c.duration_secs || 0), 0)
  const totalMinutes = totalSeconds / 60
  const totalCost = callsInPeriod.reduce((acc, c) => acc + (Number(c.retell_cost || c.cost) || 0), 0)
  const avgDurationSeconds = callsInPeriod.length > 0 ? Math.round(totalSeconds / callsInPeriod.length) : 0

  // Sentiment Breakdown
  const sentimentCounts = useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0 }
    callsInPeriod.forEach(c => {
      const s = (c.user_sentiment || '').toLowerCase()
      if (s.includes('pos')) counts.positive++
      else if (s.includes('neg')) counts.negative++
      else counts.neutral++
    })
    return counts
  }, [callsInPeriod])

  // Chart data: Group calls by day
  const chartData = useMemo(() => {
    const dayMap = new Map<string, number>()
    
    // Default days based on timeRange
    const numDays = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 14
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      dayMap.set(key, 0)
    }

    callsInPeriod.forEach(c => {
      const key = new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (dayMap.has(key)) {
        dayMap.set(key, (dayMap.get(key) || 0) + 1)
      } else if (timeRange === 'all') {
        dayMap.set(key, (dayMap.get(key) || 0) + 1)
      }
    })

    return Array.from(dayMap.entries()).map(([date, count]) => ({
      date,
      calls: count
    }))
  }, [callsInPeriod, timeRange])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (loading) {
    return <PageLoading message="Loading Outbound Demo Calls..." />
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
            <span>•</span> DEMO VOICE AGENT CONSOLE
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918] flex items-center gap-2.5">
            <PhoneOutgoing className="w-7 h-7 text-[#9e4733]" />
            Outbound Demo Calls
          </h1>
          <p className="text-sm text-[#73706b]">
            Transcripts, audio recordings, prospect sentiments, and Retell API intelligence for live demos
          </p>
        </div>

        {/* Controls: Time Filter & Sync */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1 bg-[#ffffff] border border-[#e6e2d6] rounded-sm p-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div className="pl-2 pr-1 text-[#73706b]">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            {timeRanges.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTimeRange(t.key)}
                className={`px-3 py-1.5 text-xs font-semibold tracking-wider rounded-sm transition-all cursor-pointer ${
                  timeRange === t.key
                    ? 'bg-[#1a1918] text-[#f6f4f0] shadow-sm'
                    : 'text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Button
            onClick={handleSyncRetell}
            disabled={syncing || !settings?.agent_id}
            className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-4 cursor-pointer"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Sync From Retell <span className="ml-1 text-[#9e4733]">•</span>
          </Button>

          <Link href="/admin/settings">
            <Button
              variant="outline"
              className="border-[#e2dfd8] bg-[#ffffff] text-[#73706b] hover:text-[#1a1918] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-3.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Agent Status Info Bar */}
      <div className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] shadow-[0_4px_24px_rgba(0,0,0,0.02)] text-[#1a1918] overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3.5 border-b border-[#f0ece4] bg-[#faf8f5] gap-2">
          <div className="text-[11px] font-semibold tracking-widest text-[#73706b] uppercase flex items-center gap-2">
            <span className="text-[#9e4733]">•</span> ACTIVE DEMO AGENT
            <span className="font-mono text-[#1a1918] font-bold">
              {settings?.agent_id || 'None selected'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              settings?.enabled && settings?.agent_id
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${settings?.enabled && settings?.agent_id ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {settings?.enabled && settings?.agent_id ? 'Automatic Webhook Active' : 'Setup required in Settings'}
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4 text-xs text-[#73706b]">
          <div>
            Caller ID: <strong className="text-[#1a1918] font-mono">{settings?.from_number || '+19788787155'}</strong> · Direction: <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">Outbound Only</span> · Instant Callback: <strong className="text-[#1a1918]">{settings?.enabled ? 'Enabled' : 'Disabled'}</strong>
          </div>
          <div className="text-[11px]">
            Webhook Target: <span className="font-mono text-[#1a1918]">/api/webhooks/retell</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] divide-y sm:divide-y-0 sm:divide-x divide-[#f0ece4] overflow-hidden">
        <div className="p-6 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] flex items-center gap-1.5">
            <PhoneOutgoing className="w-3.5 h-3.5 text-[#9e4733]" /> Outbound Calls
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#1a1918]">
            {callsInPeriod.length}
          </div>
          <p className="text-xs text-[#73706b]">demo callbacks executed</p>
        </div>

        <div className="p-6 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#73706b]" /> Total Minutes
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#1a1918]">
            {totalMinutes.toFixed(1)}
          </div>
          <p className="text-xs text-[#73706b]">spoken conversation time</p>
        </div>

        <div className="p-6 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-[#9e4733]" /> Retell Cost
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#9e4733]">
            ${totalCost.toFixed(2)}
          </div>
          <p className="text-xs text-[#73706b]">raw Retell AI platform usage</p>
        </div>

        <div className="p-6 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#73706b]" /> Avg. Duration
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#1a1918]">
            {formatDuration(avgDurationSeconds)}
          </div>
          <p className="text-xs text-[#73706b]">per completed outbound call</p>
        </div>
      </div>

      {/* Prospect Sentiment Breakdown */}
      <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <CardContent className="py-3.5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">
            Prospect Sentiment Analysis <span className="text-[#9e4733] font-normal">• {timeRanges.find(t => t.key === timeRange)?.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#2e6b34] bg-[#eef7ee] px-2.5 py-1 rounded-sm border border-[#d2ead4]">
              <SmilePlus className="h-3.5 w-3.5" /> Positive: <span className="font-serif font-bold text-sm ml-0.5">{sentimentCounts.positive}</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#8c6b1c] bg-[#faf4e6] px-2.5 py-1 rounded-sm border border-[#fae8b8]">
              <Meh className="h-3.5 w-3.5" /> Neutral: <span className="font-serif font-bold text-sm ml-0.5">{sentimentCounts.neutral}</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#9e4733] bg-[#fdf2f0] px-2.5 py-1 rounded-sm border border-[#fad4cf]">
              <Frown className="h-3.5 w-3.5" /> Negative: <span className="font-serif font-bold text-sm ml-0.5">{sentimentCounts.negative}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Outbound Calls Volume Trend Chart */}
      <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
        <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
            <span>•</span> ACTIVITY TREND
          </div>
          <CardTitle className="font-serif text-xl font-bold text-[#1a1918]">Outbound Demo Activity</CardTitle>
          <CardDescription className="text-xs text-[#73706b]">
            Distribution of outbound demo calls over time ({timeRanges.find(t => t.key === timeRange)?.label})
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[240px] pt-6">
          <CallsBarChart
            data={chartData}
            name="Outbound Calls"
            emptyMessage="No outbound calls recorded for this period."
            allowDecimals={false}
          />
        </CardContent>
      </Card>

      {/* Calls History Table */}
      <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
        <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                <span>•</span> TRANSCRIPTS & RECORDINGS
              </div>
              <CardTitle className="font-serif text-xl font-bold text-[#1a1918]">
                Outbound Calls Log ({filteredCalls.length})
              </CardTitle>
              <CardDescription className="text-xs text-[#73706b]">
                Click any row to reveal complete conversation transcripts, audio playback, and AI summaries
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#73706b]" />
              <Input 
                placeholder="Search contact, phone, words..." 
                className="pl-9 h-9 text-xs border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {filteredCalls.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8c8880] space-y-2">
              <PhoneOutgoing className="w-8 h-8 text-[#c2beae] mx-auto mb-2 opacity-50" />
              <p className="font-medium text-[#1a1918]">No outbound calls found.</p>
              <p>When leads request a demo on berinagents.com, their calls and transcripts will appear here automatically.</p>
              <Button 
                onClick={handleSyncRetell}
                variant="outline"
                className="mt-3 text-xs border-[#e2dfd8] hover:bg-[#faf8f5]"
              >
                Sync with Retell
              </Button>
            </div>
          ) : (
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-[#faf8f5] hover:bg-[#faf8f5] border-b border-[#e6e2d6]">
                  <TableHead className="w-10 px-4"></TableHead>
                  <TableHead className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11" onClick={() => handleSort('created_at')}>
                    <span className="flex items-center gap-1">Date & Time <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11">Prospect / Contact</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11">Phone Number</TableHead>
                  <TableHead className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11" onClick={() => handleSort('duration_secs')}>
                    <span className="flex items-center gap-1">Duration <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11" onClick={() => handleSort('cost')}>
                    <span className="flex items-center gap-1">Retell Cost <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11">Sentiment</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11 text-right px-6">Audio Recording</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map(call => (
                  <>
                    <TableRow 
                      key={call.id || call.retell_call_id} 
                      className="cursor-pointer hover:bg-[#faf8f5]/60 border-b border-[#f0ece4] transition-colors"
                      onClick={() => setExpandedCall(expandedCall === (call.id || call.retell_call_id) ? null : (call.id || call.retell_call_id))}
                    >
                      <TableCell className="px-4">
                        {expandedCall === (call.id || call.retell_call_id)
                          ? <ChevronDown className="h-4 w-4 text-[#1a1918]" /> 
                          : <ChevronRight className="h-4 w-4 text-[#73706b]" />
                        }
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[#1a1918] whitespace-nowrap">
                        {new Date(call.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                      </TableCell>
                      <TableCell className="text-xs">
                        {call.lead ? (
                          <div>
                            <span className="font-semibold text-[#1a1918]">{call.lead.fullName}</span>
                            {call.lead.businessName && (
                              <span className="text-[11px] text-[#73706b] block">{call.lead.businessName}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#73706b] italic">Direct Outbound</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#1a1918] whitespace-nowrap">
                        {call.from_number ? (
                          <span className="flex items-center gap-1">
                            <PhoneOutgoing className="h-3 w-3 text-[#9e4733]" /> {call.from_number}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-[#73706b] font-mono whitespace-nowrap">
                        {formatDuration(call.duration_secs)}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium text-[#1a1918] whitespace-nowrap">
                        ${Number(call.retell_cost || call.cost || 0).toFixed(3)}
                      </TableCell>
                      <TableCell>
                        <SentimentBadge sentiment={call.user_sentiment} />
                      </TableCell>
                      <TableCell className="text-right px-6" onClick={e => e.stopPropagation()}>
                        <CallPlayer recordingUrl={call.recording_url} />
                      </TableCell>
                    </TableRow>

                    {expandedCall === (call.id || call.retell_call_id) && (
                      <TableRow key={`${call.id || call.retell_call_id}-detail`}>
                        <TableCell colSpan={8} className="bg-[#faf9f7]/60 p-0 border-b border-[#e6e2d6]">
                          <div className="p-6 space-y-4 max-w-full overflow-hidden border-l-2 border-[#9e4733] ml-4 my-3 bg-white rounded-sm shadow-sm">
                            {/* Contact summary header & direct links */}
                            <div className="flex flex-wrap items-center gap-4 pb-3 border-b border-[#f0ece4] text-xs">
                              {call.lead ? (
                                <>
                                  <span className="flex items-center gap-1.5 text-[#1a1918]">
                                    <User className="w-3.5 h-3.5 text-[#9e4733]" />
                                    <strong>Lead:</strong> {call.lead.fullName}
                                  </span>
                                  {call.lead.businessName && (
                                    <span className="flex items-center gap-1.5 text-[#5a5751]">
                                      <Briefcase className="w-3.5 h-3.5 text-[#73706b]" />
                                      <strong>Business:</strong> {call.lead.businessName}
                                    </span>
                                  )}
                                  {call.lead.email && (
                                    <span className="text-[#73706b]">
                                      <strong>Email:</strong> {call.lead.email}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-[#73706b] italic">Appel Outbound Direct</span>
                              )}

                              <div className="ml-auto flex items-center gap-3">
                                {call.recording_url && (
                                  <a
                                    href={call.recording_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#9e4733]/10 text-[#9e4733] hover:bg-[#9e4733]/20 font-medium text-[11px] transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Lien direct audio
                                  </a>
                                )}
                                {call.retell_call_id && (
                                  <a
                                    href={`https://dashboard.retellai.com/call-detail/${call.retell_call_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f0ece4] text-[#73706b] hover:text-[#1a1918] hover:bg-[#e6e2d6] font-mono text-[11px] transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {call.retell_call_id.length > 18 ? `${call.retell_call_id.slice(0, 18)}...` : call.retell_call_id}
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Summary */}
                            {call.call_summary && (
                              <div>
                                <h4 className="text-[10px] font-semibold text-[#9e4733] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                  <span>•</span> AI Call Summary & What Was Discussed
                                </h4>
                                <p className="text-xs text-[#2d2d2d] leading-relaxed break-words whitespace-normal">
                                  {call.call_summary}
                                </p>
                              </div>
                            )}

                            {/* Full Transcript */}
                            {call.transcript && (
                              <div>
                                <h4 className="text-[10px] font-semibold text-[#73706b] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                  <span>Full Conversation Transcript</span>
                                  <span className="text-[9px] font-mono font-normal text-[#8c8880]">
                                    Word for word AI & Prospect dialog
                                  </span>
                                </h4>
                                <div className="text-xs bg-[#faf8f5] rounded-sm p-4 border border-[#e6e2d6] max-h-72 overflow-y-auto whitespace-pre-wrap break-words font-mono leading-relaxed text-[#1a1918]">
                                  {call.transcript}
                                </div>
                              </div>
                            )}

                            {!call.call_summary && !call.transcript && (
                              <p className="text-xs text-[#73706b] italic">
                                No detailed summary or transcript available for this call.
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
