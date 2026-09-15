'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  Bot, Check, Lock, Sparkles, Phone, Upload, Globe, 
  Calendar, FileText, Trash2, CheckCircle2, Loader2, 
  ExternalLink, HelpCircle, ShieldCheck, AlertCircle, MessageSquare 
} from 'lucide-react'
import { 
  getClientAgentSetupStateAction, 
  saveAgentSpecificationsAction 
} from '@/app/onboarding/actions'
import PageLoading from '@/components/PageLoading'

const LANGUAGE_OPTIONS = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Other'
]

const PRIMARY_MISSIONS = [
  'Appointment Booking & Scheduling',
  'Lead Qualification & Inbound Intake',
  'General Customer Support & FAQ',
  'After-Hours Answering & Emergency Dispatch',
  'Outbound Follow-ups & Reminders',
  'Custom / Multi-purpose'
]

interface AgentSetupHubProps {
  clientId?: string
  onComplete?: () => void
}

export default function AgentSetupHub({ clientId, onComplete }: AgentSetupHubProps) {
  const [loading, setLoading] = useState(true)
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)

  // Agent Spec State
  const [businessName, setBusinessName] = useState('')
  const [preferredVoice, setPreferredVoice] = useState<'Female' | 'Male'>('Female')
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English'])
  const [selectedCallTypes, setSelectedCallTypes] = useState<string[]>(['Inbound'])
  const [mission, setMission] = useState(PRIMARY_MISSIONS[0])
  const [transferPhone, setTransferPhone] = useState('')
  const [calendarUrl, setCalendarUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [topFaqs, setTopFaqs] = useState('')
  const [notes, setNotes] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; size?: number }[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)

  // Track if initial load is done to prevent auto-saving during data population
  const isLoadedRef = useRef(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Load initial setup state
  useEffect(() => {
    async function loadSetupState() {
      setLoading(true)
      try {
        const res = await getClientAgentSetupStateAction(clientId)
        if (res.success && res.specs) {
          const s = res.specs
          if (s.businessName) setBusinessName(s.businessName)
          if (s.preferredVoice === 'Male' || s.preferredVoice === 'Female') {
            setPreferredVoice(s.preferredVoice)
          }
          if (s.requiredLanguages && s.requiredLanguages.length > 0) {
            setSelectedLanguages(s.requiredLanguages)
          }
          if (s.callTypes && s.callTypes.length > 0) {
            setSelectedCallTypes(s.callTypes)
          }
          if (s.mission) setMission(s.mission)
          if (s.transferPhone) setTransferPhone(s.transferPhone)
          if (s.calendarUrl) setCalendarUrl(s.calendarUrl)
          if (s.websiteUrl) setWebsiteUrl(s.websiteUrl)
          if (s.topFaqs) setTopFaqs(s.topFaqs)
          if (s.notes) setNotes(s.notes)
          if (s.uploadedDocuments) setUploadedFiles(s.uploadedDocuments)
          setIsSubmitted(Boolean(res.isSpecsSubmitted))
        }
      } catch (err) {
        console.error('Failed to load agent setup state:', err)
      } finally {
        setLoading(false)
        // Enable auto-saving after state is populated
        setTimeout(() => {
          isLoadedRef.current = true
        }, 300)
      }
    }
    loadSetupState()
  }, [clientId])

  // Core auto-save execution
  const executeAutoSave = useCallback(async (payload: any, markSubmitted = false) => {
    if (!isLoadedRef.current) return
    setSavingState('saving')
    try {
      const res = await saveAgentSpecificationsAction(payload, markSubmitted)
      if (res.success) {
        setSavingState('saved')
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      } else {
        setSavingState('error')
      }
    } catch (err) {
      console.error('Auto-save error:', err)
      setSavingState('error')
    }
  }, [])

  // Debounced auto-save function for input fields
  const triggerAutoSave = useCallback((updatedPartial: any = {}) => {
    if (!isLoadedRef.current) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setSavingState('saving')

    debounceTimerRef.current = setTimeout(() => {
      const fullPayload = {
        businessName,
        preferredVoice,
        requiredLanguages: selectedLanguages,
        callTypes: selectedCallTypes,
        mission,
        transferPhone,
        calendarUrl,
        websiteUrl,
        topFaqs,
        notes,
        uploadedDocuments: uploadedFiles,
        ...updatedPartial
      }
      executeAutoSave(fullPayload)
    }, 600)
  }, [
    businessName, preferredVoice, selectedLanguages, selectedCallTypes, 
    mission, transferPhone, calendarUrl, websiteUrl, topFaqs, notes, 
    uploadedFiles, executeAutoSave
  ])

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingFile(true)
    const file = files[0]
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/onboarding/upload', {
        method: 'POST',
        body: formData
      })
      const json = await res.json()
      if (res.ok && json.success) {
        const updated = [...uploadedFiles, { name: json.fileName, url: json.fileUrl, size: json.size }]
        setUploadedFiles(updated)
        toast.success(`Uploaded: ${json.fileName}`)
        executeAutoSave({ uploadedDocuments: updated })
      } else {
        toast.error(json.error || 'File upload failed.')
      }
    } catch (err: any) {
      toast.error('Network error uploading document.')
    } finally {
      setUploadingFile(false)
      e.target.value = ''
    }
  }

  const handleRemoveFile = (index: number) => {
    const updated = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(updated)
    executeAutoSave({ uploadedDocuments: updated })
  }

  const toggleLanguage = (lang: string) => {
    let next: string[]
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length > 1) {
        next = selectedLanguages.filter(l => l !== lang)
      } else {
        return
      }
    } else {
      next = [...selectedLanguages, lang]
    }
    setSelectedLanguages(next)
    executeAutoSave({ requiredLanguages: next })
  }

  const toggleCallType = (type: string) => {
    let next: string[]
    if (selectedCallTypes.includes(type)) {
      if (selectedCallTypes.length > 1) {
        next = selectedCallTypes.filter(t => t !== type)
      } else {
        return
      }
    } else {
      next = [...selectedCallTypes, type]
    }
    setSelectedCallTypes(next)
    executeAutoSave({ callTypes: next })
  }

  const handleVoiceSelect = (v: 'Female' | 'Male') => {
    setPreferredVoice(v)
    executeAutoSave({ preferredVoice: v })
  }

  const handleSubmitForReview = async () => {
    setSubmittingReview(true)
    const toastId = toast.loading('Submitting your specifications to engineering...')
    try {
      const payload = {
        businessName,
        preferredVoice,
        requiredLanguages: selectedLanguages,
        callTypes: selectedCallTypes,
        mission,
        transferPhone,
        calendarUrl,
        websiteUrl,
        topFaqs,
        notes,
        uploadedDocuments: uploadedFiles
      }
      const res = await saveAgentSpecificationsAction(payload, true)
      if (res.success) {
        setIsSubmitted(true)
        toast.success('Specifications submitted! Our voice engineers are actively building your agent.', { id: toastId, duration: 6000 })
        if (onComplete) onComplete()
      } else {
        toast.error(res.error || 'Failed to submit specifications', { id: toastId })
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error submitting specifications', { id: toastId })
    } finally {
      setSubmittingReview(false)
    }
  }

  // Calculate completion percentage
  const totalFields = 6
  let filledFields = 0
  if (preferredVoice) filledFields++
  if (selectedLanguages.length > 0) filledFields++
  if (selectedCallTypes.length > 0) filledFields++
  if (mission) filledFields++
  if (transferPhone.trim() || calendarUrl.trim()) filledFields++
  if (topFaqs.trim() || notes.trim() || uploadedFiles.length > 0 || websiteUrl.trim()) filledFields++
  const progressPercent = Math.round((filledFields / totalFields) * 100)

  if (loading) {
    return <PageLoading message="Loading Agent Setup Workspace..." />
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      
      {/* Top Notification Banner: Locked Status & Auto-Save */}
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 text-amber-900 uppercase tracking-wider">
                  Setup in progress
                </span>
                <span className="text-xs text-amber-800 font-medium">
                  • Telephony Line Pending
                </span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1a1918] mt-1">
                Your Voice AI Agent is Being Configured
              </h2>
              <p className="text-xs sm:text-sm text-[#73706b] mt-1 max-w-2xl leading-relaxed">
                Provide your conversational guidelines below so our engineering team can calibrate your AI persona, telephone routing, and company knowledge. Live call logs and analytics will unlock here automatically once line deployment is completed.
              </p>
            </div>
          </div>

          {/* Auto-save live indicator */}
          <div className="shrink-0 bg-white/90 border border-[#e6e2d6] rounded-xl px-3.5 py-2.5 shadow-2xs flex sm:flex-col items-center sm:items-end justify-between text-right">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {savingState === 'saving' && (
                <span className="flex items-center gap-1.5 text-[#9e4733]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </span>
              )}
              {savingState === 'saved' && (
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Changes saved
                </span>
              )}
              {savingState === 'idle' && (
                <span className="flex items-center gap-1.5 text-[#73706b]">
                  <Check className="w-3.5 h-3.5 text-stone-400" /> Continuous Auto-Save
                </span>
              )}
              {savingState === 'error' && (
                <span className="flex items-center gap-1.5 text-red-600">
                  <AlertCircle className="w-3.5 h-3.5" /> Save failed
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#73706b] mt-0.5 font-mono">
              {lastSavedTime ? `Last synced: ${lastSavedTime}` : 'Synced with Airtable'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 pt-4 border-t border-amber-200/60 flex items-center gap-4">
          <div className="flex-1 bg-amber-200/50 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-[#9e4733] h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[#1a1918] shrink-0 font-mono">
            {progressPercent}% Complete
          </span>
        </div>
      </div>

      {/* SECTION 1: VOICE PERSONA & COMMUNICATION CHANNELS */}
      <Card className="border border-[#e6e2d6] bg-white rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-5 sm:p-7 space-y-6">
          <div className="border-b border-[#f0ede6] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#9e4733]" />
              <h3 className="font-serif text-lg font-bold text-[#1a1918]">
                1. Voice Persona & Channels
              </h3>
            </div>
            <span className="text-[11px] text-[#73706b]">Instant auto-saved</span>
          </div>

          <div className="space-y-5">
            {/* Voice Gender Selection */}
            <div>
              <Label className="text-xs font-semibold text-[#1a1918] mb-2 block">
                Preferred Voice Persona
              </Label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => handleVoiceSelect('Female')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    preferredVoice === 'Female'
                      ? 'border-[#9e4733] bg-[#fdf2f0]/60 ring-2 ring-[#9e4733]/20'
                      : 'border-[#e6e2d6] bg-white hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#1a1918]">Female Persona</span>
                    {preferredVoice === 'Female' && (
                      <div className="w-5 h-5 rounded-full bg-[#9e4733] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#73706b] mt-1">
                    Warm, empathetic, professional American accent. Highly rated for customer service and dental/medical offices.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleVoiceSelect('Male')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    preferredVoice === 'Male'
                      ? 'border-[#9e4733] bg-[#fdf2f0]/60 ring-2 ring-[#9e4733]/20'
                      : 'border-[#e6e2d6] bg-white hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#1a1918]">Male Persona</span>
                    {preferredVoice === 'Male' && (
                      <div className="w-5 h-5 rounded-full bg-[#9e4733] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#73706b] mt-1">
                    Calm, authoritative, clear executive tone. Ideal for legal, financial advisory, and home services.
                  </p>
                </button>
              </div>
            </div>

            {/* Languages */}
            <div>
              <Label className="text-xs font-semibold text-[#1a1918] mb-2 block">
                Required Spoken Languages
              </Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map(lang => {
                  const isSelected = selectedLanguages.includes(lang)
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1a1918] text-white border-[#1a1918] shadow-xs'
                          : 'bg-[#faf8f5] text-[#73706b] border-[#e6e2d6] hover:text-[#1a1918]'
                      }`}
                    >
                      {isSelected ? `✓ ${lang}` : lang}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-[#73706b] mt-1.5">
                The AI can detect and dynamically switch languages mid-conversation if a caller asks.
              </p>
            </div>

            {/* Call Direction Types */}
            <div>
              <Label className="text-xs font-semibold text-[#1a1918] mb-2 block">
                Call Direction
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => toggleCallType('Inbound')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedCallTypes.includes('Inbound')
                      ? 'border-[#9e4733] bg-[#fdf2f0]/60 ring-1 ring-[#9e4733]/20'
                      : 'border-[#e6e2d6] bg-white hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1a1918]">Inbound Reception</span>
                    {selectedCallTypes.includes('Inbound') && <Check className="w-3.5 h-3.5 text-[#9e4733]" />}
                  </div>
                  <p className="text-[11px] text-[#73706b] mt-0.5">
                    Answers incoming calls 24/7 without hold times.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => toggleCallType('Outbound')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedCallTypes.includes('Outbound')
                      ? 'border-[#9e4733] bg-[#fdf2f0]/60 ring-1 ring-[#9e4733]/20'
                      : 'border-[#e6e2d6] bg-white hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1a1918]">Outbound Campaigns</span>
                    {selectedCallTypes.includes('Outbound') && <Check className="w-3.5 h-3.5 text-[#9e4733]" />}
                  </div>
                  <p className="text-[11px] text-[#73706b] mt-0.5">
                    Makes proactive reminder and follow-up calls to leads.
                  </p>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: MISSION & ROUTING */}
      <Card className="border border-[#e6e2d6] bg-white rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-5 sm:p-7 space-y-6">
          <div className="border-b border-[#f0ede6] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#9e4733]" />
              <h3 className="font-serif text-lg font-bold text-[#1a1918]">
                2. Mission & Call Routing
              </h3>
            </div>
            <span className="text-[11px] text-[#73706b]">Instant auto-saved</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Primary Mission */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-[#1a1918]">
                Primary Agent Mission
              </Label>
              <select
                value={mission}
                onChange={e => {
                  setMission(e.target.value)
                  executeAutoSave({ mission: e.target.value })
                }}
                className="w-full h-11 px-3 rounded-md border border-[#e6e2d6] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9e4733]"
              >
                {PRIMARY_MISSIONS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Emergency Fallback Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1a1918] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#9e4733]" /> Human Fallback / Transfer Line
              </Label>
              <Input
                value={transferPhone}
                onChange={e => {
                  setTransferPhone(e.target.value)
                  triggerAutoSave({ transferPhone: e.target.value })
                }}
                placeholder="e.g. +1 (555) 987-6543"
                className="bg-white border-[#e6e2d6] focus-visible:ring-[#9e4733] text-sm h-11"
              />
              <p className="text-[11px] text-[#73706b]">
                Where the AI will transfer if a caller requests an emergency or insists on a human.
              </p>
            </div>

            {/* Calendar URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1a1918] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#9e4733]" /> Booking Calendar URL
              </Label>
              <Input
                value={calendarUrl}
                onChange={e => {
                  setCalendarUrl(e.target.value)
                  triggerAutoSave({ calendarUrl: e.target.value })
                }}
                placeholder="https://calendly.com/your-team/30min"
                className="bg-white border-[#e6e2d6] focus-visible:ring-[#9e4733] text-sm h-11"
              />
              <p className="text-[11px] text-[#73706b]">
                Calendly, Cal.com, or booking portal link used to book confirmed appointments.
              </p>
            </div>

            {/* Website URL */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-[#1a1918] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#9e4733]" /> Business Website
              </Label>
              <Input
                value={websiteUrl}
                onChange={e => {
                  setWebsiteUrl(e.target.value)
                  triggerAutoSave({ websiteUrl: e.target.value })
                }}
                placeholder="https://www.yourbusiness.com"
                className="bg-white border-[#e6e2d6] focus-visible:ring-[#9e4733] text-sm h-11"
              />
              <p className="text-[11px] text-[#73706b]">
                Our AI crawler indexes your site to stay synced on products, services, and policies.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: KNOWLEDGE BASE & GUARDRAILS */}
      <Card className="border border-[#e6e2d6] bg-white rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-5 sm:p-7 space-y-6">
          <div className="border-b border-[#f0ede6] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#9e4733]" />
              <h3 className="font-serif text-lg font-bold text-[#1a1918]">
                3. Knowledge Base & Guardrails
              </h3>
            </div>
            <span className="text-[11px] text-[#73706b]">Instant auto-saved</span>
          </div>

          <div className="space-y-5">
            {/* Top FAQs */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1a1918] flex items-center justify-between">
                <span>Top Customer FAQs & Answers</span>
                <span className="text-[10px] text-[#73706b] font-normal">Optional</span>
              </Label>
              <textarea
                value={topFaqs}
                onChange={e => {
                  setTopFaqs(e.target.value)
                  triggerAutoSave({ topFaqs: e.target.value })
                }}
                rows={4}
                placeholder="Q: What are your payment options?&#10;A: We accept all major credit cards and offer 0% financing through CareCredit.&#10;&#10;Q: Do you accept insurance?&#10;A: Yes, we are in-network with Delta Dental, MetLife, and Cigna."
                className="w-full p-3 rounded-lg border border-[#e6e2d6] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9e4733] font-sans"
              />
              <p className="text-[11px] text-[#73706b]">
                Provide 2 or 3 of the most common questions your callers ask so the AI answers with pinpoint accuracy.
              </p>
            </div>

            {/* Special Guardrails / Do's & Don'ts */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1a1918] flex items-center justify-between">
                <span>Special Instructions & Guardrails (Things AI should never say)</span>
                <span className="text-[10px] text-[#73706b] font-normal">Optional</span>
              </Label>
              <textarea
                value={notes}
                onChange={e => {
                  setNotes(e.target.value)
                  triggerAutoSave({ notes: e.target.value })
                }}
                rows={3}
                placeholder="e.g. Never quote exact surgery prices over the phone; always instruct callers that an in-person diagnostic exam is required first."
                className="w-full p-3 rounded-lg border border-[#e6e2d6] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9e4733] font-sans"
              />
            </div>

            {/* Upload Supporting Documents */}
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-semibold text-[#1a1918] flex items-center justify-between">
                <span>Supporting Knowledge Documents</span>
                <span className="text-[10px] text-[#73706b] font-normal">PDF, DOCX, TXT, CSV (max 25MB)</span>
              </Label>

              <div className="border-2 border-dashed border-[#e6e2d6] hover:border-[#9e4733]/50 rounded-xl p-5 text-center transition-colors bg-[#faf8f5]/60">
                <input
                  type="file"
                  id="agent-setup-file"
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,.doc,.txt,.csv"
                  className="hidden"
                  disabled={uploadingFile}
                />
                <label
                  htmlFor="agent-setup-file"
                  className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                >
                  {uploadingFile ? (
                    <Loader2 className="w-8 h-8 text-[#9e4733] animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-stone-400 hover:text-[#9e4733] transition-colors" />
                  )}
                  <span className="text-xs font-semibold text-[#1a1918]">
                    {uploadingFile ? 'Uploading and indexing document...' : 'Click to upload brochures, menus, or pricing sheets'}
                  </span>
                  <span className="text-[11px] text-[#73706b]">
                    Instant upload & continuous sync with engineering
                  </span>
                </label>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 mt-3">
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-[#9e4733] shrink-0" />
                        <span className="font-medium text-[#1a1918] truncate">{file.name}</span>
                        {file.size && (
                          <span className="text-[10px] text-[#73706b] shrink-0 font-mono">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {file.url && (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#73706b] hover:text-[#1a1918] p-1"
                            title="View document"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                          title="Remove document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SUBMISSION / CONFIRMATION BANNER */}
      <div className="rounded-2xl border border-[#e6e2d6] bg-white p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-[#1a1918]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            {isSubmitted ? 'Specifications Active in Engineering Backlog' : 'Progress Automatically Saved'}
          </div>
          <p className="text-xs text-[#73706b] max-w-md">
            You can return and edit these specifications anytime. When you are ready for deployment, click the button to notify your assigned voice engineer.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            onClick={handleSubmitForReview}
            disabled={submittingReview}
            className="w-full sm:w-auto bg-[#1a1918] hover:bg-[#33312e] text-white h-11 px-6 text-xs font-semibold uppercase tracking-wider shadow-sm cursor-pointer"
          >
            {submittingReview ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
              </span>
            ) : isSubmitted ? (
              <span className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Update & Resubmit
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#9e4733]" /> Submit for Agent Activation
              </span>
            )}
          </Button>
        </div>
      </div>

    </div>
  )
}
