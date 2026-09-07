'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getClientInvoicesAction, getSubscriptionStatusAction } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, ExternalLink, Download, Receipt, ShieldCheck, Search, Banknote } from 'lucide-react'
import { toast } from 'sonner'

function BillingContent() {
  const searchParams = useSearchParams()
  const queryClientId = searchParams?.get('clientId')
  const [invoices, setInvoices] = useState<any[]>([])
  const [clientInfo, setClientInfo] = useState<any>(null)
  const [currentCycle, setCurrentCycle] = useState<any>(null)
  const [paymentStatus, setPaymentStatus] = useState<{
    needsPaymentMethod: boolean
    payUrl: string | null
    cardInfo: { brand: string; last4: string } | null
  }>({ needsPaymentMethod: false, payUrl: null, cardInfo: null })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [queryClientId])

  const fetchData = async () => {
    setLoading(true)
    const [invRes, subRes] = await Promise.all([
      getClientInvoicesAction(queryClientId || undefined),
      getSubscriptionStatusAction(null)
    ])

    if (invRes.success) {
      setInvoices(invRes.invoices || [])
      setClientInfo(invRes.client || null)
      setCurrentCycle(invRes.currentCycle || null)
    }
    if (subRes) {
      setPaymentStatus(subRes as any)
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
        return <Badge className="bg-[#eef7ee] text-[#2e6930] border border-[#d2ead2] rounded-sm font-medium text-xs shadow-none">Paid</Badge>
      case 'open':
        return <Badge className="bg-[#faf4e6] text-[#8a6519] border border-[#eeddb8] rounded-sm font-medium text-xs shadow-none">Sent / Pending</Badge>
      case 'draft':
        return <Badge className="bg-[#f5f4f0] text-[#73706b] border border-[#e2dfd8] rounded-sm font-medium text-xs shadow-none">Draft</Badge>
      case 'uncollectible':
        return <Badge className="bg-[#fdf2f0] text-[#9e4733] border border-[#f5c6cb] rounded-sm font-medium text-xs shadow-none">Unpaid</Badge>
      case 'void':
        return <Badge className="bg-[#f5f4f0] text-[#8c8880] border border-[#e2dfd8] rounded-sm font-medium text-xs shadow-none">Void</Badge>
      default:
        return <Badge className="rounded-sm font-medium text-xs shadow-none capitalize">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-[#e6e2d6] rounded-sm" />
            <div className="h-8 w-64 bg-[#dfdbd2] rounded-sm" />
            <div className="h-4 w-96 bg-[#eae7df] rounded-sm" />
          </div>
          <div className="h-36 bg-white border border-[#e6e2d6] rounded-sm p-6" />
          <div className="h-80 bg-white border border-[#e6e2d6] rounded-sm p-6" />
        </div>
      </div>
    )
  }

  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((acc, i) => acc + (i.amount_paid || 0), 0)

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
              <span>•</span> COMMERCIAL & INVOICING
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">Billing & Invoices</h1>
            <p className="text-sm text-[#73706b]">
              Manage your subscription rate, payment card, and downloadable tax invoices
            </p>
          </div>
          <Button 
            onClick={handleUpdatePaymentMethod}
            className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 shadow-none flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <CreditCard className="h-4 w-4 text-[#9e4733]" />
            Manage Stripe Billing <span className="text-[#9e4733]">•</span>
          </Button>
        </div>

        {/* Plan & Payment Card Banner */}
        <div className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] shadow-[0_4px_24px_rgba(0,0,0,0.02)] text-[#1a1918] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#f0ece4] bg-[#faf8f5]">
            <div className="text-[11px] font-semibold tracking-widest text-[#73706b] uppercase flex items-center gap-1.5">
              <span className="text-[#9e4733]">•</span> YOUR PLAN & RATES
            </div>
            <div className="text-sm">
              <span className="font-bold font-serif text-base text-[#1a1918]">${clientInfo?.billing_rate_per_min || 0}</span>
              <span className="text-xs text-[#73706b] ml-1">per billable minute</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#f0ece4] p-6 gap-6 md:gap-0">
            <div className="md:pr-6 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Monthly Retainer</div>
              <div className="font-serif text-2xl font-bold text-[#1a1918]">
                ${clientInfo?.monthly_retainer || 0} <span className="text-xs font-normal text-[#73706b]">/ month</span>
              </div>
              <p className="text-xs text-[#73706b]">Base platform & dedicated voice infrastructure</p>
            </div>

            <div className="md:px-6 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Payment Method</div>
              {paymentStatus.cardInfo ? (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#9e4733]" />
                  <span className="font-medium capitalize text-sm text-[#1a1918]">{paymentStatus.cardInfo.brand}</span>
                  <span className="font-mono text-sm text-[#1a1918]">•••• {paymentStatus.cardInfo.last4}</span>
                </div>
              ) : (
                <div className="text-xs text-[#9e4733] font-medium">No active card on file</div>
              )}
              <p className="text-xs text-[#73706b]">Billed automatically each month via Stripe</p>
            </div>

            <div className="md:pl-6 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Lifetime Invoiced</div>
              <div className="font-serif text-2xl font-bold text-[#2e6930]">
                ${totalPaid.toFixed(2)}
              </div>
              <p className="text-xs text-[#73706b] flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#2e6930]" /> Encrypted & secure checkout
              </p>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
          <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                <span>•</span> INVOICE LEDGER
              </div>
              <CardTitle className="font-serif text-xl font-bold text-[#1a1918]">Past Invoices & Receipts</CardTitle>
              <CardDescription className="text-xs text-[#73706b]">Itemized statements generated for your account</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#73706b]" />
              <input
                type="text"
                placeholder="Search invoice number..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#e2dfd8] rounded-sm text-[#1a1918] placeholder:text-[#a09d96] focus:outline-none focus:border-[#1a1918]"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e6e2d6] bg-[#faf8f5] hover:bg-[#faf8f5]">
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold h-11 px-6">Invoice #</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold h-11">Date</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold h-11">Period</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold h-11">Amount Paid</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold h-11">Status</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold h-11 text-right px-6">Downloads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="border-b border-[#f0ece4] hover:bg-[#faf8f5]/60 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-[#1a1918] px-6">
                      {inv.number}
                    </TableCell>
                    <TableCell className="text-xs text-[#55524d]">
                      {new Date(inv.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-xs text-[#73706b] font-mono">
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
                          <Button variant="outline" size="sm" className="border-[#e2dfd8] bg-white hover:bg-[#f6f4f0] text-[#1a1918] rounded-sm text-xs shadow-none h-8 px-2.5">
                            <ExternalLink className="h-3.5 w-3.5 mr-1 text-[#9e4733]" />
                            View
                          </Button>
                        </a>
                      )}
                      {inv.invoice_pdf && (
                        <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5] rounded-sm text-xs h-8 px-2.5">
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
                    <TableCell colSpan={6} className="text-center text-[#73706b] py-12 text-sm">
                      {searchQuery ? 'No invoices match your search.' : 'No invoices generated yet. Your invoices will appear here after your first billing cycle.'}
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

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#73706b]">Loading billing records...</div>}>
      <BillingContent />
    </Suspense>
  )
}
