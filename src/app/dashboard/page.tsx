'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import CallPlayer from '@/components/CallPlayer'

export default function ClientDashboard() {
  const [calls, setCalls] = useState<any[]>([])
  const [clientInfo, setClientInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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

    // Get client info
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    
    if (client) {
      setClientInfo(client)
      // Get calls for this client
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
    } catch (err) {
      console.error(err)
    }
  }

  const totalCost = calls.reduce((acc, call) => acc + Number(call.cost), 0)
  const totalMinutes = calls.reduce((acc, call) => acc + call.duration_secs, 0) / 60

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Bonjour, {clientInfo?.company_name}</h1>
            <p className="text-muted-foreground">Tableau de bord de votre assistant vocal</p>
          </div>
          <div className="space-x-4">
            <Button variant="default" onClick={handleBillingPortal}>Gérer mon abonnement</Button>
            <Button variant="outline" onClick={handleLogout}>Déconnexion</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Volume total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalMinutes.toFixed(1)} <span className="text-xl font-normal text-muted-foreground">min</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Coût à l'usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalCost.toFixed(2)} €</div>
              <p className="text-xs text-muted-foreground mt-1">Au tarif de {clientInfo?.billing_rate_per_min}€/min</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Forfait mensuel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{clientInfo?.monthly_retainer} €</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historique des appels</CardTitle>
            <CardDescription>Tous les appels traités par vos agents vocaux.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Coût</TableHead>
                  <TableHead>Audio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map(call => (
                  <TableRow key={call.id}>
                    <TableCell className="font-medium">
                      {new Date(call.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell>{call.agents?.agent_name}</TableCell>
                    <TableCell>{Math.ceil(call.duration_secs / 60)} min</TableCell>
                    <TableCell>{call.cost} €</TableCell>
                    <TableCell>
                      <CallPlayer recordingUrl={call.recording_url} />
                    </TableCell>
                  </TableRow>
                ))}
                {calls.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Aucun appel enregistré pour le moment.
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
