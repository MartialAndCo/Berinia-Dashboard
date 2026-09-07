'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { KeyRound, Mail, Bot, PhoneCall, Calendar, PlayCircle, Loader2, CheckCircle2, AlertCircle, RefreshCw, PhoneForwarded, PhoneOutgoing, Database } from 'lucide-react'
import { fetchDemoConfigAction, saveDemoConfigAction, testDemoCallAction, RetellAgentOption } from './actions'
import { DemoSettings, DemoLead } from '@/lib/demo-settings'

export default function AdminSettingsPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  
  // Demo Settings State
  const [demoSettings, setDemoSettings] = useState<DemoSettings>({
    agent_id: '',
    from_number: '',
    calendar_url: '',
    enabled: true,
    owner_name: 'Yann'
  })
  const [retellAgents, setRetellAgents] = useState<RetellAgentOption[]>([])
  const [detectedNumber, setDetectedNumber] = useState<string | null>(null)
  const [demoLeads, setDemoLeads] = useState<DemoLead[]>([])
  const [savingDemo, setSavingDemo] = useState(false)
  
  // Test Call State
  const [testPhone, setTestPhone] = useState('')
  const [testingCall, setTestingCall] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([fetchUser(), loadDemoConfig()])
    setLoading(false)
  }

  const fetchUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setEmail(session.user.email || '')
    }
  }

  const loadDemoConfig = async () => {
    const res = await fetchDemoConfigAction()
    if (res.success) {
      if (res.settings) setDemoSettings(res.settings)
      if (res.leads) setDemoLeads(res.leads)
      if (res.retellAgents) setRetellAgents(res.retellAgents)
      if (res.detectedNumber) setDetectedNumber(res.detectedNumber)
    }
  }

  const handleSaveDemoSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingDemo(true)
    const toastId = toast.loading("Saving Demo Agent configuration...")

    const res = await saveDemoConfigAction(demoSettings)
    setSavingDemo(false)

    if (res.success) {
      toast.success("Demo Agent configuration saved successfully!", { id: toastId })
    } else {
      toast.error(res.error || "Failed to save configuration.", { id: toastId })
    }
  }

  const handleTriggerTestCall = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testPhone) {
      return toast.error("Please enter a phone number to test.")
    }

    setTestingCall(true)
    const toastId = toast.loading(`Triggering live test call to ${testPhone}...`)

    const res = await testDemoCallAction(testPhone)
    setTestingCall(false)

    if (res.success) {
      toast.success(`Call initiated! (Retell Call ID: ${res.callId})`, { id: toastId })
      loadDemoConfig()
    } else {
      toast.error(res.error || "Failed to trigger test call.", { id: toastId })
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const password = form.password.value
    const confirm = form.confirm.value

    if (password !== confirm) {
      return toast.error("Passwords do not match.")
    }

    const toastId = toast.loading("Updating password...")
    const { error } = await supabase.auth.updateUser({ password })
    
    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success("Password updated successfully.", { id: toastId })
      form.reset()
    }
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const newEmail = form.newEmail.value

    const toastId = toast.loading("Sending request...")
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    
    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success("Check your emails to confirm the change.", { id: toastId })
    }
  }

  const selectedAgentObj = retellAgents.find(a => a.agent_id === demoSettings.agent_id)

  if (loading) return <div className="p-8 text-[#73706b]">Loading admin settings...</div>

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
              <span>•</span> ADMIN SETTINGS
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">Platform Settings</h1>
            <p className="text-sm text-[#73706b]">Configure your automated outbound demo agent and administrative credentials</p>
          </div>

          <Button 
            variant="outline" 
            onClick={loadDemoConfig} 
            className="text-xs border-[#e2dfd8] text-[#73706b] hover:text-[#1a1918] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>

        {/* 1. DEMO AGENT CONFIGURATION CARD */}
        <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
          <CardHeader className="border-b border-[#e6e2d6] py-5 px-6 bg-[#faf8f5]">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                  <span>•</span> LANDING PAGE OUTBOUND AGENT
                </div>
                <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#9e4733]"/> Instant Demo Voice Agent
                </CardTitle>
                <CardDescription className="text-xs text-[#73706b]">
                  Choose which agent calls back visitors when they request a demo on berinagents.com.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2.5">
                <Link href="/admin/demo-calls">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[11px] font-semibold border-[#e2dfd8] bg-[#ffffff] text-[#1a1918] hover:bg-[#faf8f5] cursor-pointer shadow-none"
                  >
                    <PhoneOutgoing className="w-3.5 h-3.5 mr-1 text-[#9e4733]" />
                    View Outbound Demo Calls &rarr;
                  </Button>
                </Link>
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                  demoSettings.enabled && demoSettings.agent_id
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${demoSettings.enabled && demoSettings.agent_id ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {demoSettings.enabled && demoSettings.agent_id ? 'Active & Ready' : 'Select an agent'}
                </span>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleSaveDemoSettings}>
            <CardContent className="space-y-6 pt-6 px-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Agent Dropdown */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                    Select Retell Agent *
                  </Label>
                  <select 
                    className="flex h-11 w-full items-center justify-between rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/60 px-3.5 py-2 text-sm text-[#1a1918] focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
                    value={demoSettings.agent_id}
                    onChange={e => setDemoSettings({ ...demoSettings, agent_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select an existing Retell Agent --</option>
                    {retellAgents.map(a => (
                      <option key={a.agent_id} value={a.agent_id}>
                        {a.agent_name} ({a.agent_id})
                      </option>
                    ))}
                  </select>
                  {detectedNumber && (
                    <p className="text-[11px] text-[#73706b] flex items-center gap-1.5 pt-1">
                      <PhoneForwarded className="w-3.5 h-3.5 text-emerald-600" />
                      Outbound Caller ID handled via Retell: <span className="font-mono font-medium text-[#1a1918]">{detectedNumber}</span>
                    </p>
                  )}
                </div>

                {/* Calendar URL (Optional) */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#9e4733]" /> Calendar Booking Link (Optional)
                  </Label>
                  <Input 
                    value={demoSettings.calendar_url}
                    onChange={e => setDemoSettings({ ...demoSettings, calendar_url: e.target.value })}
                    placeholder="https://cal.com/yann/15min" 
                    className="border-[#e2dfd8] bg-[#faf9f7]/60 rounded-sm h-10 text-xs"
                  />
                  <p className="text-[10px] text-[#8c8880]">
                    Your booking link if the agent needs to send or refer to a calendar.
                  </p>
                </div>

                {/* Founder / Owner Name */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                    Founder / Your Name
                  </Label>
                  <Input 
                    value={demoSettings.owner_name}
                    onChange={e => setDemoSettings({ ...demoSettings, owner_name: e.target.value })}
                    placeholder="Yann" 
                    className="border-[#e2dfd8] bg-[#faf9f7]/60 rounded-sm h-10 text-xs"
                  />
                  <p className="text-[10px] text-[#8c8880]">
                    Your name for booking referrals (e.g. "Yann will talk with you").
                  </p>
                </div>

                {/* Airtable Integration */}
                <div className="space-y-2 md:col-span-2 pt-4 border-t border-[#f0ece4]">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#9e4733]" /> Airtable Integration (Webhook or API)
                    </Label>
                    <span className="text-[10px] text-[#8c8880]">Auto-populates when form is submitted</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <span className="text-[10px] font-medium text-[#73706b]">Option A: Airtable Webhook URL (Recommended)</span>
                      <Input 
                        value={demoSettings.airtable_webhook_url || ''}
                        onChange={e => setDemoSettings({ ...demoSettings, airtable_webhook_url: e.target.value })}
                        placeholder="https://hooks.airtable.com/workflows/v1/genericWebhook/..." 
                        className="border-[#e2dfd8] bg-[#faf9f7]/60 rounded-sm h-10 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-medium text-[#73706b]">Option B: Airtable Base ID</span>
                      <Input 
                        value={demoSettings.airtable_base_id || ''}
                        onChange={e => setDemoSettings({ ...demoSettings, airtable_base_id: e.target.value })}
                        placeholder="appXXXXXXXXXXXXXX" 
                        className="border-[#e2dfd8] bg-[#faf9f7]/60 rounded-sm h-10 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {(demoSettings.airtable_base_id || demoSettings.airtable_api_key) && (
                    <div className="grid md:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <span className="text-[10px] font-medium text-[#73706b]">Airtable Personal Access Token (pat...)</span>
                        <Input 
                          type="password"
                          value={demoSettings.airtable_api_key || ''}
                          onChange={e => setDemoSettings({ ...demoSettings, airtable_api_key: e.target.value })}
                          placeholder="patXXXXXXXXXXXXXX.XXXXXXXXXXXXXX" 
                          className="border-[#e2dfd8] bg-[#faf9f7]/60 rounded-sm h-10 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-medium text-[#73706b]">Table Name</span>
                        <Input 
                          value={demoSettings.airtable_table_name || 'Leads'}
                          onChange={e => setDemoSettings({ ...demoSettings, airtable_table_name: e.target.value })}
                          placeholder="Leads" 
                          className="border-[#e2dfd8] bg-[#faf9f7]/60 rounded-sm h-10 text-xs"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-[#8c8880]">
                    Whenever a lead submits the demo form on berinagents.com, their contact info and call status are automatically added to your Airtable base.
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <div className="p-4 bg-[#faf9f7] border border-[#e2dfd8] rounded-sm flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#1a1918]">
                    Enable Instant Outbound Callback
                  </div>
                  <div className="text-[11px] text-[#73706b]">
                    When active, submitting the landing page modal triggers a live phone call to the prospect immediately.
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={demoSettings.enabled}
                    onChange={e => setDemoSettings({ ...demoSettings, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a1918]"></div>
                </label>
              </div>
            </CardContent>

            <CardFooter className="py-4 px-6 border-t border-[#f0ece4] bg-[#faf9f7]/30 flex items-center justify-between">
              <span className="text-[11px] text-[#8c8880]">
                Selected: <span className="font-semibold text-[#1a1918]">{selectedAgentObj ? selectedAgentObj.agent_name : (demoSettings.agent_id ? demoSettings.agent_id : 'None')}</span>
              </span>
              <Button 
                type="submit" 
                disabled={savingDemo}
                className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-6 cursor-pointer"
              >
                {savingDemo ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Save Agent Settings <span className="ml-1 text-[#9e4733] text-[16px] leading-none">•</span>
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* 2. INSTANT TEST CALL CARD */}
        <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
          <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
              <span>•</span> LIVE TEST TOOL
            </div>
            <CardTitle className="font-serif text-lg font-bold text-[#1a1918] flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-[#9e4733]"/> Test Selected Agent Now
            </CardTitle>
            <CardDescription className="text-xs text-[#73706b]">
              Enter your personal phone number to receive an instant test call from your selected agent.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5 px-6">
            <form onSubmit={handleTriggerTestCall} className="flex flex-col sm:flex-row gap-3">
              <Input 
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="(555) 234-5678 or +33612345678" 
                className="border-[#e2dfd8] bg-[#faf9f7]/60 rounded-sm h-10 text-xs font-mono flex-1"
                required
              />
              <Button 
                type="submit" 
                disabled={testingCall || !demoSettings.agent_id}
                className="bg-[#9e4733] hover:bg-[#833826] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 cursor-pointer whitespace-nowrap"
              >
                {testingCall ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Calling...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4 mr-1.5" />
                    Send Test Call To My Phone
                  </>
                )}
              </Button>
            </form>
            {!demoSettings.agent_id && (
              <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Select an agent in the dropdown above first.
              </p>
            )}
          </CardContent>
        </Card>

        {/* 3. RECENT DEMO LEADS LOG */}
        <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
          <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                  <span>•</span> INBOUND LEADS
                </div>
                <CardTitle className="font-serif text-lg font-bold text-[#1a1918]">
                  Recent Demo Requests ({demoLeads.length})
                </CardTitle>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {demoLeads.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8c8880]">
                No demo requests received yet. Submissions from the landing page will appear here instantly.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#faf9f7] border-b border-[#e6e2d6] text-[#66635e] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Business</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Call Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ece4]">
                    {demoLeads.slice(0, 15).map((lead) => (
                      <tr key={lead.id} className="hover:bg-[#faf8f5]">
                        <td className="py-3 px-4 text-[#8c8880] whitespace-nowrap font-mono text-[11px]">
                          {new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#1a1918]">{lead.fullName}</td>
                        <td className="py-3 px-4 text-[#5a5751]">{lead.businessName}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#1a1918]">{lead.phone}</td>
                        <td className="py-3 px-4 text-[#73706b]">{lead.email}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {lead.status === 'called' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Called
                              {lead.callId && <span className="text-[#8c8880] font-mono text-[9px]">({lead.callId.slice(0, 8)}...)</span>}
                            </span>
                          ) : lead.status === 'call_failed' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200" title={lead.error}>
                              <AlertCircle className="w-3 h-3" /> Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Recorded (Offline)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. ACCOUNT CREDENTIALS (ORIGINAL) */}
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
            <span>•</span> CREDENTIALS & SECURITY
          </div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1a1918] mb-6">Account Credentials</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <form onSubmit={handleUpdateEmail}>
              <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] h-full flex flex-col justify-between overflow-hidden">
                <div>
                  <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                      <span>•</span> CREDENTIALS
                    </div>
                    <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                      <Mail className="w-5 h-5 text-[#9e4733]"/> Change Email
                    </CardTitle>
                    <CardDescription className="text-xs text-[#73706b]">
                      A confirmation link will be sent to your new email address.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">Current Email</Label>
                      <Input value={email} disabled className="bg-[#faf9f7] border-[#e2dfd8] text-[#73706b] rounded-sm h-10 text-sm font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">New Email</Label>
                      <Input name="newEmail" type="email" required placeholder="new@admin.com" className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" />
                    </div>
                  </CardContent>
                </div>
                <CardFooter className="pt-4 border-t border-[#f0ece4] bg-[#faf9f7]/30">
                  <Button type="submit" className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 w-full">
                    Send Confirmation Request <span className="ml-1 text-[#9e4733] text-[16px] leading-none">•</span>
                  </Button>
                </CardFooter>
              </Card>
            </form>

            <form onSubmit={handleUpdatePassword}>
              <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] h-full flex flex-col justify-between overflow-hidden">
                <div>
                  <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                      <span>•</span> AUTHENTICATION
                    </div>
                    <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-[#9e4733]"/> Change Password
                    </CardTitle>
                    <CardDescription className="text-xs text-[#73706b]">
                      Choose a new secure password for your administrator access.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">New Password</Label>
                      <Input name="password" type="password" required className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">Confirm Password</Label>
                      <Input name="confirm" type="password" required className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" />
                    </div>
                  </CardContent>
                </div>
                <CardFooter className="pt-4 border-t border-[#f0ece4] bg-[#faf9f7]/30">
                  <Button type="submit" className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 w-full">
                    Update Password <span className="ml-1 text-[#9e4733] text-[16px] leading-none">•</span>
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
