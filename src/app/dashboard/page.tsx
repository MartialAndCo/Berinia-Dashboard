'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import CallPlayer from '@/components/CallPlayer'
import { 
  ArrowUpDown, ChevronDown, ChevronRight, Search, Phone, 
  SmilePlus, Meh, Frown, CreditCard, X, ShieldCheck, Calendar, 
  Download, Copy, Tag, MessageSquare, Bot, User, Check, 
  ChevronLeft, SlidersHorizontal, RefreshCw 
} from 'lucide-react'
import { getSubscriptionStatusAction, updateCallMetadataAction } from './actions'
import { getClientDashboardAction, getClientsListAction } from '@/app/admin/actions'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'

type SortKey = 'created_at' | 'duration_secs' | 'cost'
type SortDir = 'asc' | 'desc'
type TimeRange = '24h' | '7d' | '30d' | 'all' | 'custom'

const timeRanges: { key: TimeRange; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
]

const COMMON_TAGS = ['Follow-up', 'Qualified', 'Complaint', 'Urgent', 'Reviewed']

function ClientDashboardContent() {
  const [calls, setCalls] = useState<any[]>([])
  const [clientInfo, setClientInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdminView, setIsAdminView] = useState(false)
  const [expandedCall, setExpandedCall] = useState<string | null>(null)
  
  // Sorting & Filtering
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('all')
  const [selectedSentiment, setSelectedSentiment] = useState('all')
  const [minDurationSecs, setMinDurationSecs] = useState<number>(0)

  // Pagination (Item #3)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Call Notes & Tags editing state (Item #12)
  const [callNotes, setCallNotes] = useState<Record<string, string>>({})
  const [callTags, setCallTags] = useState<Record<string, string[]>>({})
  const [savingCallMeta, setSavingCallMeta] = useState<string | null>(null)

  // Payment Status & Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<{
    needsPaymentMethod: boolean
    payUrl: string | null
    cardInfo: { brand: string; last4: string } | null
  }>({ needsPaymentMethod: false, payUrl: null, cardInfo: null })

  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClientId = searchParams?.get('clientId')

  useEffect(() => {
    fetchData()
  }, [queryClientId])

  // Real-time call streaming via Supabase Realtime channel (Item #8)
  useEffect(() => {
    if (!clientInfo?.id) return

    const channel = supabase
      .channel(`client_calls_stream_${clientInfo.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `client_id=eq.${clientInfo.id}`
        },
        (payload) => {
          toast.info("Incoming call logged!", {
            description: `Duration: ${payload.new.duration_secs || 0}s`,
          })
          // Prepend new call to list
          setCalls(prev => [payload.new, ...prev.filter(c => c.id !== payload.new.id)])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `client_id=eq.${clientInfo.id}`
        },
        (payload) => {
          setCalls(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientInfo?.id])

  const fetchData = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const user = session.user
    const isUserAdmin = user.email?.toLowerCase() === 'admin@berinia.com' ||
      user.app_metadata?.role === 'admin' ||
      user.user_metadata?.role === 'admin'

    if (isUserAdmin) {
      setIsAdminView(true)
      let targetId = queryClientId
      if (!targetId && typeof window !== 'undefined') {
        targetId = sessionStorage.getItem('admin_selected_client_id')
      }

      if (!targetId) {
        const clientListRes = await getClientsListAction()
        if (clientListRes.success && clientListRes.clients && clientListRes.clients.length > 0) {
          targetId = clientListRes.clients[0].id
        }
      }

      if (!targetId) {
        router.push('/admin')
        return
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_selected_client_id', targetId)
      }

      if (queryClientId !== targetId) {
        router.replace(`/dashboard?clientId=${targetId}`)
      }

      const dashRes = await getClientDashboardAction(targetId)
      if (dashRes.success && dashRes.client) {
        setClientInfo(dashRes.client)
        const callsList = dashRes.calls || []
        setCalls(callsList)
        initNotesAndTags(callsList)
      } else {
        toast.error("Unable to load client data.")
      }

      setShowPaymentModal(false)
      setPaymentStatus({ needsPaymentMethod: false, payUrl: null, cardInfo: null })
      setLoading(false)
      return
    }

    // Regular client flow
    setIsAdminView(false)
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    
    if (client) {
      setClientInfo(client)
      
      const isDemo = client.status === 'Demo' || client.email === 'account@test.com'

      if (isDemo) {
        setPaymentStatus({
          needsPaymentMethod: false,
          payUrl: null,
          cardInfo: { brand: 'visa', last4: '4242' }
        })
        setShowPaymentModal(false)
      } else if (client.stripe_subscription_id) {
        const pStatus = await getSubscriptionStatusAction(client.stripe_subscription_id)
        setPaymentStatus(pStatus as any)
        if (pStatus?.needsPaymentMethod || !pStatus?.cardInfo) {
          setShowPaymentModal(true)
        }
      } else {
        setShowPaymentModal(true)
      }

      const { data: callsData } = await supabase
        .from('calls')
        .select(`*, agents(agent_name)`)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
      
      if (callsData) {
        setCalls(callsData)
        initNotesAndTags(callsData)
      }
    }
    
    setLoading(false)
  }

  const initNotesAndTags = (callsList: any[]) => {
    const notesMap: Record<string, string> = {}
    const tagsMap: Record<string, string[]> = {}
    callsList.forEach(c => {
      notesMap[c.id] = c.notes || ''
      tagsMap[c.id] = Array.isArray(c.tags) ? c.tags : []
    })
    setCallNotes(notesMap)
    setCallTags(tagsMap)
  }

  const handleBillingPortal = async () => {
    if (clientInfo?.status === 'Demo' || clientInfo?.email === 'account@test.com') {
      return
    }
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientInfo.id })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Sorting
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setCurrentPage(1)
  }

  // Unique agents for dropdown filter
  const uniqueAgents = useMemo(() => {
    const map = new Map<string, string>()
    calls.forEach(c => {
      if (c.agent_id && c.agents?.agent_name) {
        map.set(c.agent_id, c.agents.agent_name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [calls])

  // Filter calls by time period (including custom range)
  const callsInPeriod = useMemo(() => {
    return calls.filter(call => {
      if (!call.created_at) return false
      const callTime = new Date(call.created_at).getTime()
      if (isNaN(callTime)) return true

      if (timeRange === 'all') return true

      if (timeRange === 'custom') {
        const start = customStartDate ? new Date(customStartDate).getTime() : 0
        const end = customEndDate ? new Date(customEndDate).setHours(23, 59, 59, 999) : Infinity
        return callTime >= start && callTime <= end
      }

      const now = Date.now()
      const diff = now - callTime

      if (timeRange === '24h') return diff <= 24 * 60 * 60 * 1000 && diff >= -120000
      if (timeRange === '7d') return diff <= 7 * 24 * 60 * 60 * 1000 && diff >= -120000
      if (timeRange === '30d') return diff <= 30 * 24 * 60 * 60 * 1000 && diff >= -120000
      return true
    })
  }, [calls, timeRange, customStartDate, customEndDate])

  // Multi-Filter & Search (Item #11)
  const filteredCalls = useMemo(() => {
    return callsInPeriod
      .filter(call => {
        // Agent filter
        if (selectedAgent !== 'all' && call.agent_id !== selectedAgent) {
          return false
        }
        // Sentiment filter
        if (selectedSentiment !== 'all' && call.user_sentiment?.toLowerCase() !== selectedSentiment.toLowerCase()) {
          return false
        }
        // Min duration filter
        if (minDurationSecs > 0 && (call.duration_secs || 0) < minDurationSecs) {
          return false
        }
        // Search query
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          const tagsStr = (callTags[call.id] || []).join(' ').toLowerCase()
          const notesStr = (callNotes[call.id] || '').toLowerCase()
          return (
            (call.call_summary && call.call_summary.toLowerCase().includes(q)) ||
            (call.transcript && call.transcript.toLowerCase().includes(q)) ||
            (call.from_number && call.from_number.includes(q)) ||
            (call.agents?.agent_name && call.agents.agent_name.toLowerCase().includes(q)) ||
            tagsStr.includes(q) ||
            notesStr.includes(q)
          )
        }
        return true
      })
      .sort((a, b) => {
        const valA = a[sortKey]
        const valB = b[sortKey]
        if (sortDir === 'asc') return valA > valB ? 1 : -1
        return valA < valB ? 1 : -1
      })
  }, [callsInPeriod, selectedAgent, selectedSentiment, minDurationSecs, searchQuery, sortKey, sortDir, callTags, callNotes])

  // Pagination slicing (Item #3)
  const totalPages = Math.max(1, Math.ceil(filteredCalls.length / pageSize))
  const paginatedCalls = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCalls.slice(start, start + pageSize)
  }, [filteredCalls, currentPage, pageSize])

  // KPIs
  const totalCost = callsInPeriod.reduce((acc, call) => acc + Number(call.cost || 0), 0)
  const totalSeconds = callsInPeriod.reduce((acc, call) => acc + (call.duration_secs || 0), 0)
  const totalMinutes = totalSeconds / 60
  const avgDurationMinutes = callsInPeriod.length > 0 ? (totalMinutes / callsInPeriod.length).toFixed(1) : '0.0'

  // Continuous Time-Series Chart Data with 0-fill (Item #14)
  const chartData = useMemo(() => {
    if (callsInPeriod.length === 0) return []

    const now = new Date()

    if (timeRange === '24h') {
      // 24 continuous hourly slots
      const hoursMap: Record<string, { label: string; calls: number }> = {}
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000)
        const hourKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
        const hourLabel = `${d.getHours().toString().padStart(2, '0')}:00`
        hoursMap[hourKey] = { label: hourLabel, calls: 0 }
      }

      callsInPeriod.forEach(call => {
        if (!call.created_at) return
        const d = new Date(call.created_at)
        const hourKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
        if (hoursMap[hourKey]) {
          hoursMap[hourKey].calls += 1
        }
      })
      return Object.values(hoursMap).map(item => ({ date: item.label, calls: item.calls }))
    }

    if (timeRange === '7d' || timeRange === '30d') {
      const numDays = timeRange === '7d' ? 7 : 30
      const daysMap: Record<string, { label: string; calls: number }> = {}
      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        daysMap[dayKey] = { label: dayLabel, calls: 0 }
      }

      callsInPeriod.forEach(call => {
        if (!call.created_at) return
        const d = new Date(call.created_at)
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        if (daysMap[dayKey]) {
          daysMap[dayKey].calls += 1
        }
      })
      return Object.values(daysMap).map(item => ({ date: item.label, calls: item.calls }))
    }

    // Default or All Time
    const genericMap: Record<string, { label: string; timestamp: number; calls: number }> = {}
    callsInPeriod.forEach(call => {
      if (!call.created_at) return
      const d = new Date(call.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!genericMap[key]) {
        genericMap[key] = { label, timestamp: d.getTime(), calls: 0 }
      }
      genericMap[key].calls += 1
    })

    return Object.values(genericMap)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(item => ({ date: item.label, calls: item.calls }))
  }, [callsInPeriod, timeRange])

  // Sentiment counts
  const sentimentCounts = useMemo(() => {
    return callsInPeriod.reduce((acc, call) => {
      const s = call.user_sentiment?.toLowerCase()
      if (s === 'positive') acc.positive++
      else if (s === 'negative') acc.negative++
      else acc.neutral++
      return acc
    }, { positive: 0, negative: 0, neutral: 0 })
  }, [callsInPeriod])

  // CSV Export Function (Item #10)
  const handleExportCSV = () => {
    if (filteredCalls.length === 0) {
      toast.error("No calls to export with current filters.")
      return
    }

    const headers = [
      'Call ID',
      'Date',
      'Time',
      'Agent',
      'Caller Phone',
      'Duration (seconds)',
      'Duration (formatted)',
      'Cost (USD)',
      'Sentiment',
      'Summary',
      'Tags',
      'Internal Notes'
    ]

    const rows = filteredCalls.map(c => {
      const d = new Date(c.created_at)
      const dateStr = d.toLocaleDateString('en-US')
      const timeStr = d.toLocaleTimeString('en-US')
      const tagsStr = (callTags[c.id] || []).join('; ')
      const notesStr = (callNotes[c.id] || '').replace(/"/g, '""')
      const summaryStr = (c.call_summary || '').replace(/"/g, '""')

      return [
        c.retell_call_id || c.id,
        dateStr,
        timeStr,
        `"${(c.agents?.agent_name || 'Agent').replace(/"/g, '""')}"`,
        `"${c.from_number || ''}"`,
        c.duration_secs || 0,
        formatDuration(c.duration_secs || 0),
        Number(c.cost || 0).toFixed(2),
        c.user_sentiment || 'Neutral',
        `"${summaryStr}"`,
        `"${tagsStr}"`,
        `"${notesStr}"`
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `berinagents_calls_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`Exported ${filteredCalls.length} call records to CSV.`)
  }

  // Copy Transcript to clipboard
  const handleCopyTranscript = (transcriptText: string) => {
    if (!transcriptText) return
    navigator.clipboard.writeText(transcriptText)
    toast.success("Transcript copied to clipboard!")
  }

  // Save Call Notes & Tags (Item #12)
  const handleSaveMeta = async (callId: string) => {
    setSavingCallMeta(callId)
    const tags = callTags[callId] || []
    const notes = callNotes[callId] || ''
    const res = await updateCallMetadataAction(callId, tags, notes, queryClientId || undefined)
    if (res.success) {
      toast.success("Call notes and tags saved.")
    } else {
      toast.error("Error saving metadata: " + (res.error || 'Unknown error'))
    }
    setSavingCallMeta(null)
  }

  const toggleTag = (callId: string, tag: string) => {
    const current = callTags[callId] || []
    const exists = current.includes(tag)
    const updated = exists ? current.filter(t => t !== tag) : [...current, tag]
    setCallTags({ ...callTags, [callId]: updated })
  }

  // Privacy Phone Number Masking (Item #17)
  const formatPhone = (phoneNum: string | null) => {
    if (!phoneNum) return '—'
    if (clientInfo?.privacy_mask_phones) {
      // Mask middle digits: +1234567890 -> +1 (***) ***-7890
      if (phoneNum.length > 5) {
        return phoneNum.slice(0, 3) + ' (***) ***-' + phoneNum.slice(-4)
      }
      return '***-****'
    }
    return phoneNum
  }

  const SentimentBadge = ({ sentiment }: { sentiment: string | null }) => {
    if (!sentiment) return <span className="text-xs text-[#73706b]">—</span>
    const s = sentiment.toLowerCase()
    if (s === 'positive') return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium bg-[#eef7ee] text-[#2e6b34] border border-[#d2ead4]">
        <SmilePlus className="h-3 w-3" /> Positive
      </span>
    )
    if (s === 'negative') return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium bg-[#fdf2f0] text-[#9e4733] border border-[#fad4cf]">
        <Frown className="h-3 w-3" /> Negative
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium bg-[#faf4e6] text-[#8c6b1c] border border-[#fae8b8]">
        <Meh className="h-3 w-3" /> Neutral
      </span>
    )
  }

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  // Formatted conversation turn bubbles (Item #9)
  const renderFormattedTranscript = (rawTranscript: string) => {
    if (!rawTranscript) return null
    const lines = rawTranscript.split('\n').filter(l => l.trim().length > 0)

    return (
      <div className="space-y-3 max-h-80 overflow-y-auto pr-2 py-2 w-full max-w-2xl">
        {lines.map((line, idx) => {
          const isAgent = line.startsWith('Agent:')
          const isUser = line.startsWith('User:') || line.startsWith('Customer:') || line.startsWith('Caller:')
          const content = line.replace(/^(Agent|User|Customer|Caller):\s*/i, '')

          if (isAgent) {
            return (
              <div key={idx} className="flex gap-2.5 items-start">
                <div className="h-6 w-6 rounded-full bg-[#1a1918] text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Bot className="h-3.5 w-3.5 text-[#9e4733]" />
                </div>
                <div className="bg-[#faf8f5] border border-[#e6e2d6] rounded-sm rounded-tl-none p-3 text-xs text-[#1a1918] leading-relaxed max-w-[80%] break-words">
                  <div className="text-[9px] uppercase font-bold text-[#9e4733] mb-1">AI Assistant</div>
                  {content}
                </div>
              </div>
            )
          }

          if (isUser) {
            return (
              <div key={idx} className="flex gap-2.5 items-start justify-end">
                <div className="bg-white border border-[#e6e2d6] rounded-sm rounded-tr-none p-3 text-xs text-[#1a1918] leading-relaxed max-w-[80%] shadow-xs break-words">
                  <div className="text-[9px] uppercase font-bold text-[#73706b] mb-1 text-right">Caller</div>
                  {content}
                </div>
                <div className="h-6 w-6 rounded-full bg-[#f0ede6] text-[#73706b] flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <User className="h-3.5 w-3.5" />
                </div>
              </div>
            )
          }

          return (
            <div key={idx} className="text-xs text-[#73706b] italic font-mono bg-[#faf8f5] p-2 rounded-sm border border-[#f0ece4] break-words">
              {line}
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  const isFiltersActive = selectedAgent !== 'all' || selectedSentiment !== 'all' || minDurationSecs > 0 || searchQuery !== '' || timeRange !== 'all'

  return (
    <div className="p-4 sm:p-8">
      {/* Payment Method Required Popup Modal */}
      {!isAdminView && showPaymentModal && (paymentStatus.needsPaymentMethod || !paymentStatus.cardInfo) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1918]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-[500px] bg-[#ffffff] border border-[#e6e2d6] rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden">
            <button 
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 p-1.5 text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5] rounded-sm transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-3">
                  <div className="h-12 w-12 rounded-full bg-[#fdf2f0] border border-[#fad4cf] flex items-center justify-center text-[#9e4733]">
                    <CreditCard className="h-6 w-6" />
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
                  <span>•</span> ACCOUNT ACTIVATION
                </div>
                <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1a1918]">
                  Add your payment method
                </h2>
                <p className="text-sm text-[#73706b] leading-relaxed">
                  To activate your AI voice agents and enable live calling, please add a payment card.
                </p>
              </div>

              <div className="bg-[#faf8f5] border border-[#e6e2d6] rounded-sm p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#73706b]">
                  <span className="uppercase tracking-wider text-[10px] font-semibold">Company</span>
                  <span className="font-semibold text-[#1a1918]">{clientInfo?.company_name}</span>
                </div>
                {clientInfo?.billing_rate_per_min > 0 && (
                  <div className="flex justify-between items-center text-[#73706b]">
                    <span className="uppercase tracking-wider text-[10px] font-semibold">Rate per minute</span>
                    <span className="font-mono font-medium text-[#1a1918]">${clientInfo.billing_rate_per_min} / min</span>
                  </div>
                )}
                {clientInfo?.monthly_retainer > 0 && (
                  <div className="flex justify-between items-center text-[#73706b]">
                    <span className="uppercase tracking-wider text-[10px] font-semibold">Monthly retainer</span>
                    <span className="font-mono font-medium text-[#1a1918]">${clientInfo.monthly_retainer} / mo</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[11px] text-[#73706b] pt-1.5 border-t border-[#e6e2d6]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#2e6b34] shrink-0" />
                  <span>Secure payment powered by Stripe. Automatic prorated billing.</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                {paymentStatus.payUrl ? (
                  <a href={paymentStatus.payUrl} className="block w-full">
                    <Button className="w-full bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm h-12 text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-none">
                      <CreditCard className="h-4 w-4" />
                      Add card now <span className="text-[#9e4733] text-[16px] leading-none">•</span>
                    </Button>
                  </a>
                ) : (
                  <Button 
                    onClick={handleBillingPortal} 
                    className="w-full bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm h-12 text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-none"
                  >
                    <CreditCard className="h-4 w-4" />
                    Add card now <span className="text-[#9e4733] text-[16px] leading-none">•</span>
                  </Button>
                )}

                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full py-2 text-xs text-[#73706b] hover:text-[#1a1918] transition-colors underline-offset-4 hover:underline uppercase tracking-wider font-medium text-center"
                >
                  I&apos;ll do this later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Portal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
              <span>•</span> CLIENT PORTAL
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">Welcome, {clientInfo?.company_name}</h1>
            <p className="text-sm text-[#73706b]">Your voice AI assistant performance & call intelligence</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* CSV Export Action Button (Item #10) */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="border-[#e6e2d6] bg-white hover:bg-[#faf8f5] text-[#1a1918] rounded-sm text-xs font-semibold uppercase tracking-wider h-9 px-3.5 shadow-none flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-[#9e4733]" />
              Export CSV
            </Button>

            {/* Time range selector */}
            <div className="inline-flex items-center gap-1 bg-[#ffffff] border border-[#e6e2d6] rounded-sm p-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <div className="pl-2 pr-1 text-[#73706b]">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              {timeRanges.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setTimeRange(t.key)
                    setCurrentPage(1)
                  }}
                  className={`px-3 py-1 text-xs font-semibold tracking-wider rounded-sm transition-all cursor-pointer ${
                    timeRange === t.key
                      ? 'bg-[#1a1918] text-[#f6f4f0] shadow-sm'
                      : 'text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Date Range Picker (if timeRange === 'custom') */}
        {timeRange === 'custom' && (
          <div className="p-4 bg-[#ffffff] border border-[#e6e2d6] rounded-sm flex flex-wrap items-center gap-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[#73706b] uppercase text-[10px]">Start Date:</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={e => {
                  setCustomStartDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-8 text-xs border-[#e2dfd8] bg-[#faf9f7] rounded-sm"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[#73706b] uppercase text-[10px]">End Date:</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={e => {
                  setCustomEndDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-8 text-xs border-[#e2dfd8] bg-[#faf9f7] rounded-sm"
              />
            </div>
          </div>
        )}

        {/* Plan / Payment Status Banners */}
        {isAdminView ? (
          <div className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] shadow-[0_4px_24px_rgba(0,0,0,0.02)] text-[#1a1918] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#f0ece4] bg-[#faf8f5]">
              <div className="text-[11px] font-semibold tracking-widest text-[#73706b] uppercase flex items-center gap-1.5">
                <span className="text-[#9e4733]">•</span> CLIENT PLAN CONFIGURATION
              </div>
              <div className="text-sm">
                <span className="font-bold font-serif text-base text-[#1a1918]">${clientInfo?.billing_rate_per_min}</span>
                <span className="text-xs text-[#73706b] ml-1">per minute</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4">
              <div>
                <div className="text-[11px] font-semibold tracking-widest text-[#73706b] uppercase mb-1">
                  RETAINER & BILLING
                </div>
                <div className="text-xs text-[#73706b]">
                  Monthly Retainer: <strong className="text-[#1a1918] font-mono">${clientInfo?.monthly_retainer || 0} / mo</strong> · Status: <span className="font-medium text-[#2e6b34] capitalize">{clientInfo?.status || 'Active'}</span>
                </div>
              </div>
              <div>
                {clientInfo?.id && (
                  <Link href={`/admin/client/${clientInfo.id}`}>
                    <Button className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase px-4 h-9 shadow-none cursor-pointer">
                      Manage Pricing & Agents <span className="ml-1 text-[#9e4733]">•</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : paymentStatus.needsPaymentMethod || !paymentStatus.cardInfo ? (
          <Card className="border border-[#fad4cf] bg-[#fdf2f0] shadow-[0_4px_24px_rgba(0,0,0,0.02)] rounded-sm">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#9e4733] text-sm leading-none">•</span>
                  <h3 className="font-semibold text-[#9e4733] text-xs uppercase tracking-wider">Payment Method Required</h3>
                </div>
                <p className="text-sm text-[#73706b]">No payment method on file. Please add one to enable automatic billing for your voice AI calls.</p>
              </div>
              {paymentStatus.payUrl ? (
                <a href={paymentStatus.payUrl}>
                  <Button className="shrink-0 bg-[#9e4733] hover:bg-[#833827] text-white rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 shadow-none">
                    Add card now <span className="ml-1 text-white/80">•</span>
                  </Button>
                </a>
              ) : (
                <Button onClick={handleBillingPortal} className="shrink-0 bg-[#9e4733] hover:bg-[#833827] text-white rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 shadow-none">
                  Add card now <span className="ml-1 text-white/80">•</span>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] shadow-[0_4px_24px_rgba(0,0,0,0.02)] text-[#1a1918] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#f0ece4] bg-[#faf8f5]">
              <div className="text-[11px] font-semibold tracking-widest text-[#73706b] uppercase flex items-center gap-1.5">
                <span className="text-[#9e4733]">•</span> YOUR PLAN
              </div>
              <div className="text-sm">
                <span className="font-bold font-serif text-base text-[#1a1918]">${clientInfo?.billing_rate_per_min}</span>
                <span className="text-xs text-[#73706b] ml-1">per minute</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4">
              <div>
                <div className="text-[11px] font-semibold tracking-widest text-[#73706b] uppercase mb-1">
                  PAYMENT METHOD
                </div>
                {paymentStatus.cardInfo && (
                  <div className="text-sm flex items-center">
                    <span className="font-medium capitalize text-[#1a1918]">{paymentStatus.cardInfo.brand}</span>
                    <span className="mx-1 text-[#73706b]">
                      {paymentStatus.cardInfo.brand.toLowerCase() === 'link' ? '-' : '••••'}
                    </span>
                    <span className="font-serif font-semibold text-[#1a1918]">{paymentStatus.cardInfo.last4}</span>
                    <span className="text-[#e6e2d6] mx-2">·</span>
                    <span className="text-xs text-[#73706b]">billed automatically each month</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Link href="/dashboard/billing">
                  <Button variant="outline" className="border-[#e6e2d6] bg-white hover:bg-[#faf8f5] text-[#1a1918] rounded-sm text-xs font-semibold tracking-wider uppercase px-4 h-9 shadow-none">
                    View Invoices
                  </Button>
                </Link>
                <Button onClick={handleBillingPortal} className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase px-4 h-9 shadow-none">
                  Update card <span className="ml-1.5 text-[#9e4733] text-[16px] leading-none">•</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Continuous Calls Trend Chart (Item #14) */}
        <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
          <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
              <span>•</span> CALL ACTIVITY TIMELINE
            </div>
            <CardTitle className="font-serif text-xl font-bold text-[#1a1918]">Call Volume Trends</CardTitle>
            <CardDescription className="text-xs text-[#73706b]">
              Continuous call distribution ({timeRanges.find(t => t.key === timeRange)?.label})
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] pt-6">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e2d6" />
                  <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} stroke="#73706b" />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#73706b" />
                  <Tooltip 
                    cursor={{ fill: '#faf8f5' }} 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e6e2d6', 
                      borderRadius: '2px', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="calls" name="Calls" fill="#1a1918" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#73706b] text-xs">
                Not enough call data to display trend chart for this period.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4 KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] divide-y sm:divide-y-0 sm:divide-x divide-[#f0ece4] overflow-hidden">
          <div className="p-6 space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Total Calls</div>
            <div className="font-serif text-3xl sm:text-4xl font-bold text-[#1a1918]">
              {callsInPeriod.length}
            </div>
            <p className="text-xs text-[#73706b]">completed calls</p>
          </div>
          <div className="p-6 space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Total Minutes</div>
            <div className="font-serif text-3xl sm:text-4xl font-bold text-[#1a1918]">
              {totalMinutes.toFixed(1)}
            </div>
            <p className="text-xs text-[#73706b]">billable minutes</p>
          </div>
          <div className="p-6 space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Total Billed</div>
            <div className="font-serif text-3xl sm:text-4xl font-bold text-[#9e4733]">
              ${totalCost.toFixed(2)}
            </div>
            <p className="text-xs text-[#73706b]">usage revenue</p>
          </div>
          <div className="p-6 space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Avg. Duration</div>
            <div className="font-serif text-3xl sm:text-4xl font-bold text-[#1a1918]">
              {avgDurationMinutes} <span className="font-serif font-normal text-2xl text-[#1a1918] ml-0.5">min</span>
            </div>
            <p className="text-xs text-[#73706b]">per completed call</p>
          </div>
        </div>

        {/* Unified Calls Filter Bar */}
        <div className="bg-white border border-[#e6e2d6] rounded-sm p-4 space-y-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f0ece4]">
            {/* Sentiment Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold tracking-[0.2em] text-[#73706b] uppercase flex items-center gap-1.5 mr-1">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#9e4733]" /> Sentiment:
              </span>
              
              <button
                type="button"
                onClick={() => {
                  setSelectedSentiment('all')
                  setCurrentPage(1)
                }}
                className={`text-xs font-semibold px-2.5 py-1 rounded-sm border cursor-pointer transition-all ${
                  selectedSentiment === 'all'
                    ? 'bg-[#1a1918] text-[#f6f4f0] border-[#1a1918]'
                    : 'bg-[#faf8f5] text-[#73706b] border-[#e6e2d6] hover:text-[#1a1918]'
                }`}
              >
                All ({callsInPeriod.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedSentiment(selectedSentiment === 'positive' ? 'all' : 'positive')
                  setCurrentPage(1)
                }}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-sm border cursor-pointer transition-all ${
                  selectedSentiment === 'positive' 
                    ? 'bg-[#2e6b34] text-white border-[#2e6b34]' 
                    : 'bg-[#eef7ee] text-[#2e6b34] border-[#d2ead4] hover:bg-[#e2f2e2]'
                }`}
              >
                <SmilePlus className="h-3.5 w-3.5" /> Positive ({sentimentCounts.positive})
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedSentiment(selectedSentiment === 'neutral' ? 'all' : 'neutral')
                  setCurrentPage(1)
                }}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-sm border cursor-pointer transition-all ${
                  selectedSentiment === 'neutral' 
                    ? 'bg-[#8c6b1c] text-white border-[#8c6b1c]' 
                    : 'bg-[#faf4e6] text-[#8c6b1c] border-[#fae8b8] hover:bg-[#f5ebd2]'
                }`}
              >
                <Meh className="h-3.5 w-3.5" /> Neutral ({sentimentCounts.neutral})
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedSentiment(selectedSentiment === 'negative' ? 'all' : 'negative')
                  setCurrentPage(1)
                }}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-sm border cursor-pointer transition-all ${
                  selectedSentiment === 'negative' 
                    ? 'bg-[#9e4733] text-white border-[#9e4733]' 
                    : 'bg-[#fdf2f0] text-[#9e4733] border-[#fad4cf] hover:bg-[#fce5e2]'
                }`}
              >
                <Frown className="h-3.5 w-3.5" /> Negative ({sentimentCounts.negative})
              </button>
            </div>

            {isFiltersActive && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAgent('all')
                  setSelectedSentiment('all')
                  setMinDurationSecs(0)
                  setSearchQuery('')
                  setTimeRange('all')
                  setCustomStartDate('')
                  setCustomEndDate('')
                  setCurrentPage(1)
                }}
                className="text-xs text-[#9e4733] hover:underline font-medium cursor-pointer self-start sm:self-auto"
              >
                Reset all filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#73706b]" />
              <Input 
                placeholder="Search transcripts, notes, tags..." 
                className="pl-9 h-9 text-xs border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>

            {/* Agent Selector */}
            <select
              value={selectedAgent}
              onChange={e => {
                setSelectedAgent(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9 px-3 text-xs border border-[#e2dfd8] bg-white rounded-sm text-[#1a1918] focus:outline-none"
            >
              <option value="all">All Voice Agents</option>
              {uniqueAgents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            {/* Duration Filter */}
            <select
              value={minDurationSecs}
              onChange={e => {
                setMinDurationSecs(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-9 px-3 text-xs border border-[#e2dfd8] bg-white rounded-sm text-[#1a1918] focus:outline-none"
            >
              <option value={0}>Any Call Length</option>
              <option value={15}>Over 15 seconds</option>
              <option value={60}>Over 1 minute</option>
              <option value={180}>Over 3 minutes</option>
            </select>
          </div>
        </div>

        {/* Calls Section: Table on Desktop, Cards on Mobile (Item #16) */}
        <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
          <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5] flex flex-row items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                <span>•</span> RECORDS ({filteredCalls.length})
              </div>
              <CardTitle className="font-serif text-xl font-bold text-[#1a1918]">Call History</CardTitle>
            </div>
            
            {/* Page Size Selector */}
            <div className="flex items-center gap-2 text-xs text-[#73706b]">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-7 px-2 border border-[#e2dfd8] bg-white rounded-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </CardHeader>

          {/* Desktop Table View */}
          <CardContent className="p-0 hidden md:block">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-[#faf8f5] hover:bg-[#faf8f5] border-b border-[#e6e2d6]">
                  <TableHead className="w-8 px-3"></TableHead>
                  <TableHead className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11" onClick={() => handleSort('created_at')}>
                    <span className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11">Agent</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11">Caller</TableHead>
                  <TableHead className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11" onClick={() => handleSort('duration_secs')}>
                    <span className="flex items-center gap-1">Duration <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11" onClick={() => handleSort('cost')}>
                    <span className="flex items-center gap-1">Cost <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11">Sentiment</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11 text-right px-4">Audio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCalls.map(call => (
                  <>
                    <TableRow 
                      key={call.id} 
                      className="cursor-pointer hover:bg-[#faf8f5]/60 border-b border-[#f0ece4] transition-colors"
                      onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                    >
                      <TableCell className="px-3">
                        {expandedCall === call.id 
                          ? <ChevronDown className="h-4 w-4 text-[#1a1918]" /> 
                          : <ChevronRight className="h-4 w-4 text-[#73706b]" />
                        }
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[#1a1918] whitespace-nowrap">
                        {new Date(call.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-[#1a1918]">{call.agents?.agent_name}</TableCell>
                      <TableCell className="font-mono text-xs text-[#73706b] whitespace-nowrap">
                        {call.from_number ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-[#9e4733]" /> {formatPhone(call.from_number)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-[#73706b] font-mono whitespace-nowrap">{formatDuration(call.duration_secs)}</TableCell>
                      <TableCell className="text-xs font-mono font-medium text-[#1a1918] whitespace-nowrap">${Number(call.cost).toFixed(2)}</TableCell>
                      <TableCell className="whitespace-nowrap"><SentimentBadge sentiment={call.user_sentiment} /></TableCell>
                      <TableCell className="text-right px-4" onClick={e => e.stopPropagation()}>
                        <CallPlayer recordingUrl={call.recording_url} mode="compact" />
                      </TableCell>
                    </TableRow>

                    {expandedCall === call.id && (
                      <TableRow key={`${call.id}-detail`}>
                        <TableCell colSpan={8} className="bg-[#faf9f7]/60 p-0 border-b border-[#e6e2d6]">
                          <div className="p-5 sm:p-6 space-y-5 w-full bg-white border-l-2 border-[#1a1918]">
                            
                            {/* Full Audio Player with scrubber & speed (Item #9) */}
                            {call.recording_url && (
                              <div>
                                <h4 className="text-[10px] font-semibold text-[#73706b] uppercase tracking-wider mb-2">
                                  Recording Player
                                </h4>
                                <CallPlayer recordingUrl={call.recording_url} mode="full" />
                              </div>
                            )}

                            {/* Call Summary */}
                            {call.call_summary && (
                              <div>
                                <h4 className="text-[10px] font-semibold text-[#9e4733] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                  <span>•</span> AI Call Summary
                                </h4>
                                <p className="text-xs text-[#2d2d2d] leading-relaxed bg-[#faf8f5] p-3 rounded-sm border border-[#e6e2d6]">{call.call_summary}</p>
                              </div>
                            )}

                            {/* Formatted Transcript (Item #9) */}
                            {call.transcript && (
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <h4 className="text-[10px] font-semibold text-[#73706b] uppercase tracking-wider">
                                    Conversation Transcript
                                  </h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyTranscript(call.transcript)}
                                    className="h-6 text-[11px] text-[#73706b] hover:text-[#1a1918] flex items-center gap-1"
                                  >
                                    <Copy className="h-3 w-3" /> Copy
                                  </Button>
                                </div>
                                {renderFormattedTranscript(call.transcript)}
                              </div>
                            )}

                            {/* Call Tags & Internal Notes (Item #12) */}
                            <div className="pt-3 border-t border-[#f0ece4] space-y-3">
                              <div>
                                <h4 className="text-[10px] font-semibold text-[#73706b] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                  <Tag className="h-3 w-3" /> Call Tags
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {COMMON_TAGS.map(t => {
                                    const isSelected = (callTags[call.id] || []).includes(t)
                                    return (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => toggleTag(call.id, t)}
                                        className={`px-2.5 py-1 text-[11px] rounded-sm border transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-[#1a1918] text-white border-[#1a1918]'
                                            : 'bg-white text-[#73706b] border-[#e6e2d6] hover:border-[#1a1918]'
                                        }`}
                                      >
                                        {t} {isSelected && '✓'}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>

                              <div>
                                <h4 className="text-[10px] font-semibold text-[#73706b] uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" /> Internal Team Notes
                                </h4>
                                <textarea
                                  value={callNotes[call.id] || ''}
                                  onChange={e => setCallNotes({ ...callNotes, [call.id]: e.target.value })}
                                  placeholder="Write notes or follow-up instructions for this call..."
                                  className="w-full text-xs p-2.5 bg-[#faf8f5] border border-[#e6e2d6] rounded-sm focus:outline-none focus:border-[#1a1918] min-h-[60px]"
                                />
                                <div className="flex justify-end mt-1.5">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveMeta(call.id)}
                                    disabled={savingCallMeta === call.id}
                                    className="bg-[#1a1918] hover:bg-[#2d2d2d] text-white rounded-sm text-xs uppercase tracking-wider h-8 px-4"
                                  >
                                    {savingCallMeta === call.id ? 'Saving...' : 'Save Notes & Tags'}
                                  </Button>
                                </div>
                              </div>
                            </div>

                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
                {filteredCalls.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-[#73706b] py-12 text-sm">
                      {isFiltersActive ? 'No calls match your active filter criteria.' : 'No calls recorded yet.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Mobile Cards View (Item #16) */}
          <div className="md:hidden divide-y divide-[#f0ece4] p-2 space-y-3">
            {paginatedCalls.map(call => (
              <div key={call.id} className="p-4 bg-white border border-[#e6e2d6] rounded-sm space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1a1918]">{call.agents?.agent_name}</span>
                  <SentimentBadge sentiment={call.user_sentiment} />
                </div>
                
                <div className="flex items-center justify-between text-xs font-mono text-[#73706b]">
                  <span>{new Date(call.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{formatDuration(call.duration_secs)} · ${Number(call.cost).toFixed(2)}</span>
                </div>

                {call.from_number && (
                  <div className="text-xs text-[#73706b] flex items-center gap-1 font-mono">
                    <Phone className="h-3 w-3 text-[#9e4733]" /> {formatPhone(call.from_number)}
                  </div>
                )}

                <div className="pt-2 border-t border-[#f0ece4] flex items-center justify-between">
                  <CallPlayer recordingUrl={call.recording_url} mode="compact" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                    className="text-xs text-[#9e4733]"
                  >
                    {expandedCall === call.id ? 'Hide Details' : 'View Details'}
                  </Button>
                </div>

                {expandedCall === call.id && (
                  <div className="pt-3 border-t border-[#e6e2d6] space-y-3 text-xs">
                    {call.call_summary && (
                      <div className="bg-[#faf8f5] p-2.5 rounded-sm border border-[#e6e2d6]">
                        <div className="font-bold text-[9px] uppercase text-[#9e4733] mb-1">Summary</div>
                        <p>{call.call_summary}</p>
                      </div>
                    )}
                    {call.transcript && (
                      <div>
                        <div className="font-bold text-[9px] uppercase text-[#73706b] mb-1">Transcript</div>
                        {renderFormattedTranscript(call.transcript)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {filteredCalls.length === 0 && (
              <div className="py-12 text-center text-sm text-[#73706b]">
                No calls match your active filters.
              </div>
            )}
          </div>

          {/* Pagination Controls Footer (Item #3) */}
          {filteredCalls.length > 0 && (
            <div className="p-4 border-t border-[#e6e2d6] bg-[#faf8f5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#73706b]">
              <div>
                Showing <strong className="text-[#1a1918]">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-[#1a1918]">{Math.min(currentPage * pageSize, filteredCalls.length)}</strong> of{' '}
                <strong className="text-[#1a1918]">{filteredCalls.length}</strong> calls
              </div>
              <div className="flex items-center gap-2 self-center sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs rounded-sm border-[#e6e2d6] bg-white cursor-pointer disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="font-mono text-xs px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 text-xs rounded-sm border-[#e6e2d6] bg-white cursor-pointer disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

        </Card>

      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-8 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="h-3 w-28 bg-[#e6e2d6] rounded-sm" />
          <div className="h-8 w-64 bg-[#dfdbd2] rounded-sm" />
          <div className="h-4 w-80 bg-[#eae7df] rounded-sm" />
        </div>
        <div className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] p-6 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="h-12 w-full bg-[#faf8f5] rounded-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white border border-[#e6e2d6] rounded-sm p-4" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ClientDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ClientDashboardContent />
    </Suspense>
  )
}
