'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

export default function AdminDashboard() {
  const [clients, setClients] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [billingRate, setBillingRate] = useState('0.50')
  const [retainer, setRetainer] = useState('500')
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    if (data) setClients(data)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleInviteClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          company_name: companyName,
          billing_rate: parseFloat(billingRate),
          monthly_retainer: parseFloat(retainer)
        })
      })

      const json = await res.json()
      if (res.ok) {
        toast.success("Client invité avec succès ! Un email lui a été envoyé.")
        setEmail('')
        setCompanyName('')
        fetchClients()
      } else {
        toast.error("Erreur: " + json.error)
      }
    } catch (err: any) {
      toast.error("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Espace Administrateur</h1>
          <Button variant="outline" onClick={handleLogout}>Déconnexion</Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Ajouter un client (Pod)</CardTitle>
              <CardDescription>Invitez un client à rejoindre le tableau de bord.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInviteClient} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom de l'entreprise</Label>
                  <Input required value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label>Email du client</Label>
                  <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@acme.com" />
                </div>
                <div className="space-y-2">
                  <Label>Tarif par minute (€)</Label>
                  <Input required type="number" step="0.01" value={billingRate} onChange={e => setBillingRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Forfait mensuel (€)</Label>
                  <Input required type="number" step="1" value={retainer} onChange={e => setRetainer(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Invitation en cours...' : 'Inviter le client'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Clients actifs</CardTitle>
              <CardDescription>Gérez les clients et leurs agents assignés.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Tarif/min</TableHead>
                    <TableHead>Forfait</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map(client => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.company_name}</TableCell>
                      <TableCell>{client.billing_rate_per_min} €</TableCell>
                      <TableCell>{client.monthly_retainer} €</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Gérer agents</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {clients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Aucun client pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
