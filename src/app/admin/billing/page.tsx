'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Receipt, Banknote, Euro } from 'lucide-react'
import { getBillingStatsAction } from './actions'

export default function AdminBillingPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [stats, setStats] = useState({ totalCollected: 0, totalSent: 0, totalUnpaid: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    const res = await getBillingStatsAction()
    if (res.success) {
      setInvoices(res.invoices || [])
      setStats(res.stats || { totalCollected: 0, totalSent: 0, totalUnpaid: 0 })
    }
    setLoading(false)
  }

  const filteredInvoices = invoices.filter(inv => {
    const query = searchQuery.toLowerCase()
    return (
      inv.customer_name?.toLowerCase().includes(query) ||
      inv.customer_email?.toLowerCase().includes(query) ||
      inv.number?.toLowerCase().includes(query)
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
        return <Badge className="rounded-sm font-medium text-xs shadow-none">{status}</Badge>
    }
  }

  if (loading) return <div className="p-8 text-sm text-[#73706b]">Loading invoices...</div>

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
            <span>•</span> STRIPE CONNECT
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">Billing & Invoicing</h1>
          <p className="text-sm text-[#73706b]">Track client invoices, collections, and outstanding receivables</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Total Sent (This month)</CardTitle>
              <Receipt className="h-4 w-4 text-[#73706b]" />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-3xl font-bold text-[#1a1918]">{stats.totalSent.toFixed(2)} €</div>
            </CardContent>
          </Card>
          
          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-[#2e6930]">Total Collected (This month)</CardTitle>
              <Banknote className="h-4 w-4 text-[#2e6930]" />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-3xl font-bold text-[#2e6930]">{stats.totalCollected.toFixed(2)} €</div>
            </CardContent>
          </Card>

          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-[#8a6519]">Outstanding (This month)</CardTitle>
              <Euro className="h-4 w-4 text-[#8a6519]" />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-3xl font-bold text-[#8a6519]">{stats.totalUnpaid.toFixed(2)} €</div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
            <div>
              <div className="text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">LEDGER</div>
              <CardTitle className="font-serif text-lg font-bold text-[#1a1918]">Recent Invoices</CardTitle>
              <CardDescription className="text-xs text-[#73706b]">The last 100 invoices generated by Stripe.</CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search client..."
                className="flex h-10 w-full rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/50 px-3 py-2 text-sm placeholder:text-[#a09d96] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1a1918]"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e6e2d6] bg-[#faf8f5] hover:bg-[#faf8f5]">
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold">Invoice #</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold">Client</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold">Date</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold">Amount</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold">Status</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map(inv => (
                  <TableRow key={inv.id} className="border-b border-[#f0ece4] hover:bg-[#faf8f5]/60 transition-colors">
                    <TableCell className="font-mono text-xs text-[#1a1918]">{inv.number || 'Draft'}</TableCell>
                    <TableCell>
                      <div className="font-medium text-[#1a1918]">{inv.customer_name || '-'}</div>
                      <div className="text-xs text-[#73706b]">{inv.customer_email}</div>
                    </TableCell>
                    <TableCell className="text-xs text-[#55524d]">
                      {new Date(inv.created).toLocaleDateString('en-US')}
                    </TableCell>
                    <TableCell className="font-semibold text-[#1a1918]">
                      {inv.amount_due.toFixed(2)} €
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(inv.status)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {inv.hosted_invoice_url && (
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="border-[#e2dfd8] bg-white hover:bg-[#f6f4f0] text-[#1a1918] rounded-sm text-xs shadow-none h-8 px-3">
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Button>
                        </a>
                      )}
                      {inv.invoice_pdf && (
                        <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="text-[#73706b] hover:text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm text-xs h-8 px-2.5">
                            PDF
                          </Button>
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[#73706b] py-8 text-sm">
                      No invoices found.
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
