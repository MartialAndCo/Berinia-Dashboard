'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Building2, CreditCard, Bot, UserPlus } from 'lucide-react'
import { getRetellAgentsAction, addAgentAction } from '../../actions'

export default function NewClientPage() {
  const router = useRouter()

  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [billingRate, setBillingRate] = useState('0.50')
  const [retainer, setRetainer] = useState('500')
  const [initialAgentToAssign, setInitialAgentToAssign] = useState('')
  const [forwardWebhookUrl, setForwardWebhookUrl] = useState('')
  const [retellAgents, setRetellAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchRetellAgents()
  }, [])

  const fetchRetellAgents = async () => {
    const res = await getRetellAgentsAction()
    if (res.success) {
      setRetellAgents(res.agents)
    }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const toastId = toast.loading("Creating client & sending invitation...")

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
      if (res.ok && json.success) {
        toast.success("Client onboarded and invited successfully!", { id: toastId })

        // Assign initial agent if selected
        if (initialAgentToAssign && json.clientId) {
          const selectedRetellObj = retellAgents.find(a => a.agent_id === initialAgentToAssign)
          if (selectedRetellObj) {
            await addAgentAction(json.clientId, selectedRetellObj.agent_name, selectedRetellObj.agent_id, forwardWebhookUrl)
            toast.success("Agent assigned to client.")
          }
        }

        // Navigate to the newly created client detail page
        router.push(`/admin/client/${json.clientId}`)
      } else {
        toast.error(json.error || "Failed to create client", { id: toastId })
      }
    } catch (err: any) {
      toast.error("Network or server error", { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header & Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
              <span>•</span> CLIENT ONBOARDING
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">New Client (Pod)</h1>
            <p className="text-sm text-[#73706b]">Create a new client account, configure pricing parameters, and assign voice agents.</p>
          </div>
          <div>
            <Link href="/admin">
              <Button variant="outline" size="sm" className="border-[#e6e2d6] bg-white text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-4">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Overview
              </Button>
            </Link>
          </div>
        </div>

        {/* Full Page Form */}
        <form onSubmit={handleCreateClient} className="space-y-8">
          
          {/* Card 1: Company Profile */}
          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                <span>•</span> STEP 1
              </div>
              <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#9e4733]" /> Company Profile & Access
              </CardTitle>
              <CardDescription className="text-xs text-[#73706b]">
                The client will receive an invitation email with a link to set up their password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                  Company Name <span className="text-[#9e4733]">*</span>
                </Label>
                <Input 
                  required 
                  value={companyName} 
                  onChange={e => setCompanyName(e.target.value)} 
                  placeholder="e.g. Acme Corporation" 
                  className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                  Client Administrator Email <span className="text-[#9e4733]">*</span>
                </Label>
                <Input 
                  required 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="contact@acme.com" 
                  className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" 
                />
                <p className="text-[11px] text-[#73706b]">This email will be used to access the client portal and manage billing.</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Billing & Rates */}
          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                <span>•</span> STEP 2
              </div>
              <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#9e4733]" /> Rates & Subscription Terms
              </CardTitle>
              <CardDescription className="text-xs text-[#73706b]">
                Stripe customer and subscription products will be provisioned automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                    Rate per minute ($) <span className="text-[#9e4733]">*</span>
                  </Label>
                  <Input 
                    required 
                    type="number" 
                    step="0.01" 
                    value={billingRate} 
                    onChange={e => setBillingRate(e.target.value)} 
                    className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm font-mono" 
                  />
                  <p className="text-[11px] text-[#73706b]">Billed based on total call duration in seconds.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                    Monthly Retainer ($) <span className="text-[#9e4733]">*</span>
                  </Label>
                  <Input 
                    required 
                    type="number" 
                    step="1" 
                    value={retainer} 
                    onChange={e => setRetainer(e.target.value)} 
                    className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm font-mono" 
                  />
                  <p className="text-[11px] text-[#73706b]">Fixed subscription charged automatically each month.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Voice Agent Assignment */}
          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                <span>•</span> STEP 3 (OPTIONAL)
              </div>
              <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#9e4733]" /> Voice Agent Assignment
              </CardTitle>
              <CardDescription className="text-xs text-[#73706b]">
                Connect an existing Retell AI agent now, or assign one later from the client profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                  Select Retell AI Agent
                </Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/50 px-3 py-2 text-sm text-[#1a1918] focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
                  value={initialAgentToAssign}
                  onChange={e => setInitialAgentToAssign(e.target.value)}
                >
                  <option value="">-- No initial agent (assign later) --</option>
                  {retellAgents.map(a => (
                    <option key={a.agent_id} value={a.agent_id}>
                      {a.agent_name} ({a.agent_id.substring(0, 10)}...)
                    </option>
                  ))}
                </select>
              </div>

              {initialAgentToAssign && (
                <div className="space-y-1.5 pt-2">
                  <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                    Forward Webhook URL (Optional)
                  </Label>
                  <Input 
                    value={forwardWebhookUrl} 
                    onChange={e => setForwardWebhookUrl(e.target.value)} 
                    placeholder="https://hook.eu1.make.com/... or https://n8n.yourdomain.com/webhook/..." 
                    className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-xs font-mono" 
                  />
                  <p className="text-[11px] text-[#73706b]">
                    Raw Retell call events will be forwarded to this webhook URL immediately upon call completion.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <Link href="/admin">
              <Button type="button" variant="outline" className="border-[#e6e2d6] bg-white text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-11 px-6">
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm h-11 px-8 text-xs font-semibold tracking-wider uppercase transition-all shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                'Creating Client...'
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create & Send Invitation <span className="text-[#9e4733] text-[16px] leading-none">•</span>
                </>
              )}
            </Button>
          </div>

        </form>

      </div>
    </div>
  )
}
