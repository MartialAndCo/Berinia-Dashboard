'use server'

import { checkUserAuth, isAdminUser } from '@/utils/supabase/server'
import { getServiceSupabase } from '@/lib/supabase'
import { markAirtableSubscriptionActive } from '@/lib/airtable'

const Stripe = require('stripe').default || require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

// Helper to resolve the validated client record for current user (or admin target)
async function getValidatedClient(targetClientId?: string | null) {
  const user = await checkUserAuth()
  const isUserAdmin = isAdminUser(user)
  const supabaseAdmin = getServiceSupabase()

  let client = null
  if (isUserAdmin && targetClientId) {
    const { data } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', targetClientId)
      .single()
    client = data
  } else {
    const { data } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .single()
    client = data
  }

  return { user, isUserAdmin, client, supabaseAdmin }
}

export async function getSubscriptionStatusAction(subscriptionId?: string | null, targetClientId?: string | null) {
  try {
    const { client } = await getValidatedClient(targetClientId)
    if (!client) {
      return { needsPaymentMethod: false, payUrl: null, cardInfo: null }
    }

    if (client.status === 'Demo' || client.email === 'account@test.com') {
      return { needsPaymentMethod: false, payUrl: null, cardInfo: { brand: 'visa', last4: '4242' } }
    }

    let subId = subscriptionId || client.stripe_subscription_id
    let cardInfo = null
    let needsPaymentMethod = false
    let payUrl = null

    if (subId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subId, {
          expand: [
            'latest_invoice', 
            'default_payment_method', 
            'customer', 
            'customer.invoice_settings.default_payment_method'
          ]
        })

        const status = subscription.status
        const latestInvoice = subscription.latest_invoice

        if (status === 'incomplete' || status === 'past_due' || status === 'unpaid') {
          if (latestInvoice && typeof latestInvoice !== 'string' && latestInvoice.hosted_invoice_url) {
            needsPaymentMethod = true
            payUrl = latestInvoice.hosted_invoice_url
          }
        }

        let pm = subscription.default_payment_method
        if (!pm && subscription.customer?.invoice_settings?.default_payment_method) {
          pm = subscription.customer.invoice_settings.default_payment_method
        }
        
        if (pm && typeof pm !== 'string') {
          if (pm.card) {
            cardInfo = { brand: pm.card.brand, last4: pm.card.last4 }
          } else if (pm.link) {
            cardInfo = { brand: 'Link', last4: pm.link.email || 'Account' }
          } else if (pm.sepa_debit) {
            cardInfo = { brand: 'SEPA', last4: pm.sepa_debit.last4 }
          } else {
            cardInfo = { brand: pm.type, last4: '***' }
          }
        }
      } catch (subErr) {
        console.warn('Could not retrieve subscription details:', subErr)
      }
    }

    // Fallback: check customer object and customer payment methods directly
    if (!cardInfo && client.stripe_customer_id) {
      try {
        const customer = await stripe.customers.retrieve(client.stripe_customer_id, {
          expand: ['invoice_settings.default_payment_method']
        })

        let pm = typeof customer !== 'string' ? customer.invoice_settings?.default_payment_method : null
        if (!pm) {
          const pms = await stripe.paymentMethods.list({
            customer: client.stripe_customer_id,
            limit: 1,
          })
          if (pms.data.length > 0) pm = pms.data[0]
        }

        if (pm && typeof pm !== 'string') {
          if (pm.card) {
            cardInfo = { brand: pm.card.brand, last4: pm.card.last4 }
          } else if (pm.link) {
            cardInfo = { brand: 'Link', last4: pm.link.email || 'Account' }
          } else if (pm.sepa_debit) {
            cardInfo = { brand: 'SEPA', last4: pm.sepa_debit.last4 }
          } else {
            cardInfo = { brand: pm.type, last4: '***' }
          }
        }
      } catch (custErr) {
        console.warn('Could not retrieve customer payment methods:', custErr)
      }
    }

    return { needsPaymentMethod, payUrl, cardInfo }
  } catch (err: any) {
    console.error('Error fetching subscription status:', err)
    return { needsPaymentMethod: false, payUrl: null, cardInfo: null }
  }
}

// 1. Safe Server Action for updating company name
export async function updateClientCompanyAction(companyName: string, targetClientId?: string) {
  try {
    const { client, supabaseAdmin } = await getValidatedClient(targetClientId)
    if (!client) return { success: false, error: 'Client not found' }

    const cleanName = companyName.trim()
    if (!cleanName) return { success: false, error: 'Company name cannot be empty' }

    const { error } = await supabaseAdmin
      .from('clients')
      .update({ company_name: cleanName })
      .eq('id', client.id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 2. Safe Server Action for call tags and notes (#12)
export async function updateCallMetadataAction(callId: string, tags: string[], notes: string, targetClientId?: string) {
  try {
    const { client, supabaseAdmin } = await getValidatedClient(targetClientId)
    if (!client) return { success: false, error: 'Client not found' }

    // Check that call belongs to this client
    const { data: call } = await supabaseAdmin
      .from('calls')
      .select('id, client_id')
      .eq('id', callId)
      .eq('client_id', client.id)
      .single()

    if (!call) return { success: false, error: 'Call not found or unauthorized' }

    const { error } = await supabaseAdmin
      .from('calls')
      .update({ 
        tags: Array.isArray(tags) ? tags : [],
        notes: notes || null
      })
      .eq('id', callId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 3. Safe Server Action for updating notification preferences and privacy settings (#15, #17)
export async function updateNotificationPreferencesAction(
  preferences: { negative_sentiment?: boolean; weekly_digest?: boolean; usage_alerts?: boolean },
  privacyMaskPhones?: boolean,
  targetClientId?: string
) {
  try {
    const { client, supabaseAdmin } = await getValidatedClient(targetClientId)
    if (!client) return { success: false, error: 'Client not found' }

    const updates: any = {}
    if (preferences !== undefined) {
      updates.notification_preferences = preferences
    }
    if (privacyMaskPhones !== undefined) {
      updates.privacy_mask_phones = privacyMaskPhones
    }

    const { error } = await supabaseAdmin
      .from('clients')
      .update(updates)
      .eq('id', client.id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 4. In-Portal Invoices retrieval (#7)
export async function getClientInvoicesAction(targetClientId?: string) {
  try {
    const { client, supabaseAdmin } = await getValidatedClient(targetClientId)
    if (!client) return { success: false, error: 'Client not found', invoices: [] }

    const stripeCustomerId = client.stripe_customer_id
    if (!stripeCustomerId) {
      return { success: true, invoices: [], currentCycle: null }
    }

    // Auto-heal: Ensure customer preferred_locales is English for all future invoices & PDFs
    stripe.customers.update(stripeCustomerId, { preferred_locales: ['en'] }).catch(() => {})

    // Retrieve last 50 invoices for this customer from Stripe
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 50,
    })

    const formatted = invoices.data.map((inv: any) => {
      let pStart = inv.period_start ? inv.period_start * 1000 : null
      let pEnd = inv.period_end ? inv.period_end * 1000 : null

      // Check lines for subscription period spanning a true billing cycle
      if (inv.lines?.data?.length > 0) {
        for (const line of inv.lines.data) {
          if (line.period?.start && line.period?.end && line.period.end - line.period.start > 86400 * 2) {
            pStart = line.period.start * 1000
            pEnd = line.period.end * 1000
            break
          }
        }
      }

      // Fallback: If pStart is missing, use invoice creation date
      if (!pStart && inv.created) {
        pStart = inv.created * 1000
      }

      // If start and end are identical or within 48h (one-off / initial invoices), project +1 month cycle
      if (pStart && (!pEnd || Math.abs(pEnd - pStart) < 86400 * 1000 * 2)) {
        const d = new Date(pStart)
        d.setMonth(d.getMonth() + 1)
        pEnd = d.getTime()
      }

      return {
        id: inv.id,
        number: inv.number || 'Pending',
        amount_due: inv.amount_due / 100,
        amount_paid: inv.amount_paid / 100,
        status: inv.status,
        created: inv.created * 1000,
        period_start: pStart,
        period_end: pEnd,
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf: inv.invoice_pdf,
      }
    })

    // Calculate current cycle accrued usage
    let currentCycleStats = null
    if (client.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(client.stripe_subscription_id)
        currentCycleStats = {
          current_period_start: sub.current_period_start * 1000,
          current_period_end: sub.current_period_end * 1000,
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end
        }
      } catch (subErr) {
        console.warn('Could not fetch subscription cycle stats:', subErr)
      }
    }

    // Fetch payment status and card info
    const pStatus = await getSubscriptionStatusAction(client.stripe_subscription_id, targetClientId)

    return { 
      success: true, 
      invoices: formatted, 
      client: {
        company_name: client.company_name,
        billing_rate_per_min: client.billing_rate_per_min,
        monthly_retainer: client.monthly_retainer,
        status: client.status
      },
      currentCycle: currentCycleStats,
      paymentStatus: pStatus
    }
  } catch (err: any) {
    console.error('Error fetching client invoices:', err)
    return { success: false, error: err.message, invoices: [] }
  }
}

// 5. "My Voice Agents" retrieval (#6)
export async function getClientAgentsAction(targetClientId?: string) {
  try {
    const { client, supabaseAdmin } = await getValidatedClient(targetClientId)
    if (!client) return { success: false, error: 'Client not found', agents: [] }

    // Fetch agents and calls in parallel for fast loading
    const [agentsRes, callsRes] = await Promise.all([
      supabaseAdmin.from('agents').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabaseAdmin.from('calls').select('agent_id, duration_secs, user_sentiment').eq('client_id', client.id)
    ])

    if (agentsRes.error) return { success: false, error: agentsRes.error.message, agents: [] }
    const agents = agentsRes.data || []
    const calls = callsRes.data || []

    const statsMap: Record<string, { totalCalls: number; totalMinutes: number; positiveCount: number }> = {}
    calls.forEach(c => {
      if (!statsMap[c.agent_id]) {
        statsMap[c.agent_id] = { totalCalls: 0, totalMinutes: 0, positiveCount: 0 }
      }
      statsMap[c.agent_id].totalCalls += 1
      statsMap[c.agent_id].totalMinutes += (c.duration_secs || 0) / 60
      if (c.user_sentiment?.toLowerCase() === 'positive') {
        statsMap[c.agent_id].positiveCount += 1
      }
    })

    const agentsWithStats = (agents || []).map(a => {
      const st = statsMap[a.id] || { totalCalls: 0, totalMinutes: 0, positiveCount: 0 }
      return {
        ...a,
        stats: {
          totalCalls: st.totalCalls,
          totalMinutes: Math.round(st.totalMinutes * 10) / 10,
          satisfactionRate: st.totalCalls > 0 ? Math.round((st.positiveCount / st.totalCalls) * 100) : null
        }
      }
    })

    return { success: true, agents: agentsWithStats, clientName: client.company_name }
  } catch (err: any) {
    return { success: false, error: err.message, agents: [] }
  }
}

// 6. Team Members Management (#17)
export async function getTeamMembersAction(targetClientId?: string) {
  try {
    const { client, supabaseAdmin } = await getValidatedClient(targetClientId)
    if (!client) return { success: false, error: 'Client not found', members: [] }

    const { data: members, error } = await supabaseAdmin
      .from('client_members')
      .select('*')
      .eq('client_id', client.id)
      .order('invited_at', { ascending: false })

    // If client_members table doesn't exist yet in Supabase, return primary account owner gracefully
    if (error) {
      return { 
        success: true, 
        members: [{
          id: 'owner',
          email: client.email,
          role: 'Owner',
          status: 'Active',
          invited_at: client.created_at
        }] 
      }
    }

    return { 
      success: true, 
      members: members && members.length > 0 ? members : [{
        id: 'owner',
        email: client.email,
        role: 'Owner',
        status: 'Active',
        invited_at: client.created_at
      }]
    }
  } catch (err: any) {
    return { success: false, error: err.message, members: [] }
  }
}

export async function inviteTeamMemberAction(email: string, role: string, targetClientId?: string) {
  try {
    const { client, supabaseAdmin } = await getValidatedClient(targetClientId)
    if (!client) return { success: false, error: 'Client not found' }

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Invalid email address' }
    }

    const { error } = await supabaseAdmin
      .from('client_members')
      .insert({
        client_id: client.id,
        email: cleanEmail,
        role: role || 'member'
      })

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
