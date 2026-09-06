'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CallPlayer from '@/components/CallPlayer'
import { ArrowUpDown, ChevronDown, ChevronRight, Search, Phone, SmilePlus, Meh, Frown, CreditCard, X, ShieldCheck, Calendar } from 'lucide-react'
import { getSubscriptionStatusAction } from './actions'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type SortKey = 'created_at' | 'duration_secs' | 'cost'
type SortDir = 'asc' | 'desc'
type TimeRange = '24h' | '7d' | '30d' | 'all'

const timeRanges: { key: TimeRange; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'all', label: 'All Time' },
]

export default function ClientDashboard() {
  const [calls, setCalls] = useState<any[]>([])
  const [clientInfo, setClientInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCall, setExpandedCall] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<{
    needsPaymentMethod: boolean, 
    payUrl: string | null,
    cardInfo: { brand: string, last4: string } | null
  }>({ needsPaymentMethod: false, payUrl: null, cardInfo: null })
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

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
      
      if (callsData) setCalls(callsData)
    }
    
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
  }

  // Filter calls by selected time period
  const callsInPeriod = calls.filter(call => {
    if (timeRange === 'all') return true
    if (!call.created_at) return false
    const callTime = new Date(call.created_at).getTime()
    if (isNaN(callTime)) return true
    const now = Date.now()
    const diff = now - callTime

    if (timeRange === '24h') return diff <= 24 * 60 * 60 * 1000 && diff >= -120000
    if (timeRange === '7d') return diff <= 7 * 24 * 60 * 60 * 1000 && diff >= -120000
    if (timeRange === '30d') return diff <= 30 * 24 * 60 * 60 * 1000 && diff >= -120000
    return true
  })

  // Filter + sort
  const filteredCalls = callsInPeriod
    .filter(call => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        (call.call_summary && call.call_summary.toLowerCase().includes(q)) ||
        (call.transcript && call.transcript.toLowerCase().includes(q)) ||
        (call.from_number && call.from_number.includes(q)) ||
        (call.agents?.agent_name && call.agents.agent_name.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => {
      const valA = a[sortKey]
      const valB = b[sortKey]
      if (sortDir === 'asc') return valA > valB ? 1 : -1
      return valA < valB ? 1 : -1
    })

  const totalCost = callsInPeriod.reduce((acc, call) => acc + Number(call.cost || 0), 0)
  const totalSeconds = callsInPeriod.reduce((acc, call) => acc + (call.duration_secs || 0), 0)
  const totalMinutes = totalSeconds / 60
  const avgDurationMinutes = callsInPeriod.length > 0 ? (totalMinutes / callsInPeriod.length).toFixed(1) : '0.0'

  // Chart data sorted chronologically
  const chartMap: Record<string, { label: string; timestamp: number; calls: number }> = {}
  callsInPeriod.forEach(call => {
    if (!call.created_at) return
    const d = new Date(call.created_at)
    if (isNaN(d.getTime())) return

    let key: string
    let label: string
    if (timeRange === '24h') {
      const hourStr = d.getHours().toString().padStart(2, '0') + ':00'
      key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
      label = hourStr
    } else {
      key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    if (!chartMap[key]) {
      chartMap[key] = { label, timestamp: d.getTime(), calls: 0 }
    }
    chartMap[key].calls += 1
  })

  const chartData = Object.values(chartMap)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(item => ({ date: item.label, calls: item.calls }))

  // Sentiment stats
  const sentimentCounts = callsInPeriod.reduce((acc, call) => {
    const s = call.user_sentiment?.toLowerCase()
    if (s === 'positive') acc.positive++
    else if (s === 'negative') acc.negative++
    else acc.neutral++
    return acc
  }, { positive: 0, negative: 0, neutral: 0 })

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

  if (loading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <div className="h-3 w-28 bg-[#e6e2d6] rounded-sm" />
            <div className="h-8 w-64 bg-[#dfdbd2] rounded-sm" />
            <div className="h-4 w-80 bg-[#eae7df] rounded-sm" />
          </div>

          {/* Plan / Payment banner skeleton */}
          <div className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] p-6 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center pb-3 border-b border-[#f0ece4]">
              <div className="h-3 w-24 bg-[#e6e2d6] rounded-sm" />
              <div className="h-4 w-32 bg-[#dfdbd2] rounded-sm" />
            </div>
            <div className="flex justify-between items-center pt-1">
              <div className="space-y-1.5">
                <div className="h-2.5 w-28 bg-[#e6e2d6] rounded-sm" />
                <div className="h-4 w-48 bg-[#eae7df] rounded-sm" />
              </div>
              <div className="h-9 w-28 bg-[#e6e2d6] rounded-sm" />
            </div>
          </div>

          {/* Chart Skeleton */}
          <div className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] p-6 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center">
              <div className="space-y-1.5">
                <div className="h-2.5 w-24 bg-[#e6e2d6] rounded-sm" />
                <div className="h-5 w-40 bg-[#dfdbd2] rounded-sm" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-16 bg-[#eae7df] rounded-sm" />
                <div className="h-8 w-16 bg-[#eae7df] rounded-sm" />
                <div className="h-8 w-16 bg-[#eae7df] rounded-sm" />
              </div>
            </div>
            <div className="h-56 w-full bg-[#f6f4f0]/80 rounded-sm flex items-end justify-between px-6 py-4 gap-2">
              {[35, 60, 25, 75, 45, 65, 40, 85, 55, 70, 50, 80].map((h, i) => (
                <div key={i} className="flex-1 bg-[#e6e2d6] rounded-t-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          {/* 3 KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] p-6 space-y-3 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center">
                  <div className="h-2.5 w-24 bg-[#e6e2d6] rounded-sm" />
                  <div className="h-4 w-4 bg-[#e6e2d6] rounded-sm" />
                </div>
                <div className="h-8 w-28 bg-[#dfdbd2] rounded-sm" />
                <div className="h-3 w-36 bg-[#eae7df] rounded-sm" />
              </div>
            ))}
          </div>

          {/* Table Skeleton */}
          <div className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="p-6 border-b border-[#f0ece4] flex justify-between items-center">
              <div className="space-y-1.5">
                <div className="h-2.5 w-20 bg-[#e6e2d6] rounded-sm" />
                <div className="h-5 w-36 bg-[#dfdbd2] rounded-sm" />
              </div>
              <div className="h-9 w-64 bg-[#eae7df] rounded-sm" />
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#f6f4f0]">
                  <div className="h-4 w-28 bg-[#e6e2d6] rounded-sm" />
                  <div className="h-4 w-20 bg-[#eae7df] rounded-sm" />
                  <div className="h-4 w-16 bg-[#e6e2d6] rounded-sm" />
                  <div className="h-4 w-16 bg-[#dfdbd2] rounded-sm" />
                  <div className="h-6 w-16 bg-[#eae7df] rounded-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Payment Method Required Popup Modal */}
      {showPaymentModal && (paymentStatus.needsPaymentMethod || !paymentStatus.cardInfo) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1918]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-[500px] bg-[#ffffff] border border-[#e6e2d6] rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden">
            {/* Close button */}
            <button 
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 p-1.5 text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5] rounded-sm transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-8 space-y-6">
              {/* Header */}
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

              {/* Plan info box */}
              <div className="bg-[#faf8f5] border border-[#e6e2d6] rounded-sm p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#73706b]">
                  <span className="uppercase tracking-wider text-[10px] font-semibold">Company</span>
                  <span className="font-semibold text-[#1a1918]">{clientInfo?.company_name}</span>
                </div>
                {clientInfo?.billing_rate_per_min > 0 && (
                  <div className="flex justify-between items-center text-[#73706b]">
                    <span className="uppercase tracking-wider text-[10px] font-semibold">Rate per minute</span>
                    <span className="font-mono font-medium text-[#1a1918]">{clientInfo.billing_rate_per_min} € / min</span>
                  </div>
                )}
                {clientInfo?.monthly_retainer > 0 && (
                  <div className="flex justify-between items-center text-[#73706b]">
                    <span className="uppercase tracking-wider text-[10px] font-semibold">Monthly retainer</span>
                    <span className="font-mono font-medium text-[#1a1918]">{clientInfo.monthly_retainer} € / mo</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[11px] text-[#73706b] pt-1.5 border-t border-[#e6e2d6]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#2e6b34] shrink-0" />
                  <span>Secure payment powered by Stripe. Automatic prorated billing.</span>
                </div>
              </div>

              {/* Actions */}
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
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
              <span>•</span> CLIENT PORTAL
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">Welcome, {clientInfo?.company_name}</h1>
            <p className="text-sm text-[#73706b]">Your voice AI assistant performance & call intelligence</p>
          </div>

          {/* Time range selector */}
          <div className="inline-flex items-center gap-1 bg-[#ffffff] border border-[#e6e2d6] rounded-sm p-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)] self-start sm:self-auto">
            <div className="pl-2 pr-1 text-[#73706b]">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            {timeRanges.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTimeRange(t.key)}
                className={`px-3 py-1.5 text-xs font-semibold tracking-wider rounded-sm transition-all ${
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

        {/* Billing Banners */}
        {paymentStatus.needsPaymentMethod || !paymentStatus.cardInfo ? (
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
            {/* Plan Section */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#f0ece4] bg-[#faf8f5]">
              <div className="text-[11px] font-semibold tracking-widest text-[#73706b] uppercase flex items-center gap-1.5">
                <span className="text-[#9e4733]">•</span> YOUR PLAN
              </div>
              <div className="text-sm">
                <span className="font-bold font-serif text-base text-[#1a1918]">{clientInfo?.billing_rate_per_min} €</span>
                <span className="text-xs text-[#73706b] ml-1">per minute</span>
              </div>
            </div>
            
            {/* Payment Method Section */}
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
              <div>
                <Button onClick={handleBillingPortal} className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase px-5 h-9 shadow-none">
                  Update card <span className="ml-1.5 text-[#9e4733] text-[16px] leading-none">•</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Calls Trend Chart */}
        <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
          <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
              <span>•</span> CALL ACTIVITY
            </div>
            <CardTitle className="font-serif text-xl font-bold text-[#1a1918]">Call Volume Trends</CardTitle>
            <CardDescription className="text-xs text-[#73706b]">
              Call activity distribution ({timeRanges.find(t => t.key === timeRange)?.label})
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

        {/* KPIs matching screenshot layout */}
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
              {totalCost.toFixed(2)} €
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

        {/* Customer Sentiment Bar */}
        <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <CardContent className="py-3.5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">
              Customer Sentiment Breakdown <span className="text-[#9e4733] font-normal">• {timeRanges.find(t => t.key === timeRange)?.label}</span>
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


        {/* Calls Table */}
        <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
          <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                  <span>•</span> RECORDS
                </div>
                <CardTitle className="font-serif text-xl font-bold text-[#1a1918]">Call History</CardTitle>
                <CardDescription className="text-xs text-[#73706b]">Detailed audio recordings, transcripts, and AI analysis</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#73706b]" />
                <Input 
                  placeholder="Search calls..." 
                  className="pl-9 h-9 text-xs border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-[#faf8f5] hover:bg-[#faf8f5] border-b border-[#e6e2d6]">
                  <TableHead className="w-10 px-4"></TableHead>
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
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11 text-right px-6">Audio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map(call => (
                  <>
                    <TableRow 
                      key={call.id} 
                      className="cursor-pointer hover:bg-[#faf8f5]/60 border-b border-[#f0ece4] transition-colors"
                      onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                    >
                      <TableCell className="px-4">
                        {expandedCall === call.id 
                          ? <ChevronDown className="h-4 w-4 text-[#1a1918]" /> 
                          : <ChevronRight className="h-4 w-4 text-[#73706b]" />
                        }
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[#1a1918]">
                        {new Date(call.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-[#1a1918]">{call.agents?.agent_name}</TableCell>
                      <TableCell className="font-mono text-xs text-[#73706b]">
                        {call.from_number ? (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-[#9e4733]" /> {call.from_number}</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-[#73706b] font-mono">{formatDuration(call.duration_secs)}</TableCell>
                      <TableCell className="text-xs font-mono font-medium text-[#1a1918]">{Number(call.cost).toFixed(2)} €</TableCell>
                      <TableCell><SentimentBadge sentiment={call.user_sentiment} /></TableCell>
                      <TableCell className="text-right px-6" onClick={e => e.stopPropagation()}>
                        <CallPlayer recordingUrl={call.recording_url} />
                      </TableCell>
                    </TableRow>
                    {expandedCall === call.id && (
                      <TableRow key={`${call.id}-detail`}>
                        <TableCell colSpan={8} className="bg-[#faf9f7]/60 p-0 border-b border-[#e6e2d6]">
                          <div className="p-6 space-y-4 max-w-full overflow-hidden border-l-2 border-[#1a1918] ml-4 my-3 bg-white rounded-sm shadow-sm">
                            {call.call_summary && (
                              <div>
                                <h4 className="text-[10px] font-semibold text-[#9e4733] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                  <span>•</span> Call Summary
                                </h4>
                                <p className="text-xs text-[#2d2d2d] leading-relaxed break-words whitespace-normal">{call.call_summary}</p>
                              </div>
                            )}
                            {call.transcript && (
                              <div>
                                <h4 className="text-[10px] font-semibold text-[#73706b] uppercase tracking-wider mb-1.5">
                                  Complete Transcript
                                </h4>
                                <div className="text-xs bg-[#faf8f5] rounded-sm p-3.5 border border-[#e6e2d6] max-h-60 overflow-y-auto whitespace-pre-wrap break-words font-mono leading-relaxed text-[#1a1918]">
                                  {call.transcript}
                                </div>
                              </div>
                            )}
                            {!call.call_summary && !call.transcript && (
                              <p className="text-xs text-[#73706b] italic">No detailed summary or transcript available for this call.</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
                {filteredCalls.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-[#73706b] py-12 text-sm">
                      {searchQuery
                        ? 'No calls match your search criteria.'
                        : timeRange !== 'all'
                        ? `No calls recorded for this period (${timeRanges.find(t => t.key === timeRange)?.label}).`
                        : 'No calls recorded yet.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
