'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Users, Euro, TrendingUp, Trash2 } from 'lucide-react'
import { deleteClientAction } from './actions'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

export default function AdminDashboard() {
  const [clients, setClients] = useState<any[]>([])
  const [stats, setStats] = useState({ 
    activeClients: 0, totalClients: 0, mrr: 0, 
    usageRevenue: 0, retellCost: 0, margin: 0, 
    totalCalls: 0, totalMinutes: 0 
  })
  const [clientCallStats, setClientCallStats] = useState<Record<string, { calls: number, revenue: number, retellCost: number }>>({})
  const [chartData, setChartData] = useState<any[]>([])
  
  const router = useRouter()

  useEffect(() => {
    fetchClientsAndStats()
  }, [])

  const fetchClientsAndStats = async () => {
    const { data: clientsData } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    
    const { data: callsData } = await supabase
      .from('calls')
      .select('client_id, cost, retell_cost, duration_secs, created_at')
  
    if (clientsData) {
      setClients(clientsData)
      
      const activeClients = clientsData.filter(c => c.status === 'Actif')
      const totalMRR = activeClients.reduce((acc, c) => acc + Number(c.monthly_retainer), 0)
      
      let totalUsageRevenue = 0
      let totalRetellCost = 0
      let totalCalls = 0
      let totalSeconds = 0
      const perClient: Record<string, { calls: number, revenue: number, retellCost: number }> = {}
      
      // Chart grouping
      const callsByDate: Record<string, number> = {}

      if (callsData) {
        totalCalls = callsData.length
        callsData.forEach(call => {
          totalUsageRevenue += Number(call.cost || 0)
          totalRetellCost += Number(call.retell_cost || 0)
          totalSeconds += Number(call.duration_secs || 0)
          
          // Per-client stats
          if (!perClient[call.client_id]) {
            perClient[call.client_id] = { calls: 0, revenue: 0, retellCost: 0 }
          }
          perClient[call.client_id].calls++
          perClient[call.client_id].revenue += Number(call.cost || 0)
          perClient[call.client_id].retellCost += Number(call.retell_cost || 0)

          // Chart stats
          if (call.created_at) {
            const date = new Date(call.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            callsByDate[date] = (callsByDate[date] || 0) + 1
          }
        })
      }
      
      // Build chart array (last 14 days logic approx by sorting dates if needed, or just what we have)
      const chartArray = Object.entries(callsByDate).map(([date, calls]) => ({ date, calls }))
      
      setChartData(chartArray)
      setClientCallStats(perClient)
      setStats({
        activeClients: activeClients.length,
        totalClients: clientsData.length,
        mrr: totalMRR,
        usageRevenue: totalUsageRevenue,
        retellCost: totalRetellCost,
        margin: totalMRR + totalUsageRevenue - totalRetellCost,
        totalCalls: totalCalls,
        totalMinutes: totalSeconds / 60,
      })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return
    const toastId = toast.loading("Deleting...")
    const res = await deleteClientAction(clientId)
    if (!res.success) {
      toast.error("Error deleting client: " + res.error, { id: toastId })
    } else {
      toast.success("Client deleted successfully", { id: toastId })
      fetchClientsAndStats()
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
              <span>•</span> BERINAGENTS
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">Overview</h1>
            <p className="text-sm text-[#73706b]">Agency command center & performance metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/admin/client/new">
              <Button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-xs font-semibold tracking-wider uppercase transition-all bg-[#1a1918] text-[#f6f4f0] shadow-sm hover:bg-[#2d2d2d] h-11 px-5 py-2">
                <Plus className="h-4 w-4" />
                New Client (Pod) <span className="text-[#9e4733] text-[16px] leading-none">•</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Calls Trend Chart */}
        <Card className="border border-[#e6e2d6] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] bg-[#ffffff] overflow-hidden">
          <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">ANALYTICS</div>
                <CardTitle className="font-serif text-lg font-bold text-[#1a1918]">Call Trends (Last 30 Days)</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[250px] p-6">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e2d6" />
                  <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} stroke="#73706b" />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#73706b" />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }} 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#e6e2d6', 
                      borderRadius: '2px', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
                      fontSize: '12px' 
                    }} 
                  />
                  <Bar dataKey="calls" name="Calls" fill="#1a1918" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Not enough data to display the chart.
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border border-[#e6e2d6] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] bg-[#ffffff]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Active Clients</CardTitle>
              <Users className="h-4 w-4 text-[#73706b]" />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-2xl font-bold text-[#1a1918]">{stats.activeClients}</div>
              <p className="text-xs text-[#73706b] mt-1">{stats.totalClients} total</p>
            </CardContent>
          </Card>
          
          <Card className="border border-[#e6e2d6] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] bg-[#ffffff]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">MRR (Retainers)</CardTitle>
              <Euro className="h-4 w-4 text-[#73706b]" />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-2xl font-bold text-[#1a1918]">{stats.mrr.toFixed(2)} €</div>
              <p className="text-xs text-[#73706b] mt-1">Monthly recurring</p>
            </CardContent>
          </Card>

          <Card className="border border-[#e6e2d6] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] bg-[#ffffff]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Usage Revenue</CardTitle>
              <Euro className="h-4 w-4 text-[#73706b]" />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-2xl font-bold text-[#1a1918]">{stats.usageRevenue.toFixed(2)} €</div>
              <p className="text-xs text-[#73706b] mt-1">{stats.totalCalls} calls / {stats.totalMinutes.toFixed(1)}m</p>
            </CardContent>
          </Card>

          <Card className="border border-[#e6e2d6] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] bg-[#ffffff]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Retell Cost</CardTitle>
              <Euro className="h-4 w-4 text-[#9e4733]" />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-2xl font-bold text-[#9e4733]">{stats.retellCost.toFixed(2)} €</div>
              <p className="text-xs text-[#73706b] mt-1">Actual API cost</p>
            </CardContent>
          </Card>

          <Card className="border border-[#e6e2d6] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] bg-[#ffffff]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-[#73706b]" />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-2xl font-bold text-[#1a1918]">{(stats.mrr + stats.usageRevenue).toFixed(2)} €</div>
              <p className="text-xs text-[#73706b] mt-1">MRR + Usage</p>
            </CardContent>
          </Card>

          <Card className="border border-[#e6e2d6] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] bg-[#ffffff]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-[#2e6930]">Net Margin</CardTitle>
              <TrendingUp className="h-4 w-4 text-[#2e6930]" />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-2xl font-bold text-[#2e6930]">{stats.margin.toFixed(2)} €</div>
              <p className="text-xs text-[#73706b] mt-1">Revenue - Retell Cost</p>
            </CardContent>
          </Card>
        </div>

        {/* Clients Table */}
        <Card className="border border-[#e6e2d6] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] bg-[#ffffff] overflow-hidden">
          <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">PORTFOLIO</div>
                <CardTitle className="font-serif text-lg font-bold text-[#1a1918]">Your Clients</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e6e2d6] bg-[#faf8f5] hover:bg-[#faf8f5]">
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold">Client</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold">Status</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold">Rate/min</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold">Retainer</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold">Calls</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold">Usage Revenue</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold">Retell Cost</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold">Margin</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-[#73706b] font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map(client => (
                  <TableRow key={client.id} className="border-b border-[#f0ece4] hover:bg-[#faf8f5]/60 transition-colors">
                    <TableCell>
                      <div className="font-medium text-[#1a1918]">{client.company_name}</div>
                      <div className="text-xs text-[#73706b]">{client.email || 'No email provided'}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${
                        client.status === 'Actif' || client.status === 'Active' 
                          ? 'bg-[#eef7ee] text-[#2e6930] border border-[#d2ead2]' 
                          : 'bg-[#faf4e6] text-[#8a6519] border border-[#eeddb8]'
                      }`}>
                        {client.status === 'Actif' ? 'Active' : (client.status || 'Active')}
                      </span>
                    </TableCell>
                    <TableCell className="font-serif font-medium text-[#55524d]">{client.billing_rate_per_min} €</TableCell>
                    <TableCell className="font-serif font-medium text-[#55524d]">{client.monthly_retainer} €</TableCell>
                    <TableCell className="font-serif font-medium text-[#55524d]">{clientCallStats[client.id]?.calls || 0}</TableCell>
                    <TableCell className="font-serif font-semibold text-[#1a1918]">{(clientCallStats[client.id]?.revenue || 0).toFixed(2)} €</TableCell>
                    <TableCell className="font-serif font-semibold text-[#9e4733]">{(clientCallStats[client.id]?.retellCost || 0).toFixed(2)} €</TableCell>
                    <TableCell className="font-serif font-semibold text-[#2e6930]">
                      {((clientCallStats[client.id]?.revenue || 0) - (clientCallStats[client.id]?.retellCost || 0)).toFixed(2)} €
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/client/${client.id}`}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-[#e2dfd8] bg-white hover:bg-[#f6f4f0] text-[#1a1918] rounded-sm text-xs font-medium shadow-none h-8 px-3"
                        >
                          Manage client
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {clients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-[#73706b] py-8 text-sm">
                      No clients yet. Create your first pod!
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
