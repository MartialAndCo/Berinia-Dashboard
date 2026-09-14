'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getClientInvoicesAction, getSubscriptionStatusAction } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, ExternalLink, Download, ShieldCheck, Search, Banknote } from 'lucide-react'
import { toast } from 'sonner'
import PageLoading from '@/components/PageLoading'

// Module-level cache for instant 0ms tab switching
let cachedInvoices: any[] | null = null
let cachedClientInfo: any | null = null
let cachedCurrentCycle: any | null = null
let cachedPaymentStatus: any | null = null

function BillingContent() {
  const searchParams = useSearchParams()
  const queryClientId = searchParams?.get('clientId')
  const [invoices, setInvoices] = useState<any[]>(() => cachedInvoices || [])
  const [clientInfo, setClientInfo] = useState<any>(() => cachedClientInfo || null)
  const [currentCycle, setCurrentCycle] = useState<any>(() => cachedCurrentCycle || null)
  const [paymentStatus, setPaymentStatus] = useState<{
    needsPaymentMethod: boolean
    payUrl: string | null
    cardInfo: { brand: string; last4: string } | null
  }>(() => cachedPaymentStatus || { needsPaymentMethod: false, payUrl: null, cardInfo: null })
  const [loading, setLoading] = useState(() => !cachedInvoices)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [queryClientId])

  const fetchData = async () => {
    if (!cachedInvoices) setLoading(true)
    const invRes = await getClientInvoicesAction(queryClientId || undefined)
    if (invRes.success) {
      cachedInvoices = invRes.invoices || []
      cachedClientInfo = invRes.client || null
      cachedCurrentCycle = invRes.currentCycle || null
      if (invRes.paymentStatus) {
        cachedPaymentStatus = invRes.paymentStatus
        setPaymentStatus(invRes.paymentStatus as any)
      }
      setInvoices(invRes.invoices || [])
      setClientInfo(invRes.client || null)
      setCurrentCycle(invRes.currentCycle || null)
    } else {
      const subRes = await getSubscriptionStatusAction(null, queryClientId || undefined)
      if (subRes) {
        cachedPaymentStatus = subRes
        setPaymentStatus(subRes as any)
      }
    }
    setLoading(false)
  }

  const handleUpdatePaymentMethod = async () => {
    const toastId = toast.loading("Opening secure billing portal...")
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: queryClientId || undefined })
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error("Unable to open portal: " + (data.error || 'Unknown error'), { id: toastId })
      }
    } catch (e: any) {
      toast.error("Error opening billing portal", { id: toastId })
    }
  }

  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      inv.number?.toLowerCase().includes(q) ||
      inv.status?.toLowerCase().includes(q)
    )
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium text-[11px] shadow-none">Paid</Badge>
      case 'open':
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium text-[11px] shadow-none">Sent / Pending</Badge>
      case 'draft':
        return <Badge className="bg-stone-100 text-stone-600 border border-stone-200 rounded-full font-medium text-[11px] shadow-none">Draft</Badge>
      case 'uncollectible':
        return <Badge className="bg-red-50 text-red-700 border border-red-200 rounded-full font-medium text-[11px] shadow-none">Unpaid</Badge>
      case 'void':
        return <Badge className="bg-stone-100 text-stone-500 border border-stone-200 rounded-full font-medium text-[11px] shadow-none">Void</Badge>
      default:
        return <Badge className="rounded-full font-medium text-[11px] shadow-none capitalize">{status}</Badge>
    }
  }

  if (loading) {
    return <PageLoading message="Loading Billing & Invoices..." />
  }

  return (
    <div className="p-3 sm:p-8 space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-36 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9e4733]"></span> COMMERCIAL & INVOICING
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1918]">Billing & Invoices</h1>
          <p className="text-xs sm:text-sm text-[#73706b]">
            Manage your subscription rate, payment card, and downloadable tax invoices
          </p>
        </div>
        <Button 
          onClick={handleUpdatePaymentMethod}
          className="bg-[#1a1918] hover:bg-[#2d2d2d] active:scale-95 text-[#f6f4f0] rounded-xl text-xs font-semibold tracking-wider uppercase h-10 px-5 shadow-sm flex items-center gap-2 cursor-pointer self-start sm:self-auto transition-transform"
        >
          <CreditCard className="h-4 w-4 text-[#9e4733]" />
          Manage Stripe Card
        </Button>
      </div>

      {/* Plan & Payment Card Banner */}
      <div className="rounded-2xl border border-stone-200/80 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.03)] text-[#1a1918] overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-stone-100 bg-stone-50/70">
          <div className="text-[10px] sm:text-[11px] font-semibold tracking-widest text-[#73706b] uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9e4733]"></span> YOUR PLAN & RATES
          </div>
          <div className="text-xs sm:text-sm">
            <span className="font-bold font-serif text-sm sm:text-base text-[#1a1918]">${clientInfo?.billing_rate_per_min || 0}</span>
            <span className="text-[11px] sm:text-xs text-[#73706b] ml-1">/ billable min</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-100 p-4 sm:p-6 gap-4 md:gap-0">
          <div className="md:pr-6 space-y-1">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Monthly Subscription</div>
            <div className="font-serif text-xl sm:text-2xl font-bold text-[#1a1918]">
              ${clientInfo?.monthly_retainer || 0} <span className="text-xs font-normal text-[#73706b]">/ month</span>
            </div>
            <p className="text-xs text-[#73706b]">Base platform & dedicated voice line infrastructure</p>
          </div>

          <div className="md:pl-6 space-y-1 pt-4 md:pt-0">
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Payment Method</div>
            {paymentStatus.cardInfo ? (
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-[#9e4733]" />
                <span className="font-medium capitalize text-xs sm:text-sm text-[#1a1918]">{paymentStatus.cardInfo.brand}</span>
                <span className="font-mono text-xs sm:text-sm text-[#1a1918]">•••• {paymentStatus.cardInfo.last4}</span>
              </div>
            ) : (
              <div className="text-xs text-[#9e4733] font-medium">No active card on file</div>
            )}
            <p className="text-xs text-[#73706b] flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Billed automatically each month via Stripe
            </p>
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="rounded-2xl border border-stone-200/80 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="border-b border-stone-100 p-4 sm:p-6 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9e4733]"></span> INVOICE LEDGER
            </div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1a1918]">Past Invoices & Receipts</h2>
            <p className="text-xs text-[#73706b]">Itemized statements generated for your account</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search invoice number..."
              className="w-full pl-9 pr-3 py-2 text-base md:text-xs bg-white border border-stone-200 rounded-xl text-[#1a1918] placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Mobile View: Invoice Cards */}
        <div className="block sm:hidden divide-y divide-stone-100">
          {filteredInvoices.map((inv) => (
            <div key={inv.id} className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#1a1918]">{inv.number}</span>
                {getStatusBadge(inv.status)}
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>{new Date(inv.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="font-serif text-base font-bold text-[#1a1918]">${inv.amount_paid.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {inv.hosted_invoice_url && (
                  <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full border-stone-200 bg-stone-50 text-[#1a1918] rounded-xl text-xs h-8">
                      <ExternalLink className="h-3 w-3 mr-1.5 text-[#9e4733]" /> View
                    </Button>
                  </a>
                )}
                {inv.invoice_pdf && (
                  <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full border-stone-200 bg-stone-50 text-[#1a1918] rounded-xl text-xs h-8">
                      <Download className="h-3 w-3 mr-1.5" /> PDF
                    </Button>
                  </a>
                )}
              </div>
            </div>
          ))}

          {filteredInvoices.length === 0 && (
            <div className="p-8 text-center text-xs text-stone-500">
              {searchQuery ? 'No invoices match your search.' : 'No invoices generated yet.'}
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-stone-200 bg-stone-50/50 hover:bg-stone-50/50">
                <TableHead className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold h-11 px-6">Invoice #</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold h-11">Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold h-11">Period</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold h-11">Amount Paid</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold h-11">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold h-11 text-right px-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-[#1a1918] px-6">
                    {inv.number}
                  </TableCell>
                  <TableCell className="text-xs text-stone-600">
                    {new Date(inv.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-xs text-stone-500 font-mono">
                    {inv.period_start && inv.period_end ? (
                      `${new Date(inv.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(inv.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    ) : '—'}
                  </TableCell>
                  <TableCell className="font-semibold text-sm text-[#1a1918] font-mono">
                    ${inv.amount_paid.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(inv.status)}
                  </TableCell>
                  <TableCell className="text-right px-6 space-x-2">
                    {inv.hosted_invoice_url && (
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="border-stone-200 bg-white hover:bg-stone-50 text-[#1a1918] rounded-lg text-xs shadow-none h-8 px-2.5">
                          <ExternalLink className="h-3.5 w-3.5 mr-1 text-[#9e4733]" />
                          View
                        </Button>
                      </a>
                    )}
                    {inv.invoice_pdf && (
                      <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="text-stone-500 hover:text-[#1a1918] hover:bg-stone-100 rounded-lg text-xs h-8 px-2.5">
                          <Download className="h-3.5 w-3.5 mr-1" />
                          PDF
                        </Button>
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-stone-500 py-12 text-sm">
                    {searchQuery ? 'No invoices match your search.' : 'No invoices generated yet.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Safe mobile spacing for lowbar clearance */}
      <div className="h-12 md:hidden" />
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading Billing & Invoices..." />}>
      <BillingContent />
    </Suspense>
  )
}
