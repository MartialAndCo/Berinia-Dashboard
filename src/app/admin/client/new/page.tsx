'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Building2, CreditCard, Bot, UserPlus, RefreshCw, CalendarCheck, Sparkles, Check } from 'lucide-react'
import { getRetellAgentsAction, addAgentAction, getAirtableBookedLeadsAction } from '../../actions'

export default function NewClientPage() {
  const router = useRouter()

  // Airtable Leads dropdown state
  const [airtableLeads, setAirtableLeads] = useState<any[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [airtableRecordId, setAirtableRecordId] = useState('')

  // Company Profile states
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')

  // Free Custom Pricing states (any price can be entered freely)
  const [setupFee, setSetupFee] = useState('0')
  const [setupInstallments, setSetupInstallments] = useState<number>(1) // 1, 2, or 3
  const [billingRate, setBillingRate] = useState('0.50')
  const [retainer, setRetainer] = useState('500')
  const [discountPercent, setDiscountPercent] = useState('')
  const [discountMonths, setDiscountMonths] = useState('3')
  const [showDiscountInput, setShowDiscountInput] = useState(false)

  // Agent states
  const [initialAgentToAssign, setInitialAgentToAssign] = useState('')
  const [forwardWebhookUrl, setForwardWebhookUrl] = useState('')
  const [backfillHistory, setBackfillHistory] = useState(false)
  const [retellAgents, setRetellAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    fetchAirtableLeads()
    fetchRetellAgents()
  }

  const fetchAirtableLeads = async () => {
    setLoadingLeads(true)
    const res = await getAirtableBookedLeadsAction()
    if (res.success && res.leads) {
      setAirtableLeads(res.leads)
    } else if (res.error) {
      console.warn('Airtable leads error:', res.error)
    }
    setLoadingLeads(false)
  }

  const fetchRetellAgents = async () => {
    const res = await getRetellAgentsAction()
    if (res.success && res.agents) {
      setRetellAgents(res.agents)
    }
  }

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId)
    if (!leadId) {
      setAirtableRecordId('')
      return
    }

    const lead = airtableLeads.find(l => l.recordId === leadId)
    if (lead) {
      setCompanyName(lead.companyName || lead.fullName || '')
      setEmail(lead.email || '')
      setAirtableRecordId(lead.recordId)

      if (lead.monthlyRetainer !== undefined && lead.monthlyRetainer > 0) {
        setRetainer(String(lead.monthlyRetainer))
      }
      if (lead.billingRate !== undefined && lead.billingRate > 0) {
        setBillingRate(String(lead.billingRate))
      }
      if (lead.setupFee !== undefined && lead.setupFee > 0) {
        setSetupFee(String(lead.setupFee))
      }

      toast.success(`Prospect "${lead.companyName || lead.fullName}" sélectionné !`)
    }
  }

  // Calculations for live breakdown
  const numSetup = parseFloat(setupFee) || 0
  const numRetainer = parseFloat(retainer) || 0
  const numRate = parseFloat(billingRate) || 0
  const numDiscount = parseFloat(discountPercent) || 0
  const discountFactor = numDiscount > 0 ? (1 - numDiscount / 100) : 1
  const discountedRetainer = Math.max(0, numRetainer * discountFactor)

  const setupPerInstallment = setupInstallments > 0 ? numSetup / setupInstallments : numSetup
  const month1Total = (setupInstallments > 1 ? setupPerInstallment : numSetup) + (numDiscount > 0 ? discountedRetainer : numRetainer)
  const month2Total = (setupInstallments >= 2 ? setupPerInstallment : 0) + (parseInt(discountMonths) >= 2 && numDiscount > 0 ? discountedRetainer : numRetainer)
  const month3Total = (setupInstallments >= 3 ? setupPerInstallment : 0) + (parseInt(discountMonths) >= 3 && numDiscount > 0 ? discountedRetainer : numRetainer)

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const toastId = toast.loading("Création du client & configuration Stripe en cours...")

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          company_name: companyName,
          billing_rate: parseFloat(billingRate) || 0,
          monthly_retainer: parseFloat(retainer) || 0,
          setup_fee: parseFloat(setupFee) || 0,
          setup_installments: setupInstallments,
          discount_percent: discountPercent ? parseFloat(discountPercent) : 0,
          discount_duration_months: discountMonths ? parseInt(discountMonths) : 1,
          airtable_record_id: airtableRecordId || undefined
        })
      })

      const json = await res.json()
      if (res.ok && json.success) {
        toast.success("Client créé et invitation envoyée avec succès !", { id: toastId })

        // Assign initial agent if selected
        if (initialAgentToAssign && json.clientId) {
          const selectedRetellObj = retellAgents.find(a => a.agent_id === initialAgentToAssign)
          if (selectedRetellObj) {
            await addAgentAction(json.clientId, selectedRetellObj.agent_name, selectedRetellObj.agent_id, forwardWebhookUrl, backfillHistory)
            toast.success(backfillHistory ? "Agent assigné avec historique." : "Agent assigné (historique vierge).")
          }
        }

        // Navigate to the newly created client detail page
        router.push(`/admin/client/${json.clientId}`)
      } else {
        toast.error(json.error || "Erreur lors de la création du client", { id: toastId })
      }
    } catch (err: any) {
      toast.error("Erreur réseau ou serveur", { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header & Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
              <span>•</span> CLIENT ONBOARDING
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">Nouveau Client (Pod)</h1>
            <p className="text-sm text-[#73706b]">
              Sélectionnez un prospect Airtable ou remplissez manuellement. Choisissez librement vos prix.
            </p>
          </div>
          <div>
            <Link href="/admin">
              <Button variant="outline" size="sm" className="border-[#e6e2d6] bg-white text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-4">
                <ArrowLeft className="h-4 w-4 mr-2" /> Retour Overview
              </Button>
            </Link>
          </div>
        </div>

        {/* Full Page Form */}
        <form onSubmit={handleCreateClient} className="space-y-6">
          
          {/* Card 0: Airtable Dropdown */}
          <Card className="border-2 border-[#9e4733]/30 bg-[#faf8f5] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <CardHeader className="border-b border-[#e6e2d6] py-3.5 px-6 bg-white flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-[#9e4733]" /> PULL AIRTABLE • RDV RÉSERVÉS
                </div>
                <CardTitle className="font-serif text-lg font-bold text-[#1a1918]">
                  Importer un prospect qualifié
                </CardTitle>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchAirtableLeads}
                disabled={loadingLeads}
                className="text-xs text-[#73706b] hover:text-[#1a1918] h-8 px-2 cursor-pointer"
                title="Actualiser depuis Airtable"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingLeads ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </CardHeader>
            <CardContent className="pt-4 pb-5 px-6 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                  Sélectionner un lead (RDV réservé) pour pré-remplir
                </Label>
                <select
                  className="flex h-11 w-full items-center justify-between rounded-sm border border-[#e2dfd8] bg-white px-3.5 py-2 text-sm text-[#1a1918] focus:outline-none focus:ring-1 focus:ring-[#1a1918] cursor-pointer"
                  value={selectedLeadId}
                  onChange={e => handleSelectLead(e.target.value)}
                >
                  <option value="">
                    {loadingLeads ? 'Chargement des prospects Airtable...' : '-- Sélectionner un prospect (RDV réservé) pour pré-remplir --'}
                  </option>
                  {airtableLeads.map(lead => {
                    const displayDate = lead.meetingDate
                      ? new Date(lead.meetingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                      : null
                    return (
                      <option key={lead.recordId} value={lead.recordId}>
                        {lead.companyName} {lead.fullName ? `(${lead.fullName})` : ''} — {lead.email || 'Pas d\'email'}
                        {displayDate ? ` • RDV: ${displayDate}` : ''}
                        {lead.isRegistered ? ' [Déjà client]' : ''}
                      </option>
                    )
                  })}
                </select>
                <p className="text-[11px] text-[#73706b]">
                  {airtableLeads.length > 0 
                    ? `${airtableLeads.length} prospect(s) qualifié(s) trouvé(s) dans Airtable.` 
                    : 'Aucun prospect avec RDV programmé trouvé dans Airtable.'}
                </p>
              </div>

              {selectedLeadId && (
                <div className="p-3 bg-white border border-[#e2dfd8] rounded-sm text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 font-medium">
                    <Check className="w-4 h-4" /> Données pré-remplies depuis Airtable
                  </div>
                  <span className="text-[11px] text-[#73706b] font-mono">ID: {airtableRecordId}</span>
                </div>
              )}
            </CardContent>
          </Card>
          
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
                <span>•</span> ÉTAPE 2
              </div>
              <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#9e4733]" /> Tarification sur-mesure (Prix Libres)
              </CardTitle>
              <CardDescription className="text-xs text-[#73706b]">
                Définissez librement les montants. Stripe facturera au centime près les prix indiqués.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              
              {/* Setup Fee & Échelonnement */}
              <div className="p-4 bg-[#faf9f7] border border-[#e2dfd8] rounded-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                      Frais de Setup ($)
                    </Label>
                    <p className="text-[11px] text-[#73706b]">Facturés à l'onboarding (0 si aucun)</p>
                  </div>
                  <Input 
                    type="number" 
                    step="1" 
                    min="0"
                    value={setupFee} 
                    onChange={e => setSetupFee(e.target.value)} 
                    className="border-[#e2dfd8] bg-white rounded-sm h-10 text-sm font-mono w-full sm:w-36 text-right font-bold" 
                  />
                </div>

                {numSetup > 0 && (
                  <div className="pt-2 border-t border-[#e2dfd8]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-[#73706b]">Modalité de paiement du Setup :</span>
                    <div className="inline-flex rounded-sm border border-[#e2dfd8] bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => setSetupInstallments(1)}
                        className={`px-3 py-1 text-xs font-semibold rounded-sm transition-all cursor-pointer ${setupInstallments === 1 ? 'bg-[#1a1918] text-white' : 'text-[#73706b] hover:text-[#1a1918]'}`}
                      >
                        1x Comptant
                      </button>
                      <button
                        type="button"
                        onClick={() => setSetupInstallments(2)}
                        className={`px-3 py-1 text-xs font-semibold rounded-sm transition-all cursor-pointer ${setupInstallments === 2 ? 'bg-[#1a1918] text-white' : 'text-[#73706b] hover:text-[#1a1918]'}`}
                      >
                        2x sans frais (${(numSetup / 2).toFixed(0)}/m)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSetupInstallments(3)}
                        className={`px-3 py-1 text-xs font-semibold rounded-sm transition-all cursor-pointer ${setupInstallments === 3 ? 'bg-[#1a1918] text-white' : 'text-[#73706b] hover:text-[#1a1918]'}`}
                      >
                        3x sans frais (${(numSetup / 3).toFixed(0)}/m)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Retainer & Minute Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                    Abonnement Mensuel ($) <span className="text-[#9e4733]">*</span>
                  </Label>
                  <Input 
                    required 
                    type="number" 
                    step="1" 
                    min="0"
                    value={retainer} 
                    onChange={e => setRetainer(e.target.value)} 
                    className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm font-mono text-base font-bold" 
                  />
                  <p className="text-[11px] text-[#73706b]">Montant fixe récurrent prélevé chaque mois.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                    Tarif par minute ($) <span className="text-[#9e4733]">*</span>
                  </Label>
                  <Input 
                    required 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={billingRate} 
                    onChange={e => setBillingRate(e.target.value)} 
                    className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm font-mono text-base font-bold" 
                  />
                  <p className="text-[11px] text-[#73706b]">Facturé à la seconde selon la durée des appels.</p>
                </div>
              </div>

              {/* Ristourne / Remise Optionnelle */}
              <div className="border-t border-[#f0ece4] pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#1a1918]">Ristourne / Remise Stripe (Optionnel)</span>
                    <p className="text-[11px] text-[#73706b]">Génère un coupon de réduction sur la facture Stripe.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDiscountInput(!showDiscountInput)
                      if (showDiscountInput) setDiscountPercent('')
                    }}
                    className="border-[#e2dfd8] text-xs h-8 cursor-pointer"
                  >
                    {showDiscountInput ? 'Annuler la remise' : '+ Ajouter une remise'}
                  </Button>
                </div>

                {showDiscountInput && (
                  <div className="mt-3 p-3 bg-[#faf9f7] border border-[#e2dfd8] rounded-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-semibold text-[#73706b]">Pourcentage de remise (%)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="ex: 20"
                        value={discountPercent}
                        onChange={e => setDiscountPercent(e.target.value)}
                        className="bg-white h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-semibold text-[#73706b]">Durée (nombre de mois)</Label>
                      <select
                        className="flex h-9 w-full rounded-sm border border-[#e2dfd8] bg-white px-2 py-1 text-xs text-[#1a1918]"
                        value={discountMonths}
                        onChange={e => setDiscountMonths(e.target.value)}
                      >
                        <option value="1">1 mois (1ère facture)</option>
                        <option value="2">2 mois</option>
                        <option value="3">3 mois</option>
                        <option value="6">6 mois</option>
                        <option value="12">12 mois</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Simulation en direct */}
              <div className="p-3.5 bg-[#1a1918] text-[#f6f4f0] rounded-sm space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9e4733] flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#9e4733]" /> SIMULATION DE FACTURATION STRIPE
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5 text-xs">
                  <div className="bg-white/5 p-2 rounded-sm">
                    <div className="text-[10px] text-stone-400 uppercase">Mois 1 (À l'inscription)</div>
                    <div className="font-serif text-base font-bold text-white mt-0.5">${month1Total.toFixed(2)}</div>
                    <div className="text-[10px] text-stone-400 truncate">
                      {numSetup > 0 ? `Setup (${setupInstallments > 1 ? `1/${setupInstallments}` : '1x'}) + ` : ''}Abonnement
                    </div>
                  </div>

                  <div className="bg-white/5 p-2 rounded-sm">
                    <div className="text-[10px] text-stone-400 uppercase">Mois 2 {setupInstallments >= 3 ? '& 3' : ''}</div>
                    <div className="font-serif text-base font-bold text-white mt-0.5">
                      ${setupInstallments >= 2 ? month2Total.toFixed(2) : numRetainer.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-stone-400 truncate">
                      {setupInstallments >= 2 ? 'Échéance setup + ' : ''}Abonnement + consos
                    </div>
                  </div>

                  <div className="bg-white/5 p-2 rounded-sm">
                    <div className="text-[10px] text-stone-400 uppercase">Mois suivants</div>
                    <div className="font-serif text-base font-bold text-white mt-0.5">${numRetainer.toFixed(2)}</div>
                    <div className="text-[10px] text-stone-400 truncate">Abonnement + ${numRate}/min</div>
                  </div>
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
                <>
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

                  <div className="p-4 bg-[#faf9f7] border border-[#e2dfd8] rounded-sm flex items-center justify-between mt-3">
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
                </>
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
