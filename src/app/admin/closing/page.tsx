'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  Building2, 
  CreditCard, 
  Bot, 
  Sparkles, 
  Check, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Video
} from 'lucide-react'
import { getRetellAgentsAction, getAirtableBookedLeadsAction } from '../actions'
import { supabase } from '@/lib/supabase/client'

export default function ClosingVisioPage() {
  // Airtable Leads dropdown state
  const [airtableLeads, setAirtableLeads] = useState<any[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [airtableRecordId, setAirtableRecordId] = useState('')

  // Prospect states
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')

  // Custom Pricing states
  const [setupFee, setSetupFee] = useState('0')
  const [setupInstallments, setSetupInstallments] = useState<number>(1) // 1, 2, or 3
  const [billingRate, setBillingRate] = useState('0.50')
  const [retainer, setRetainer] = useState('500')
  const [discountPercent, setDiscountPercent] = useState('')
  const [discountMonths, setDiscountMonths] = useState('3')
  const [showDiscountInput, setShowDiscountInput] = useState(false)

  // Voice Agent states (Optional)
  const [initialAgentToAssign, setInitialAgentToAssign] = useState('')
  const [forwardWebhookUrl, setForwardWebhookUrl] = useState('')
  const [backfillHistory, setBackfillHistory] = useState(false)
  const [retellAgents, setRetellAgents] = useState<any[]>([])

  // Generator & Checkout Result states
  const [generating, setGenerating] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  const [generatedClientId, setGeneratedClientId] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'waiting' | 'paid'>('idle')
  const [copied, setCopied] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchAirtableLeads()
    fetchRetellAgents()
  }, [])

  // Poll for payment completion when a link has been generated
  useEffect(() => {
    if (!generatedClientId || paymentStatus === 'paid') return

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('clients')
          .select('status')
          .eq('id', generatedClientId)
          .single()

        if (data?.status === 'Active' || data?.status === 'Actif') {
          setPaymentStatus('paid')
          toast.success("Paiement validé avec succès ! Le compte client est activé.", { duration: 6000 })
        }
      } catch (err) {
        console.error("Error polling payment status:", err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [generatedClientId, paymentStatus])

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

  // Live simulation calculations
  const numSetup = parseFloat(setupFee) || 0
  const numRetainer = parseFloat(retainer) || 0
  const numRate = parseFloat(billingRate) || 0
  const numDiscount = parseFloat(discountPercent) || 0
  const discountFactor = numDiscount > 0 ? (1 - numDiscount / 100) : 1
  const discountedRetainer = Math.max(0, numRetainer * discountFactor)

  const setupPerInstallment = setupInstallments > 0 ? numSetup / setupInstallments : numSetup
  const todayDue = (setupInstallments > 1 ? setupPerInstallment : numSetup) + (numDiscount > 0 ? discountedRetainer : numRetainer)
  const month2Total = (setupInstallments >= 2 ? setupPerInstallment : 0) + (parseInt(discountMonths) >= 2 && numDiscount > 0 ? discountedRetainer : numRetainer)
  const month3Total = (setupInstallments >= 3 ? setupPerInstallment : 0) + (parseInt(discountMonths) >= 3 && numDiscount > 0 ? discountedRetainer : numRetainer)

  const handleGeneratePaymentLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    const toastId = toast.loading("Génération de la session Stripe Checkout...")

    try {
      const res = await fetch('/api/admin/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          company_name: companyName,
          billing_rate: numRate,
          monthly_retainer: numRetainer,
          setup_fee: numSetup,
          setup_installments: setupInstallments,
          discount_percent: discountPercent ? parseFloat(discountPercent) : 0,
          discount_duration_months: discountMonths ? parseInt(discountMonths) : 1,
          airtable_record_id: airtableRecordId || undefined,
          retell_agent_id: initialAgentToAssign || undefined,
          forward_webhook_url: forwardWebhookUrl || undefined,
          backfill_history: backfillHistory
        })
      })

      const data = await res.json()

      if (res.ok && data.success && data.checkoutUrl) {
        setGeneratedLink(data.checkoutUrl)
        setGeneratedClientId(data.clientId)
        setPaymentStatus('waiting')
        setShowModal(true)

        // Try automatic copy right away
        try {
          await navigator.clipboard.writeText(data.checkoutUrl)
          setCopied(true)
          toast.success("✅ Lien copié dans le presse-papier ! Collez-le (Ctrl+V) dans votre visio.", { id: toastId, duration: 6000 })
        } catch {
          toast.success("Lien de paiement prêt ! Copiez-le ci-dessous.", { id: toastId })
        }
      } else {
        toast.error(data.error || "Erreur lors de la génération du lien", { id: toastId })
      }
    } catch (err: any) {
      toast.error("Erreur de connexion avec le serveur", { id: toastId })
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyLink = async () => {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      toast.success("✅ Lien copié dans le presse-papier ! Envoyez-le dans le chat visio.")
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error("Impossible de copier automatiquement. Veuillez sélectionner et copier le lien manuellement.")
    }
  }

  const handleResetForm = () => {
    setGeneratedLink('')
    setGeneratedClientId('')
    setPaymentStatus('idle')
    setShowModal(false)
    setSelectedLeadId('')
    setAirtableRecordId('')
    setCompanyName('')
    setEmail('')
    setSetupFee('0')
    setSetupInstallments(1)
    setRetainer('500')
    setDiscountPercent('')
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
              <Video className="w-3.5 h-3.5 text-[#9e4733]" /> CLOSING EN DIRECT • VISIO
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">
              Générateur de Lien de Paiement
            </h1>
            <p className="text-sm text-[#73706b]">
              Générez un lien Stripe instantané, envoyez-le dans le chat visio. Le compte sera créé automatiquement après validation du paiement.
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

        {/* POPUP MODAL EN PLEIN ÉCRAN LORSQU'UN LIEN EST GÉNÉRÉ */}
        {showModal && generatedLink && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border-2 border-[#9e4733] rounded-sm max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
              
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] text-[#9e4733] uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-[#9e4733]" /> LIEN DE CLOSING GÉNÉRÉ
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-[#1a1918]">
                    Prêt à envoyer sur la visio !
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-stone-400 hover:text-[#1a1918] p-1 text-2xl font-bold leading-none cursor-pointer"
                  title="Fermer"
                >
                  &times;
                </button>
              </div>

              <div className="p-3.5 bg-[#faf8f5] border border-[#e2dfd8] rounded-sm flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#73706b]">Client : </span>
                  <strong className="text-[#1a1918]">{companyName}</strong>
                </div>
                <div>
                  <span className="text-[#73706b]">À régler maintenant : </span>
                  <strong className="text-[#9e4733] font-mono text-sm font-bold">${todayDue.toFixed(2)}</strong>
                </div>
              </div>

              {/* URL Display */}
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-[#66635e]">
                  Lien Stripe Checkout sécurisé :
                </Label>
                <div className="relative">
                  <Input
                    readOnly
                    value={generatedLink}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="border-[#e2dfd8] bg-[#faf9f7] font-mono text-xs select-all h-12 pr-10 font-bold"
                  />
                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-[#1a1918]"
                    title="Ouvrir la page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* HUGE COPY BUTTON */}
              <Button
                type="button"
                onClick={handleCopyLink}
                className="w-full h-14 bg-[#1a1918] hover:bg-[#2d2d2d] text-white rounded-sm text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-400" />
                    LIEN COPIÉ DANS LE PRESSE-PAPIER !
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 text-amber-400" />
                    COPIER LE LIEN POUR LA VISIO
                  </>
                )}
              </Button>

              {/* Real-time Status Card in Modal */}
              <div className={`p-3.5 rounded-sm border text-xs flex items-center gap-3 ${
                paymentStatus === 'paid'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-stone-50 border-stone-200 text-stone-700'
              }`}>
                {paymentStatus === 'paid' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="text-emerald-900">Paiement validé avec succès !</strong> Le compte est activé et l'email pour créer le mot de passe a été envoyé à {email}.
                    </div>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9e4733] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#9e4733]"></span>
                    </span>
                    <div>
                      En attente du règlement du prospect... Collez-lui le lien dans le chat de la visio.
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <a
                  href={generatedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#9e4733] hover:underline flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ouvrir la page de paiement &rarr;
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(false)}
                  className="text-xs text-[#73706b] hover:text-[#1a1918]"
                >
                  Fermer cette fenêtre
                </Button>
              </div>

            </div>
          </div>
        )}

        {/* ACTIVE GENERATED LINK CARD */}
        {generatedLink && (
          <Card className={`border-2 rounded-sm shadow-[0_4px_30px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300 ${paymentStatus === 'paid' ? 'border-emerald-500 bg-emerald-50/40' : 'border-[#9e4733] bg-[#fffdfa]'}`}>
            <CardHeader className="py-4 px-6 border-b border-[#e6e2d6] bg-white flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                {paymentStatus === 'paid' ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#9e4733]/10 flex items-center justify-center text-[#9e4733]">
                    <Zap className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-semibold tracking-wider text-[#9e4733] uppercase">
                    {paymentStatus === 'paid' ? '• SUCCÈS COMMERCIAL' : '• PRÊT POUR LA VISIO'}
                  </div>
                  <CardTitle className="font-serif text-lg font-bold text-[#1a1918]">
                    {paymentStatus === 'paid' ? 'Paiement Validé & Compte Activé !' : 'Lien de Paiement Actif'}
                  </CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetForm}
                  className="text-xs text-[#73706b] hover:text-[#1a1918] h-8 px-2.5 border-[#e2dfd8]"
                >
                  Nouveau lien
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              
              {/* Payment Link Display & Copy Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                    Lien Stripe Checkout à envoyer dans le chat visio :
                  </Label>
                  <span className="text-[11px] font-medium text-[#73706b]">
                    Montant dû aujourd'hui : <strong className="text-[#1a1918] font-mono">${todayDue.toFixed(2)}</strong>
                  </span>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    readOnly
                    value={generatedLink}
                    className="border-[#e2dfd8] bg-white font-mono text-xs select-all h-11"
                  />
                  <Button
                    type="button"
                    onClick={handleCopyLink}
                    className="bg-[#1a1918] hover:bg-[#2d2d2d] text-white rounded-sm h-11 px-5 text-xs font-semibold tracking-wider uppercase shrink-0 flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" /> Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copier pour la Visio
                      </>
                    )}
                  </Button>
                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[#e2dfd8] hover:bg-white text-[#1a1918] rounded-sm h-11 px-3.5 text-xs shrink-0"
                      title="Ouvrir la page de paiement"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>

              {/* Real-time Status Card */}
              <div className={`p-4 rounded-sm border flex items-center justify-between ${
                paymentStatus === 'paid' 
                  ? 'bg-emerald-100/60 border-emerald-300 text-emerald-950' 
                  : 'bg-[#faf8f5] border-[#e2dfd8] text-[#1a1918]'
              }`}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-medium text-xs">
                    {paymentStatus === 'paid' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-emerald-900">Paiement reçu et validé avec succès !</span>
                      </>
                    ) : (
                      <>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9e4733] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#9e4733]"></span>
                        </span>
                        <span>En attente du règlement du prospect sur la visio...</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-[#73706b]">
                    {paymentStatus === 'paid' 
                      ? `L'e-mail avec le lien pour créer son mot de passe a été automatiquement envoyé à ${email}.`
                      : 'Dès que votre prospect valide sa carte bancaire, cette alerte passera au vert instantanément.'}
                  </p>
                </div>

                {paymentStatus === 'paid' && generatedClientId && (
                  <Link href={`/admin/client/${generatedClientId}`}>
                    <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900 text-white rounded-sm text-xs font-semibold uppercase">
                      Voir la fiche client &rarr;
                    </Button>
                  </Link>
                )}
              </div>

            </CardContent>
          </Card>
        )}

        {/* Full Page Form */}
        <form onSubmit={handleGeneratePaymentLink} className="space-y-6">
          
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
                        {displayDate ? `[RDV ${displayDate}] • ` : ''}{lead.companyName}{lead.fullName ? ` (${lead.fullName})` : ''} — {lead.email || 'Pas d\'email'}{lead.isRegistered ? ' [Déjà inscrit]' : ''}
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
                <span>•</span> ÉTAPE 1
              </div>
              <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#9e4733]" /> Profil & Facturation du Prospect
              </CardTitle>
              <CardDescription className="text-xs text-[#73706b]">
                Ces coordonnées serviront à créer le client Stripe et à envoyer le lien de création du compte après le paiement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                  Nom de l'Entreprise <span className="text-[#9e4733]">*</span>
                </Label>
                <Input 
                  required 
                  value={companyName} 
                  onChange={e => setCompanyName(e.target.value)} 
                  placeholder="ex: Cabinet Dentaire Martin" 
                  className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                  Email du Prospect <span className="text-[#9e4733]">*</span>
                </Label>
                <Input 
                  required 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="contact@entreprise.com" 
                  className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" 
                />
                <p className="text-[11px] text-[#73706b]">
                  Cet email sera pré-rempli sur Stripe Checkout et recevra l'accès dashboard une fois la facture réglée.
                </p>
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
                <CreditCard className="w-5 h-5 text-[#9e4733]" /> Tarification Sur-Mesure & Modalités
              </CardTitle>
              <CardDescription className="text-xs text-[#73706b]">
                Définissez les montants négociés avec votre prospect pendant la visio.
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
                    <p className="text-[11px] text-[#73706b]">Facturés à l'onboarding (0 si offert)</p>
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
                        1x Comptant (${numSetup})
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
                  <p className="text-[11px] text-[#73706b]">Montant fixe prélevé chaque mois.</p>
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
                  <p className="text-[11px] text-[#73706b]">Facturé à la seconde selon les appels.</p>
                </div>
              </div>

              {/* Ristourne / Remise Optionnelle */}
              <div className="border-t border-[#f0ece4] pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#1a1918]">Ristourne / Remise Commerciale (Optionnel)</span>
                    <p className="text-[11px] text-[#73706b]">Génère un coupon de réduction appliqué sur Stripe Checkout.</p>
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
                  <Sparkles className="w-3 h-3 text-[#9e4733]" /> SIMULATION CE QUE LE CLIENT PAYE EN VISIO
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5 text-xs">
                  <div className="bg-white/10 p-2.5 rounded-sm border border-white/10">
                    <div className="text-[10px] text-amber-300 font-semibold uppercase">Sur la Visio (Aujourd'hui)</div>
                    <div className="font-serif text-lg font-bold text-white mt-0.5">${todayDue.toFixed(2)}</div>
                    <div className="text-[10px] text-stone-300 truncate">
                      {numSetup > 0 ? `Setup (${setupInstallments > 1 ? `1/${setupInstallments}` : '1x'}) + ` : ''}1er mois
                    </div>
                  </div>

                  <div className="bg-white/5 p-2.5 rounded-sm">
                    <div className="text-[10px] text-stone-400 uppercase">Mois 2 {setupInstallments >= 3 ? '& 3' : ''}</div>
                    <div className="font-serif text-lg font-bold text-white mt-0.5">
                      ${setupInstallments >= 2 ? month2Total.toFixed(2) : numRetainer.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-stone-400 truncate">
                      {setupInstallments >= 2 ? 'Échéance setup + ' : ''}Abonnement
                    </div>
                  </div>

                  <div className="bg-white/5 p-2.5 rounded-sm">
                    <div className="text-[10px] text-stone-400 uppercase">Mois suivants</div>
                    <div className="font-serif text-lg font-bold text-white mt-0.5">${numRetainer.toFixed(2)}</div>
                    <div className="text-[10px] text-stone-400 truncate">Abonnement + ${numRate}/min</div>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Card 3: Voice Agent Assignment (Optional) */}
          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                <span>•</span> ÉTAPE 3 (OPTIONNEL)
              </div>
              <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#9e4733]" /> Affectation de l'Agent IA Retell
              </CardTitle>
              <CardDescription className="text-xs text-[#73706b]">
                Associez immédiatement un agent vocal au client, ou faites-le ultérieurement depuis sa fiche.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">
                  Sélectionner un Agent Retell IA
                </Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-sm border border-[#e2dfd8] bg-[#faf9f7]/50 px-3 py-2 text-sm text-[#1a1918] focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
                  value={initialAgentToAssign}
                  onChange={e => setInitialAgentToAssign(e.target.value)}
                >
                  <option value="">-- Aucun agent immédiat (assigner plus tard) --</option>
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
                    Webhook de relais / Make / n8n (Optionnel)
                  </Label>
                  <Input 
                    value={forwardWebhookUrl} 
                    onChange={e => setForwardWebhookUrl(e.target.value)} 
                    placeholder="https://hook.eu1.make.com/... ou n8n webhook" 
                    className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-xs font-mono" 
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Card for Instant Visibility & 1-Click Copy */}
          {generatedLink && (
            <div className="p-4 sm:p-5 bg-[#fffdfa] border-2 border-[#9e4733] rounded-sm space-y-3 shadow-lg animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#9e4733]/10 flex items-center justify-center text-[#9e4733] shrink-0">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1a1918]">
                      Lien de paiement prêt à envoyer :
                    </span>
                    <span className="text-[11px] text-[#73706b] ml-2">
                      (${todayDue.toFixed(2)} à régler)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setShowModal(true)}
                    variant="outline"
                    size="sm"
                    className="text-xs border-[#e2dfd8] h-8 px-2.5"
                  >
                    Agrandir
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  readOnly
                  value={generatedLink}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="bg-white border-[#e2dfd8] font-mono text-xs h-12 select-all font-bold"
                />
                <Button
                  type="button"
                  onClick={handleCopyLink}
                  className="bg-[#1a1918] hover:bg-[#2d2d2d] text-white rounded-sm h-12 px-6 text-xs font-bold tracking-wider uppercase shrink-0 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" /> Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" /> Copier pour la Visio
                    </>
                  )}
                </Button>
                <a
                  href={generatedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#e2dfd8] hover:bg-white text-[#1a1918] rounded-sm h-12 px-3.5 text-xs shrink-0"
                    title="Ouvrir la page de paiement"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>

              {/* Status indicator in bottom card */}
              <div className="text-[11px] text-[#73706b] flex items-center gap-2 pt-1 border-t border-[#e2dfd8]/60">
                {paymentStatus === 'paid' ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Paiement reçu et validé ! Compte activé.
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9e4733] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#9e4733]"></span>
                    </span>
                    En attente du paiement du prospect sur la visio (détection temps réel)...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action CTA */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <Link href="/admin">
              <Button type="button" variant="outline" className="border-[#e6e2d6] bg-white text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-11 px-6">
                Annuler
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={generating}
              className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm h-12 px-8 text-xs font-semibold tracking-wider uppercase transition-all shadow-none flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {generating ? (
                'Génération en cours...'
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-400" /> Générer le lien de paiement (Closing Visio) <span className="text-[#9e4733] text-[16px] leading-none">•</span>
                </>
              )}
            </Button>
          </div>

        </form>

      </div>
    </div>
  )
}
