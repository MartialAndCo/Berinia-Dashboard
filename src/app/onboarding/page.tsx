'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  CreditCard, Check, ArrowRight, ArrowLeft, ShieldCheck, 
  Building2, Phone, Clock, Loader2, MapPin, Mail 
} from 'lucide-react'
import { 
  getOnboardingInitialDataAction, 
  createStripeSetupSessionAction, 
  saveInitialValidationAction,
  OnboardingInitialState 
} from './actions'
import PageLoading from '@/components/PageLoading'

const US_PHONE_PROVIDERS = [
  'Verizon',
  'AT&T',
  'T-Mobile',
  'RingCentral',
  'Vonage',
  'Twilio',
  'Comcast Business',
  'Spectrum',
  'Google Voice',
  'Grasshopper',
  '8x8',
  'Nextiva',
  'Ooma',
  'Other Carrier'
]

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cardSuccessParam = searchParams?.get('card_success')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  // Account & billing state
  const [initialData, setInitialData] = useState<OnboardingInitialState | null>(null)
  const [cardLoading, setCardLoading] = useState(false)
  const [hasCard, setHasCard] = useState(false)
  const [cardBrand, setCardBrand] = useState('')
  const [cardLast4, setCardLast4] = useState('')

  // Business Profile fields
  const [businessName, setBusinessName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [phoneProvider, setPhoneProvider] = useState('')
  const [customProvider, setCustomProvider] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [openingHours, setOpeningHours] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getOnboardingInitialDataAction()
      if (!res.isAuth) {
        router.push('/login')
        return
      }

      setInitialData(res)

      // Payment Status
      const cardAttached = !res.paymentStatus.needsPaymentMethod && Boolean(res.paymentStatus.cardInfo)
      setHasCard(cardAttached)
      if (res.paymentStatus.cardInfo) {
        setCardBrand(res.paymentStatus.cardInfo.brand)
        setCardLast4(res.paymentStatus.cardInfo.last4)
      }

      // Pre-fill business info quietly
      const p = res.prefilledData
      if (p.businessName) setBusinessName(p.businessName)
      if (p.email) setContactEmail(p.email)
      if (p.businessPhoneNumber) setBusinessPhone(p.businessPhoneNumber)
      if (p.phoneProvider) {
        if (US_PHONE_PROVIDERS.includes(p.phoneProvider)) {
          setPhoneProvider(p.phoneProvider)
        } else {
          setPhoneProvider('Other Carrier')
          setCustomProvider(p.phoneProvider)
        }
      }
      if (p.businessAddress) setBusinessAddress(p.businessAddress)
      if (p.openingHours) setOpeningHours(p.openingHours)

      // If user came back from card setup or already has a card active, advance to step 2
      if (cardSuccessParam && cardAttached) {
        toast.success("Payment method verified successfully!")
        setStep(2)
      } else if (cardAttached) {
        setStep(2)
      }
    } catch (err) {
      console.error('Error loading validation data:', err)
      toast.error("Failed to load business profile.")
    } finally {
      setLoading(false)
    }
  }

  const handleAddCard = async () => {
    setCardLoading(true)
    try {
      const res = await createStripeSetupSessionAction(window.location.origin)
      if (res.success && res.url) {
        window.location.href = res.url
      } else {
        toast.error(res.error || "Unable to open secure checkout.")
      }
    } catch (e: any) {
      toast.error(e?.message || "Payment setup error")
    } finally {
      setCardLoading(false)
    }
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!businessName.trim()) {
      toast.error("Please enter your business name.")
      return
    }

    setSubmitting(true)
    const toastId = toast.loading("Saving your information...")

    try {
      const selectedCarrier = phoneProvider === 'Other Carrier' ? (customProvider.trim() || 'Other') : phoneProvider

      const payload = {
        businessName: businessName.trim(),
        contactEmail: contactEmail.trim(),
        businessPhone: businessPhone.trim(),
        phoneProvider: selectedCarrier,
        businessAddress: businessAddress.trim(),
        openingHours: openingHours.trim()
      }

      const res = await saveInitialValidationAction(payload)
      if (res.success) {
        toast.success("Information confirmed! Welcome to your dashboard.", { id: toastId, duration: 4000 })
        window.location.href = '/dashboard'
      } else {
        toast.error(res.error || "Submission error. Please try again.", { id: toastId })
        setSubmitting(false)
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.", { id: toastId })
      setSubmitting(false)
    }
  }

  if (loading) {
    return <PageLoading message="Preparing your account verification..." />
  }

  return (
    <div className="min-h-screen bg-[#f6f4f0] text-[#1a1918] py-8 sm:py-14 px-4 flex flex-col justify-center">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <img src="/logo-horizontal-black.png" alt="BerinAgents" className="h-8 w-auto object-contain" />
          </div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
            <span>•</span> ACCOUNT VERIFICATION
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1918]">
            Validate Your Information
          </h1>
          <p className="text-xs sm:text-sm text-[#73706b] max-w-lg mx-auto">
            Please confirm your payment method and business profile to access your portal.
          </p>
        </div>

        {/* 2-Step Progress Indicator */}
        <div className="bg-white border border-[#e6e2d6] rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            {/* Step 1 Pill */}
            <div 
              onClick={() => { if (hasCard) setStep(1) }}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                step === 1 
                  ? 'border-[#9e4733] bg-[#fdf2f0]/60 ring-1 ring-[#9e4733]/20' 
                  : hasCard 
                    ? 'border-emerald-200 bg-emerald-50/50 hover:bg-stone-50' 
                    : 'border-[#e6e2d6] bg-[#faf8f5]'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all ${
                hasCard 
                  ? 'bg-emerald-600 text-white' 
                  : step === 1 
                    ? 'bg-[#9e4733] text-white shadow-sm' 
                    : 'bg-[#faf8f5] text-[#73706b] border border-[#e6e2d6]'
              }`}>
                {hasCard ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#1a1918] truncate">Payment Method</div>
                <div className="text-[11px] text-[#73706b] truncate">
                  {hasCard ? `${cardBrand.toUpperCase()} •••• ${cardLast4 || '4242'}` : 'Required for activation'}
                </div>
              </div>
            </div>

            {/* Step 2 Pill */}
            <div 
              onClick={() => { if (hasCard) setStep(2) }}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                step === 2 
                  ? 'border-[#9e4733] bg-[#fdf2f0]/60 ring-1 ring-[#9e4733]/20 cursor-pointer' 
                  : hasCard 
                    ? 'border-[#e6e2d6] bg-white hover:bg-stone-50 cursor-pointer' 
                    : 'border-[#e6e2d6] bg-[#faf8f5] opacity-60 cursor-not-allowed'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all ${
                step === 2 
                  ? 'bg-[#9e4733] text-white shadow-sm' 
                  : 'bg-[#faf8f5] text-[#73706b] border border-[#e6e2d6]'
              }`}>
                2
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#1a1918] truncate">Business Profile</div>
                <div className="text-[11px] text-[#73706b] truncate">
                  Name, phone & operating hours
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <Card className="border border-[#e6e2d6] shadow-sm bg-white rounded-xl overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            
            {/* STEP 1: PAYMENT METHOD */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="border-b border-[#f0ede6] pb-4">
                  <div className="flex items-center gap-2 text-[#9e4733] text-xs font-semibold uppercase tracking-wider">
                    <CreditCard className="w-4 h-4" /> Step 1 of 2
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-[#1a1918] mt-1">
                    Payment Method
                  </h2>
                  <p className="text-xs sm:text-sm text-[#73706b] mt-1">
                    Attach a payment card to guarantee seamless line provision, minute usage, and monthly plan coverage.
                  </p>
                </div>

                {hasCard ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-emerald-950">Payment Card Active</div>
                          <div className="text-xs text-emerald-800 uppercase font-mono mt-0.5">
                            {cardBrand || 'Card'} •••• {cardLast4 || '4242'}
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        VERIFIED
                      </span>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        onClick={() => setStep(2)}
                        className="bg-[#1a1918] hover:bg-[#33312e] text-white flex-1 h-11 text-xs uppercase tracking-wider font-semibold cursor-pointer"
                      >
                        Continue to Business Profile <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddCard}
                        disabled={cardLoading}
                        className="border-[#e6e2d6] text-[#73706b] hover:text-[#1a1918] h-11 text-xs cursor-pointer"
                      >
                        {cardLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update Card'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-[#e6e2d6] bg-[#faf8f5] p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-[#9e4733] shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs text-[#73706b] leading-relaxed">
                          <div className="font-semibold text-[#1a1918]">Enterprise-Grade Encryption</div>
                          Your card is stored directly with Stripe. BerinAgents never stores raw card credentials.
                          You will be able to review all minute consumption and download VAT invoices anytime from your billing tab.
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button
                        type="button"
                        onClick={handleAddCard}
                        disabled={cardLoading}
                        className="w-full bg-[#9e4733] hover:bg-[#853c2b] text-white h-12 text-sm font-semibold tracking-wide shadow-sm cursor-pointer"
                      >
                        {cardLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Secure Stripe Setup...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" /> Add Payment Card via Stripe
                          </span>
                        )}
                      </Button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-xs text-[#73706b] hover:text-[#1a1918] underline transition-colors cursor-pointer"
                        >
                          I have already added my card or am testing in demo mode →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: BUSINESS PROFILE */}
            {step === 2 && (
              <form onSubmit={handleFinalSubmit} className="space-y-6">
                <div className="border-b border-[#f0ede6] pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#9e4733] text-xs font-semibold uppercase tracking-wider">
                      <Building2 className="w-4 h-4" /> Step 2 of 2
                    </div>
                    {hasCard && (
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-xs text-[#73706b] hover:text-[#1a1918] flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Payment
                      </button>
                    )}
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-[#1a1918] mt-1">
                    Business Profile
                  </h2>
                  <p className="text-xs sm:text-sm text-[#73706b] mt-1">
                    Confirm your company details. Once validated, you will immediately gain access to your client dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  
                  {/* Business Name */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-[#1a1918] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#9e4733]" /> Business Name *
                    </Label>
                    <Input
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder="e.g. Acme Dental Group"
                      className="bg-white border-[#e6e2d6] focus-visible:ring-[#9e4733] text-sm h-11"
                      required
                    />
                  </div>

                  {/* Contact Email */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1a1918] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#9e4733]" /> Contact Email *
                    </Label>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="billing@company.com"
                      className="bg-white border-[#e6e2d6] focus-visible:ring-[#9e4733] text-sm h-11"
                      required
                    />
                  </div>

                  {/* Business Phone Number */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1a1918] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#9e4733]" /> Business Phone Number
                    </Label>
                    <Input
                      value={businessPhone}
                      onChange={e => setBusinessPhone(e.target.value)}
                      placeholder="e.g. +1 (555) 234-5678"
                      className="bg-white border-[#e6e2d6] focus-visible:ring-[#9e4733] text-sm h-11"
                    />
                  </div>

                  {/* Phone Provider (US selection) */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-[#1a1918]">
                      Current Phone Carrier / Provider
                    </Label>
                    <select
                      value={phoneProvider}
                      onChange={e => setPhoneProvider(e.target.value)}
                      className="w-full h-11 px-3 rounded-md border border-[#e6e2d6] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9e4733]"
                    >
                      <option value="">Select your phone provider (US)</option>
                      {US_PHONE_PROVIDERS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>

                    {phoneProvider === 'Other Carrier' && (
                      <Input
                        value={customProvider}
                        onChange={e => setCustomProvider(e.target.value)}
                        placeholder="Enter your phone carrier name"
                        className="mt-2 bg-white border-[#e6e2d6] focus-visible:ring-[#9e4733] text-sm h-10"
                      />
                    )}
                    <p className="text-[11px] text-[#73706b]">
                      Used by our telephony engineers to configure call forwarding and SIP trunking.
                    </p>
                  </div>

                  {/* Full Business Address */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-[#1a1918] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#9e4733]" /> Business Full Address
                    </Label>
                    <Input
                      value={businessAddress}
                      onChange={e => setBusinessAddress(e.target.value)}
                      placeholder="e.g. 742 Evergreen Terrace, Springfield, OR 97477"
                      className="bg-white border-[#e6e2d6] focus-visible:ring-[#9e4733] text-sm h-11"
                    />
                  </div>

                  {/* Business Opening Hours */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-[#1a1918] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#9e4733]" /> Business Opening Hours
                    </Label>
                    <Input
                      value={openingHours}
                      onChange={e => setOpeningHours(e.target.value)}
                      placeholder="e.g. Mon–Fri 8:00 AM – 6:00 PM EST, Sat 9:00 AM – 2:00 PM EST"
                      className="bg-white border-[#e6e2d6] focus-visible:ring-[#9e4733] text-sm h-11"
                    />
                  </div>

                </div>

                <div className="pt-4 border-t border-[#f0ede6] flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#1a1918] hover:bg-[#33312e] text-white h-12 text-sm font-semibold tracking-wide shadow-md cursor-pointer"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Confirming Information...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Confirm & Access Dashboard <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            )}

          </CardContent>
        </Card>

        {/* Reassurance Footer */}
        <div className="text-center text-[11px] text-[#73706b] flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#2e6930]" />
          <span>Need assistance? Contact <a href="mailto:support@berinagents.com" className="underline hover:text-[#1a1918]">support@berinagents.com</a></span>
        </div>

      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading validation portal..." />}>
      <OnboardingContent />
    </Suspense>
  )
}
