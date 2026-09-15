'use server'

import { createClient } from '@/utils/supabase/server'
import { getServiceSupabase } from '@/lib/supabase'
import { getSubscriptionStatusAction } from '@/app/dashboard/actions'
import { findAirtableLeadData, submitClientOnboardingToAirtable, ClientOnboardingFormData } from '@/lib/airtable'
import { extractOnboardingWithGemini, ExtractedOnboardingData } from '@/lib/fathom-analyzer'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any
})

export interface OnboardingInitialState {
  isAuth: boolean
  clientId?: string
  companyName: string
  email: string
  monthlyRetainer: number
  billingRatePerMin: number
  paymentStatus: {
    needsPaymentMethod: boolean
    payUrl: string | null
    cardInfo: { brand: string; last4: string } | null
  }
  isCompleted: boolean
  prefilledData: Partial<ClientOnboardingFormData>
}

/**
 * Loads the client's account info, checks payment card status,
 * and extracts pre-fill data from Fathom / Airtable transcripts with Gemini 3.6 Flash.
 */
export async function getOnboardingInitialDataAction(): Promise<OnboardingInitialState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      isAuth: false,
      companyName: '',
      email: '',
      monthlyRetainer: 500,
      billingRatePerMin: 0.50,
      paymentStatus: { needsPaymentMethod: true, payUrl: null, cardInfo: null },
      isCompleted: false,
      prefilledData: {}
    }
  }

  const supabaseAdmin = getServiceSupabase()
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const companyName = client?.company_name || user.user_metadata?.company_name || 'My Company'
  const email = client?.email || user.email || ''
  const monthlyRetainer = client?.monthly_retainer ?? 500
  const billingRatePerMin = client?.billing_rate_per_min ?? 0.50

  // 1. Check Stripe Payment Status
  let paymentStatus = {
    needsPaymentMethod: true,
    payUrl: null as string | null,
    cardInfo: null as { brand: string; last4: string } | null
  }

  if (client?.status === 'Demo' || client?.email === 'account@test.com') {
    paymentStatus = {
      needsPaymentMethod: false,
      payUrl: null,
      cardInfo: { brand: 'visa', last4: '4242' }
    }
  } else if (client?.stripe_subscription_id || client?.stripe_customer_id) {
    try {
      const subRes = await getSubscriptionStatusAction(client.stripe_subscription_id, client.id)
      if (subRes) {
        paymentStatus = {
          needsPaymentMethod: subRes.needsPaymentMethod,
          payUrl: subRes.payUrl || null,
          cardInfo: subRes.cardInfo || null
        }
      }
    } catch (err) {
      console.warn('[getOnboardingInitialData] Error checking subscription:', err)
    }
  }

  // 2. Check if onboarding was already completed
  const isCompleted = Boolean(
    user.user_metadata?.onboarding_completed ||
    user.user_metadata?.onboarding_data ||
    (client?.status === 'Active' && user.user_metadata?.onboarding_completed)
  )

  // 3. Pre-fill data from existing metadata or Fathom transcript
  let prefill: Partial<ClientOnboardingFormData> = {
    businessName: companyName,
    email: email,
    phoneProvider: '',
    businessPhoneNumber: '',
    businessAddress: '',
    openingHours: '',
    preferredVoice: 'Female',
    requiredLanguages: ['English'],
    callTypes: ['Inbound'],
    mission: '',
    transferPhone: '',
    calendarUrl: '',
    topFaqs: '',
    websiteUrl: '',
    notes: '',
    uploadedDocuments: []
  }

  // If already saved in user_metadata, restore it
  if (user.user_metadata?.onboarding_data) {
    prefill = { ...prefill, ...user.user_metadata.onboarding_data }
  } else {
    // 4. Retrieve Airtable Lead & Call Notes to extract using Gemini 3.6 Flash
    try {
      const airtableLead = await findAirtableLeadData(email, companyName)
      if (airtableLead?.fields) {
        const leadFields = airtableLead.fields
        const callNotes = leadFields['Call Notes'] || leadFields["Notes d'appel"] || ''
        const leadPhone = leadFields['Phone'] || leadFields['Téléphone'] || ''
        
        if (leadPhone) {
          prefill.businessPhoneNumber = leadPhone
        }

        // Run Gemini 3.6 Flash on Call Notes if available
        if (callNotes && typeof callNotes === 'string' && callNotes.length > 30) {
          const extracted: ExtractedOnboardingData | null = await extractOnboardingWithGemini(callNotes)
          if (extracted) {
            if (extracted.phoneProvider) prefill.phoneProvider = extracted.phoneProvider
            if (extracted.requiredLanguages && extracted.requiredLanguages.length > 0) {
              prefill.requiredLanguages = extracted.requiredLanguages
            }
            if (extracted.callTypes && extracted.callTypes.length > 0) {
              prefill.callTypes = extracted.callTypes
            }
            if (extracted.preferredVoice) prefill.preferredVoice = extracted.preferredVoice
            if (extracted.businessOpeningHours) prefill.openingHours = extracted.businessOpeningHours
            if (extracted.businessAddress) prefill.businessAddress = extracted.businessAddress
            if (extracted.transferPhone) prefill.transferPhone = extracted.transferPhone
            if (extracted.mission) prefill.mission = extracted.mission
          }
        }
      }
    } catch (err) {
      console.warn('[getOnboardingInitialData] Gemini pre-fill failed, proceeding with basic defaults:', err)
    }
  }

  return {
    isAuth: true,
    clientId: client?.id,
    companyName,
    email,
    monthlyRetainer,
    billingRatePerMin,
    paymentStatus,
    isCompleted,
    prefilledData: prefill
  }
}

/**
 * Creates a Stripe card setup checkout session or billing portal link
 */
export async function createStripeSetupSessionAction(origin?: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = getServiceSupabase()
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!client) return { success: false, error: 'Client record not found' }

    let stripeCustomerId = client.stripe_customer_id

    // Create customer if needed
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: client.email || user.email || undefined,
        name: client.company_name,
        preferred_locales: ['en'],
        metadata: { clientId: client.id, userId: user.id }
      })
      stripeCustomerId = customer.id
      await supabaseAdmin.from('clients').update({ stripe_customer_id: stripeCustomerId }).eq('id', client.id)
    }

    const appOrigin = origin || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.berinagents.com'

    // If there is an unpaid/incomplete subscription with a hosted invoice, redirect to that
    if (client.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(client.stripe_subscription_id, {
          expand: ['latest_invoice']
        })
        const inv = sub.latest_invoice as any
        if (inv && typeof inv !== 'string' && inv.hosted_invoice_url) {
          return { success: true, url: inv.hosted_invoice_url }
        }
      } catch (e) {
        console.warn('Subscription invoice check failed:', e)
      }
    }

    // Otherwise create a Stripe Checkout Session in setup mode
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      success_url: `${appOrigin}/onboarding?card_success=true`,
      cancel_url: `${appOrigin}/onboarding`,
      locale: 'en',
    })

    return { success: true, url: session.url || undefined }
  } catch (err: any) {
    console.error('[createStripeSetupSessionAction] Error:', err)
    return { success: false, error: err?.message || 'Failed to initialize Stripe session' }
  }
}

/**
 * Submits the complete onboarding form:
 * 1. Synchronizes directly with Airtable Forms table (tbl0OP6EMTgeFfSag)
 * 2. Persists onboarding data in Supabase Auth user_metadata
 * 3. Activates the client in Supabase
 */
export async function completeClientOnboardingAction(formData: ClientOnboardingFormData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = getServiceSupabase()
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // 1. Submit to Airtable Forms table
    const airtablePayload: ClientOnboardingFormData = {
      ...formData,
      email: formData.email || client?.email || user.email || '',
      businessName: formData.businessName || client?.company_name || 'My Company'
    }

    const airtableRes = await submitClientOnboardingToAirtable(airtablePayload)
    if (!airtableRes.success) {
      console.warn('[completeClientOnboardingAction] Airtable Forms warning:', airtableRes.error)
    }

    // 2. Persist state in Supabase user metadata
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_data: formData,
        airtable_form_id: airtableRes.formRecordId || null
      }
    })

    // 3. Update client status in clients table to Active
    if (client) {
      await supabaseAdmin
        .from('clients')
        .update({ status: 'Active' })
        .eq('id', client.id)
    }

    return { success: true }
  } catch (err: any) {
    console.error('[completeClientOnboardingAction] Error:', err)
    return { success: false, error: err?.message || 'Failed to complete onboarding' }
  }
}

export interface InitialValidationData {
  businessName: string
  contactEmail: string
  businessPhone: string
  phoneProvider: string
  businessAddress: string
  openingHours: string
}

/**
 * Saves Phase 1 initial account validation (Payment & Business Profile)
 * and grants immediate entry to the dashboard.
 */
export async function saveInitialValidationAction(data: InitialValidationData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = getServiceSupabase()
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const initialFormData: ClientOnboardingFormData = {
      businessName: data.businessName,
      email: data.contactEmail || client?.email || user.email || '',
      businessPhoneNumber: data.businessPhone,
      phoneProvider: data.phoneProvider,
      businessAddress: data.businessAddress,
      openingHours: data.openingHours,
      preferredVoice: (user.user_metadata?.onboarding_data?.preferredVoice || 'Female') as 'Female' | 'Male',
      requiredLanguages: user.user_metadata?.onboarding_data?.requiredLanguages || ['English'],
      callTypes: user.user_metadata?.onboarding_data?.callTypes || ['Inbound'],
      mission: user.user_metadata?.onboarding_data?.mission || '',
      transferPhone: user.user_metadata?.onboarding_data?.transferPhone || '',
      calendarUrl: user.user_metadata?.onboarding_data?.calendarUrl || '',
      topFaqs: user.user_metadata?.onboarding_data?.topFaqs || '',
      websiteUrl: user.user_metadata?.onboarding_data?.websiteUrl || '',
      notes: user.user_metadata?.onboarding_data?.notes || '',
      uploadedDocuments: user.user_metadata?.onboarding_data?.uploadedDocuments || []
    }

    // Sync to Airtable Forms table immediately so engineering team has the business profile
    const existingFormRecordId = user.user_metadata?.airtable_form_id || null
    const airtableRes = await submitClientOnboardingToAirtable(initialFormData, existingFormRecordId)
    const formRecordId = airtableRes.formRecordId || existingFormRecordId || null

    // 1. Update user metadata
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        initial_validation_completed: true,
        business_profile: data,
        airtable_form_id: formRecordId,
        onboarding_data: initialFormData
      }
    })

    // 2. Update client company name in clients table
    if (client) {
      await supabaseAdmin
        .from('clients')
        .update({
          company_name: data.businessName,
          email: data.contactEmail || client.email
        })
        .eq('id', client.id)
    }

    return { success: true }
  } catch (err: any) {
    console.error('[saveInitialValidationAction] Error:', err)
    return { success: false, error: err?.message || 'Failed to save information' }
  }
}

/**
 * Auto-saves client agent specifications from the In-Dashboard Agent Setup Hub.
 * Continuous debounced save syncs to Supabase Auth metadata and Airtable Forms table.
 */
export async function saveAgentSpecificationsAction(
  specs: Partial<ClientOnboardingFormData>, 
  markSubmitted: boolean = false
): Promise<{ success: boolean; airtableFormId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const supabaseAdmin = getServiceSupabase()
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const currentOnboardingData: Partial<ClientOnboardingFormData> = user.user_metadata?.onboarding_data || {}
    const mergedData: ClientOnboardingFormData = {
      businessName: specs.businessName || currentOnboardingData.businessName || client?.company_name || 'My Business',
      email: specs.email || currentOnboardingData.email || client?.email || user.email || '',
      businessPhoneNumber: specs.businessPhoneNumber ?? currentOnboardingData.businessPhoneNumber ?? '',
      phoneProvider: specs.phoneProvider ?? currentOnboardingData.phoneProvider ?? '',
      businessAddress: specs.businessAddress ?? currentOnboardingData.businessAddress ?? '',
      openingHours: specs.openingHours ?? currentOnboardingData.openingHours ?? '',
      preferredVoice: (specs.preferredVoice ?? currentOnboardingData.preferredVoice ?? 'Female') as 'Female' | 'Male',
      requiredLanguages: specs.requiredLanguages ?? currentOnboardingData.requiredLanguages ?? ['English'],
      callTypes: specs.callTypes ?? currentOnboardingData.callTypes ?? ['Inbound'],
      mission: specs.mission ?? currentOnboardingData.mission ?? '',
      transferPhone: specs.transferPhone ?? currentOnboardingData.transferPhone ?? '',
      calendarUrl: specs.calendarUrl ?? currentOnboardingData.calendarUrl ?? '',
      topFaqs: specs.topFaqs ?? currentOnboardingData.topFaqs ?? '',
      websiteUrl: specs.websiteUrl ?? currentOnboardingData.websiteUrl ?? '',
      notes: specs.notes ?? currentOnboardingData.notes ?? '',
      uploadedDocuments: specs.uploadedDocuments ?? currentOnboardingData.uploadedDocuments ?? []
    }

    const existingRecordId = user.user_metadata?.airtable_form_id || null

    // Sync to Airtable Forms table (with PATCH if existing, POST if new)
    const airtableRes = await submitClientOnboardingToAirtable(mergedData, existingRecordId)
    const formRecordId = airtableRes.formRecordId || existingRecordId || null

    // Save to user metadata
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        onboarding_data: mergedData,
        airtable_form_id: formRecordId,
        specs_submitted: markSubmitted ? true : Boolean(user.user_metadata?.specs_submitted),
        specs_last_saved_at: new Date().toISOString()
      }
    })

    return { success: true, airtableFormId: formRecordId || undefined }
  } catch (err: any) {
    console.error('[saveAgentSpecificationsAction Error]', err)
    return { success: false, error: err?.message || 'Failed to auto-save specifications' }
  }
}

/**
 * Retrieves the agent setup status, active agents count, and current specifications
 * for the in-dashboard Agent Setup Hub.
 */
export async function getClientAgentSetupStateAction(targetClientId?: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized', hasActiveAgent: false }

    const supabaseAdmin = getServiceSupabase()
    
    let client = null
    if (targetClientId) {
      const { data } = await supabaseAdmin.from('clients').select('*').eq('id', targetClientId).maybeSingle()
      client = data
    } else {
      const { data } = await supabaseAdmin.from('clients').select('*').eq('user_id', user.id).maybeSingle()
      client = data
    }

    if (!client) {
      return { success: false, error: 'Client not found', hasActiveAgent: false }
    }

    const { data: agents } = await supabaseAdmin
      .from('agents')
      .select('id, agent_name, retell_agent_id')
      .eq('client_id', client.id)

    const hasActiveAgent = Boolean(agents && agents.length > 0)
    const onboardingData: Partial<ClientOnboardingFormData> = user.user_metadata?.onboarding_data || {}
    const isSpecsSubmitted = Boolean(user.user_metadata?.specs_submitted)
    const airtableFormId = user.user_metadata?.airtable_form_id || null

    return {
      success: true,
      hasActiveAgent,
      agents: agents || [],
      client: {
        id: client.id,
        companyName: client.company_name || 'My Business',
        email: client.email || user.email,
        status: client.status
      },
      specs: {
        businessName: client.company_name || onboardingData.businessName || 'My Business',
        email: client.email || onboardingData.email || user.email || '',
        businessPhoneNumber: onboardingData.businessPhoneNumber || '',
        phoneProvider: onboardingData.phoneProvider || '',
        businessAddress: onboardingData.businessAddress || '',
        openingHours: onboardingData.openingHours || '',
        preferredVoice: onboardingData.preferredVoice || 'Female',
        requiredLanguages: onboardingData.requiredLanguages || ['English'],
        callTypes: onboardingData.callTypes || ['Inbound'],
        mission: onboardingData.mission || '',
        transferPhone: onboardingData.transferPhone || '',
        calendarUrl: onboardingData.calendarUrl || '',
        topFaqs: onboardingData.topFaqs || '',
        websiteUrl: onboardingData.websiteUrl || '',
        notes: onboardingData.notes || '',
        uploadedDocuments: onboardingData.uploadedDocuments || []
      },
      isSpecsSubmitted,
      airtableFormId
    }
  } catch (err: any) {
    console.error('[getClientAgentSetupStateAction Error]', err)
    return { success: false, error: err?.message, hasActiveAgent: false }
  }
}

