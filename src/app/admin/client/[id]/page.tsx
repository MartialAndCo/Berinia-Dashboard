'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, ShieldAlert, KeyRound, Save, RefreshCw, Eye, ExternalLink, FileText, CheckCircle2, Mic, Globe, Archive } from 'lucide-react'
import { updateClientConfigAction, forceUpdateClientEmailAction, recalculateClientCallsCostAction, deleteClientAction, toggleClientAgentStatusAction, getClientOnboardingDataAction, archiveClientAction } from './actions'
import { addAgentAction, deleteAgentAction, getRetellAgentsAction, updateAgentWebhookAction, syncRetellAgentWebhookAction } from '../../actions'
import { DeleteClientModal } from '@/components/DeleteClientModal'
import PageLoading from '@/components/PageLoading'

export default function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: clientId } = use(params)

  const [client, setClient] = useState<any>(null)
  const [agents, setAgents] = useState<any[]>([])
  const [retellAgents, setRetellAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Edit states
  const [companyName, setCompanyName] = useState('')
  const [billingRate, setBillingRate] = useState('')
  const [retainer, setRetainer] = useState('')
  const [email, setEmail] = useState('')
  
  // New Agent states
  const [newAgentId, setNewAgentId] = useState('')
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentWebhook, setNewAgentWebhook] = useState('')
  const [backfillHistory, setBackfillHistory] = useState(false)
  const [agentWebhooks, setAgentWebhooks] = useState<Record<string, string>>({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [onboardingInfo, setOnboardingInfo] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: clientData } = await supabase.from('clients').select('*').eq('id', clientId).single()
    const { data: agentsData } = await supabase.from('agents').select('*').eq('client_id', clientId)
    const retellRes = await getRetellAgentsAction()
    
    if (clientData) {
      setClient(clientData)
      setCompanyName(clientData.company_name)
      setBillingRate(clientData.billing_rate_per_min)
      setRetainer(clientData.monthly_retainer)
      setEmail(clientData.email || '')

      if (clientData.user_id) {
        const onbRes = await getClientOnboardingDataAction(clientData.user_id)
        if (onbRes.success && onbRes.onboardingData) {
          setOnboardingInfo({
            data: onbRes.onboardingData,
            completed: onbRes.onboardingCompleted,
            airtableFormId: onbRes.airtableFormId
          })
        }
      }
    }
    if (agentsData) {
      setAgents(agentsData)
      const map: Record<string, string> = {}
      agentsData.forEach(a => {
        map[a.id] = a.forward_webhook_url || ''
      })
      setAgentWebhooks(map)
    }
    if (retellRes.success && retellRes.agents) setRetellAgents(retellRes.agents)
    setLoading(false)
  }

  const handleUpdateConfig = async () => {
    const toastId = toast.loading("Updating...")
    const res = await updateClientConfigAction(clientId, {
      company_name: companyName,
      billing_rate_per_min: parseFloat(billingRate),
      monthly_retainer: parseFloat(retainer)
    })
    if (res.success) toast.success("Configuration saved", { id: toastId })
    else toast.error("Error: " + res.error, { id: toastId })
  }

  const handleRecalculatePastCalls = async () => {
    const rateNum = parseFloat(billingRate)
    if (isNaN(rateNum) || rateNum < 0) {
      toast.error("Please enter a valid rate.")
      return
    }

    if (!confirm(`Do you want to recalculate the cost of all past calls for "${companyName || 'this client'}" with the rate of $${rateNum}/min?\n\nThis action will update past call costs for this client.`)) {
      return
    }

    const toastId = toast.loading("Recalculating past calls cost...")
    const res = await recalculateClientCallsCostAction(clientId, rateNum)
    if (res.success) {
      toast.success(`${res.count ?? 0} call(s) recalculated successfully!`, { id: toastId })
      fetchData()
    } else {
      toast.error("Error: " + res.error, { id: toastId })
    }
  }

  const handleUpdateEmail = async () => {
    if (!client.user_id) {
      toast.error("Unable to update: User has not created their account yet.")
      return
    }
    if (!confirm(`Force email change to ${email}?`)) return
    const toastId = toast.loading("Updating...")
    const res = await forceUpdateClientEmailAction(client.user_id, clientId, email)
    if (res.success) toast.success("Email updated successfully!", { id: toastId })
    else toast.error("Error: " + res.error, { id: toastId })
  }

  const handleSendResetPassword = async () => {
    if (!client.email) return toast.error("Client has no email.")
    const toastId = toast.loading("Sending...")
    const res = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: client.email })
    })
    if (res.ok) toast.success("Password reset email sent.", { id: toastId })
    else toast.error("Error sending email", { id: toastId })
  }

  const handleUpdateWebhook = async (agentId: string) => {
    const url = agentWebhooks[agentId] || ''
    const toastId = toast.loading("Saving webhook...")
    const res = await updateAgentWebhookAction(agentId, url)
    if (res.success) {
      toast.success("Forward webhook saved", { id: toastId })
      fetchData()
    } else {
      toast.error("Error: " + res.error, { id: toastId })
    }
  }

  const handleAddAgent = async () => {
    if (!newAgentId) return
    const toastId = toast.loading("Assigning agent...")
    const res = await addAgentAction(clientId, newAgentName, newAgentId, newAgentWebhook, backfillHistory)
    if (res.success) {
      toast.success(backfillHistory ? "Agent assigned with past call history." : "Agent assigned (clean history starting from 0).", { id: toastId })
      setNewAgentId('')
      setNewAgentName('')
      setNewAgentWebhook('')
      setBackfillHistory(false)
      fetchData()
    } else {
      toast.error("Error: " + res.error, { id: toastId })
    }
  }

  const handleArchiveClient = async () => {
    if (!confirm(`Do you want to archive "${client.company_name}"?\n\nThis will suspend their voice agent, cancel any recurring Stripe subscription, and mark them as Lost Client in Airtable.\nTheir past invoices and call logs will remain safely stored for accounting.`)) return
    const toastId = toast.loading("Archiving client account...")
    const res = await archiveClientAction(clientId)
    if (res.success) {
      toast.success("Client account successfully archived.", { id: toastId })
      fetchData()
    } else {
      toast.error("Error archiving client: " + res.error, { id: toastId })
    }
  }

  const handleDeleteClient = async () => {
    const toastId = toast.loading("Deleting client...")
    const res = await deleteClientAction(clientId)
    if (res.success) {
      toast.success("Client deleted successfully.", { id: toastId })
      router.push('/admin')
    } else {
      toast.error("Error: " + res.error, { id: toastId })
    }
  }

  const handleToggleAgentStatus = async (targetStatus: 'Active' | 'Suspended') => {
    const actionLabel = targetStatus === 'Suspended' ? 'suspend' : 'reactivate'
    if (!confirm(`Are you sure you want to ${actionLabel} ${client.company_name}'s voice agent?`)) return

    const toastId = toast.loading(`${targetStatus === 'Suspended' ? 'Suspending' : 'Reactivating'} agent...`)
    const res = await toggleClientAgentStatusAction(clientId, targetStatus)
    if (res.success) {
      toast.success(`Agent successfully ${targetStatus === 'Suspended' ? 'suspended' : 'reactivated'}.`, { id: toastId })
      fetchData()
    } else {
      toast.error("Error: " + res.error, { id: toastId })
    }
  }

  if (loading) return <PageLoading message="Loading Client Data..." />
  if (!client) return <div className="p-8 text-[#9e4733]">Client not found</div>

  const isClientActive = client.status === 'Active' || client.status === 'Actif'
  const isDemo = client.email === 'demo@berinagents.com' || client.email === 'account@test.com' || client.status === 'Demo' || client.company_name?.toLowerCase().includes('demo') || client.company_name?.toLowerCase().includes('apex health')

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header & Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
              <span>•</span> CLIENT PROFILE
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">{client.company_name}</h1>
              {isDemo ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-sm uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Demo / Showcase
                </span>
              ) : client.status === 'Archived' ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-stone-600 bg-stone-100 border border-stone-300 px-2.5 py-0.5 rounded-sm uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" /> Archived
                </span>
              ) : isClientActive ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-sm uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                </span>
              ) : client.status === 'Past_Due' ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-sm uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Past Due (Unpaid)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-sm uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Suspended
                </span>
              )}
            </div>
            <p className="text-sm text-[#73706b]">Detailed client management & configuration</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isDemo && client.status !== 'Archived' && (
              isClientActive ? (
                <Button 
                  onClick={() => handleToggleAgentStatus('Suspended')} 
                  variant="outline" 
                  size="sm" 
                  className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-3 cursor-pointer"
                >
                  <ShieldAlert className="h-4 w-4 mr-1.5 text-amber-700" /> Suspend Agent
                </Button>
              ) : (
                <Button 
                  onClick={() => handleToggleAgentStatus('Active')} 
                  size="sm" 
                  className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-3 cursor-pointer shadow-none"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5 text-white" /> Reactivate Agent
                </Button>
              )
            )}
            <Link href={`/dashboard?clientId=${clientId}`}>
              <Button variant="outline" size="sm" className="border-[#e6e2d6] bg-white text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-3 cursor-pointer">
                <Eye className="h-4 w-4 mr-1.5 text-[#9e4733]" /> View Portal
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline" size="sm" className="border-[#e6e2d6] bg-white text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-3 cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
            </Link>
            {!isDemo && client.status !== 'Archived' && (
              <Button 
                onClick={handleArchiveClient} 
                variant="outline" 
                size="sm" 
                className="border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100 rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-3 cursor-pointer"
              >
                <Archive className="h-4 w-4 mr-1.5 text-stone-600" /> Archive
              </Button>
            )}
            <Button onClick={() => setShowDeleteModal(true)} variant="outline" size="sm" className="border-[#fad4cf] bg-[#fdf2f0] text-[#9e4733] hover:bg-[#fad4cf] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-3 cursor-pointer">
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Config */}
          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                <span>•</span> RATES & PRICING
              </div>
              <CardTitle className="font-serif text-xl font-bold text-[#1a1918]">Configuration & Billing</CardTitle>
              <CardDescription className="text-xs text-[#73706b]">Adjust usage rates and subscription fee</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">Company Name</Label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">Rate per minute ($)</Label>
                <Input type="number" step="0.01" value={billingRate} onChange={e => setBillingRate(e.target.value)} className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">Monthly Subscription ($)</Label>
                <Input type="number" step="1" value={retainer} onChange={e => setRetainer(e.target.value)} className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm font-mono" />
              </div>
              <Button onClick={handleUpdateConfig} className="w-full mt-4 bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10">
                <Save className="w-4 h-4 mr-2"/> Save Configuration <span className="ml-1 text-[#9e4733] text-[16px] leading-none">•</span>
              </Button>

              <div className="pt-4 mt-4 border-t border-[#f0ece4]">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleRecalculatePastCalls}
                  className="w-full border-[#e6e2d6] bg-[#faf9f7] hover:bg-[#f0ece4] text-[#1a1918] rounded-sm text-xs font-semibold tracking-wider uppercase h-10"
                >
                  <RefreshCw className="w-4 h-4 mr-2 text-[#9e4733]" /> Recalculate past calls
                </Button>
                <p className="text-[11px] text-[#73706b] mt-1.5 text-center">
                  Applies this rate (${billingRate || 0}/min) to all past calls history for this client.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                <span>•</span> AUTHENTICATION
              </div>
              <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#9e4733]"/> Security & Access
              </CardTitle>
              <CardDescription className="text-xs text-[#73706b]">Manage user credentials and credentials recovery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">Login Email</Label>
                <div className="flex gap-2">
                  <Input value={email} onChange={e => setEmail(e.target.value)} className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" />
                  <Button variant="outline" onClick={handleUpdateEmail} className="border-[#e6e2d6] bg-white text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase shrink-0 h-10 px-3">
                    Force update
                  </Button>
                </div>
                <p className="text-[11px] text-[#73706b]">Forces email change immediately without email confirmation.</p>
              </div>
              <div className="pt-4 border-t border-[#f0ece4]">
                <Button variant="outline" className="w-full border-[#e6e2d6] bg-[#faf9f7] hover:bg-[#f0ece4] text-[#1a1918] rounded-sm text-xs font-semibold tracking-wider uppercase h-10" onClick={handleSendResetPassword}>
                  <KeyRound className="w-4 h-4 mr-2" /> Send password reset link
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agents */}
        <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
          <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
              <span>•</span> VOICE AGENTS
            </div>
            <CardTitle className="font-serif text-xl font-bold text-[#1a1918]">Assigned Agents</CardTitle>
            <CardDescription className="text-xs text-[#73706b]">Retell AI bots mapped to this client account and raw webhook relay endpoints</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {agents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#faf8f5] hover:bg-[#faf8f5] border-b border-[#e6e2d6]">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11 px-6">Name</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11">Retell ID</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11">Forward Webhook (Relay)</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b] h-11 text-right px-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map(a => (
                    <TableRow key={a.id} className="border-b border-[#f0ece4] hover:bg-[#faf8f5]/60 transition-colors">
                      <TableCell className="font-semibold text-sm text-[#1a1918] px-6">{a.agent_name}</TableCell>
                      <TableCell className="font-mono text-xs text-[#73706b]">{a.retell_agent_id}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2 max-w-md">
                          <Input 
                            value={agentWebhooks[a.id] ?? ''} 
                            onChange={e => setAgentWebhooks({ ...agentWebhooks, [a.id]: e.target.value })}
                            placeholder="https://hook.eu1.make.com/... or n8n URL" 
                            className="h-8 text-xs font-mono border-[#e2dfd8] bg-white rounded-sm w-full"
                          />
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleUpdateWebhook(a.id)}
                            className="border-[#e6e2d6] bg-white hover:bg-[#faf8f5] text-[#1a1918] rounded-sm text-[11px] font-semibold uppercase tracking-wider h-8 px-2.5 shrink-0 shadow-none"
                          >
                            Save
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Resync Retell AI webhook"
                            className="hover:bg-[#f6f4f0] text-[#73706b] hover:text-[#1a1918] h-8 w-8 p-0" 
                            onClick={async () => {
                              const toastId = toast.loading("Configuring Retell webhook...")
                              const res = await syncRetellAgentWebhookAction(a.retell_agent_id)
                              if (res.success) toast.success("Retell webhook configured successfully!", { id: toastId })
                              else toast.error("Error: " + res.error, { id: toastId })
                            }}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="hover:bg-red-50 text-[#73706b] hover:text-[#9e4733] h-8 w-8 p-0" onClick={async () => {
                            await deleteAgentAction(a.id)
                            fetchData()
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-sm text-[#73706b]">No voice agents assigned to this client yet.</div>
            )}

            <div className="p-6 border-t border-[#f0ece4] bg-[#faf9f7]/40 space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#73706b]">Assign New Retell Agent</div>
              <div className="flex flex-col md:flex-row gap-3">
                <select 
                  className="flex h-10 w-full md:w-1/3 items-center justify-between rounded-sm border border-[#e2dfd8] bg-white px-3 py-2 text-sm text-[#1a1918] focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
                  value={newAgentId}
                  onChange={e => {
                    const id = e.target.value
                    setNewAgentId(id)
                    const agent = retellAgents.find(a => a.agent_id === id)
                    if (agent) setNewAgentName(agent.agent_name)
                  }}
                >
                  <option value="" disabled>-- Choose a Retell agent --</option>
                  {retellAgents.map(a => (
                    <option key={a.agent_id} value={a.agent_id}>{a.agent_name}</option>
                  ))}
                </select>
                <Input 
                  placeholder="Forward Webhook URL (Optional, e.g. Make, Zapier, n8n)" 
                  value={newAgentWebhook} 
                  onChange={e => setNewAgentWebhook(e.target.value)} 
                  className="flex-1 h-10 text-xs font-mono border-[#e2dfd8] bg-white rounded-sm"
                />
                <Button onClick={handleAddAgent} disabled={!newAgentId} className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-6 shrink-0 disabled:opacity-50 shadow-none">
                  Assign Agent <span className="ml-1.5 text-[#9e4733] text-[16px] leading-none">•</span>
                </Button>
              </div>

              {newAgentId && (
                <div className="p-3.5 bg-white border border-[#e2dfd8] rounded-sm flex items-center justify-between">
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#1a1918]">
                        Retro-pick past calls & billing history
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${backfillHistory ? 'bg-[#9e4733]/10 border-[#9e4733]/20 text-[#9e4733]' : 'bg-[#e2dfd8]/50 border-[#e2dfd8] text-[#73706b]'}`}>
                        {backfillHistory ? 'Retro-pick enabled' : 'Start from 0 (Default)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#73706b] leading-relaxed">
                      {backfillHistory
                        ? "Existing calls from Retell AI will be imported and billed at the client's minute rate."
                        : "Starts with a clean slate (0 calls, €0.00 invoiced). Past test or demo calls from Retell AI will NOT be imported."}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={backfillHistory}
                      onChange={e => setBackfillHistory(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a1918]"></div>
                  </label>
                </div>
              )}

              <p className="text-[11px] text-[#73706b]">Retell call completion payloads will be forwarded raw to this webhook in addition to dashboard logging.</p>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding & Voice AI Configuration Card */}
        {onboardingInfo?.data && (
          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden col-span-full">
            <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                    <span>•</span> ONBOARDING SPECIFICATIONS
                  </div>
                  <CardTitle className="font-serif text-xl font-bold text-[#1a1918]">
                    Client Onboarding &amp; Voice Persona
                  </CardTitle>
                  <CardDescription className="text-xs text-[#73706b]">
                    Parameters collected during client onboarding and synchronized with Airtable Forms
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-sm uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Onboarding Completed
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-[#faf8f5] border border-[#e6e2d6] rounded-sm space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider block">Phone &amp; Carrier</span>
                  <p className="font-semibold text-[#1a1918]">{onboardingInfo.data.businessPhoneNumber || 'Not set'}</p>
                  <p className="text-[11px] text-[#73706b]">Carrier: {onboardingInfo.data.phoneProvider || 'Unselected'}</p>
                </div>

                <div className="p-3 bg-[#faf8f5] border border-[#e6e2d6] rounded-sm space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider block">Voice Style &amp; Languages</span>
                  <p className="font-semibold text-[#1a1918]">{onboardingInfo.data.preferredVoice || 'Female'} Voice</p>
                  <p className="text-[11px] text-[#73706b]">Languages: {Array.isArray(onboardingInfo.data.requiredLanguages) ? onboardingInfo.data.requiredLanguages.join(', ') : 'English'}</p>
                </div>

                <div className="p-3 bg-[#faf8f5] border border-[#e6e2d6] rounded-sm space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider block">Call Flow &amp; Hours</span>
                  <p className="font-semibold text-[#1a1918]">{Array.isArray(onboardingInfo.data.callTypes) ? onboardingInfo.data.callTypes.join(', ') : 'Inbound'}</p>
                  <p className="text-[11px] text-[#73706b] truncate">{onboardingInfo.data.openingHours || 'Hours not set'}</p>
                </div>
              </div>

              {onboardingInfo.data.businessAddress && (
                <div className="text-xs">
                  <span className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider block mb-0.5">Physical Address</span>
                  <p className="font-medium text-[#1a1918]">{onboardingInfo.data.businessAddress}</p>
                </div>
              )}

              {onboardingInfo.data.mission && (
                <div className="text-xs">
                  <span className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider block mb-0.5">Primary Agent Mission</span>
                  <p className="font-medium text-[#1a1918]">{onboardingInfo.data.mission}</p>
                </div>
              )}

              {(onboardingInfo.data.transferPhone || onboardingInfo.data.calendarUrl || onboardingInfo.data.websiteUrl) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2 border-t border-[#e6e2d6]">
                  {onboardingInfo.data.transferPhone && (
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider block mb-0.5">Emergency Fallback</span>
                      <p className="font-mono font-medium text-[#1a1918]">{onboardingInfo.data.transferPhone}</p>
                    </div>
                  )}
                  {onboardingInfo.data.calendarUrl && (
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider block mb-0.5">Booking Calendar</span>
                      <a href={onboardingInfo.data.calendarUrl} target="_blank" rel="noopener noreferrer" className="text-[#9e4733] hover:underline flex items-center gap-1 font-medium truncate">
                        {onboardingInfo.data.calendarUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}
                  {onboardingInfo.data.websiteUrl && (
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider block mb-0.5">Website</span>
                      <a href={onboardingInfo.data.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[#9e4733] hover:underline flex items-center gap-1 font-medium truncate">
                        {onboardingInfo.data.websiteUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {onboardingInfo.data.topFaqs && (
                <div className="text-xs pt-2 border-t border-[#e6e2d6]">
                  <span className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider block mb-1">Top Customer FAQs</span>
                  <div className="p-3 bg-[#faf8f5] border border-[#e6e2d6] rounded-sm whitespace-pre-line text-[#1a1918]">
                    {onboardingInfo.data.topFaqs}
                  </div>
                </div>
              )}

              {onboardingInfo.data.notes && (
                <div className="text-xs pt-2 border-t border-[#e6e2d6]">
                  <span className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider block mb-1">Special Instructions &amp; Guardrails</span>
                  <div className="p-3 bg-[#faf8f5] border border-[#e6e2d6] rounded-sm whitespace-pre-line text-[#1a1918]">
                    {onboardingInfo.data.notes}
                  </div>
                </div>
              )}

              {Array.isArray(onboardingInfo.data.uploadedDocuments) && onboardingInfo.data.uploadedDocuments.length > 0 && (
                <div className="text-xs pt-2 border-t border-[#e6e2d6]">
                  <span className="text-[10px] uppercase font-semibold text-[#73706b] tracking-wider block mb-2">
                    Attached Knowledge Documents ({onboardingInfo.data.uploadedDocuments.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {onboardingInfo.data.uploadedDocuments.map((doc: any, i: number) => (
                      <a 
                        key={i} 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 bg-[#faf8f5] border border-[#e6e2d6] hover:border-[#1a1918] rounded-sm transition-colors text-xs"
                      >
                        <span className="flex items-center gap-2 truncate font-medium text-[#1a1918]">
                          <FileText className="w-4 h-4 text-[#9e4733] shrink-0" />
                          <span className="truncate">{doc.name}</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#73706b] shrink-0 ml-2" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>

      <DeleteClientModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteClient}
        clientName={client?.company_name || ''}
        requireTyping
      />
    </div>
  )
}
