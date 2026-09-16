import { getServiceSupabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { getEmailTemplate } from '@/lib/email-template'
import { reactivateClientAgent } from '@/lib/agent-activation'
import { markAirtableSubscriptionActive } from '@/lib/airtable'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy')

export interface ActivationParams {
  sessionId?: string
  customerId?: string
  subscriptionId?: string
  customerEmail?: string
  clientId?: string
  metadata?: Record<string, any>
}

export async function activatePaidClient(params: ActivationParams) {
  const Stripe = require('stripe').default || require('stripe')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key')
  const supabaseAdmin = getServiceSupabase()

  let { sessionId, customerId, subscriptionId, customerEmail, clientId, metadata } = params

  // 1. If sessionId is provided, fetch latest Stripe Session data
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer']
      })
      if (session) {
        if (!customerId) customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        if (!subscriptionId) {
          subscriptionId = typeof session.subscription === 'string' 
            ? session.subscription 
            : session.subscription?.id
        }
        if (!customerEmail) {
          customerEmail = session.customer_details?.email || session.customer_email || session.metadata?.email
        }
        metadata = { ...(session.metadata || {}), ...(metadata || {}) }
        if (!clientId && session.metadata?.client_id) {
          clientId = session.metadata.client_id
        }
      }
    } catch (err) {
      console.error('[Payment Activation] Error retrieving Stripe session:', err)
    }
  }

  // 2. If subscriptionId is still missing, lookup active subscriptions for customer
  if (!subscriptionId && customerId) {
    try {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 })
      if (subs.data && subs.data.length > 0) {
        subscriptionId = subs.data[0].id
      }
    } catch (err) {
      console.error('[Payment Activation] Error listing customer subscriptions:', err)
    }
  }

  const cleanEmail = (customerEmail || '').trim().toLowerCase()

  // 3. Locate Client in Supabase
  let client: any = null

  if (clientId) {
    const { data } = await supabaseAdmin.from('clients').select('*').eq('id', clientId).maybeSingle()
    client = data
  }

  if (!client && customerId) {
    const { data } = await supabaseAdmin.from('clients').select('*').eq('stripe_customer_id', customerId).maybeSingle()
    client = data
  }

  if (!client && subscriptionId) {
    const { data } = await supabaseAdmin.from('clients').select('*').eq('stripe_subscription_id', subscriptionId).maybeSingle()
    client = data
  }

  if (!client && cleanEmail) {
    const { data } = await supabaseAdmin.from('clients').select('*').ilike('email', cleanEmail).maybeSingle()
    client = data
  }

  if (!client) {
    console.warn('[Payment Activation] Client not found for activation:', { clientId, customerId, subscriptionId, cleanEmail })
    return { success: false, error: 'Client record not found' }
  }

  const previousStatus = client.status
  const isNewlyActivated = previousStatus !== 'Active' && previousStatus !== 'Actif'

  // 4. Update Client in Supabase to Active
  const updateData: Record<string, any> = {
    status: 'Active'
  }
  if (customerId && !client.stripe_customer_id) {
    updateData.stripe_customer_id = customerId
  }
  if (subscriptionId) {
    updateData.stripe_subscription_id = subscriptionId
  }

  await supabaseAdmin.from('clients').update(updateData).eq('id', client.id)
  console.log(`[Payment Activation] Client ${client.company_name} (${client.id}) updated to Active. Sub: ${subscriptionId || 'none'}`)

  // 5. Reactivate Retell Voice Agent
  await reactivateClientAgent(client.id).catch(err => {
    console.error('[Payment Activation] Reactivate agent error:', err)
  })

  // 6. Assign Retell Agent if passed in metadata
  if (metadata?.retell_agent_id) {
    try {
      const { data: existingAgent } = await supabaseAdmin
        .from('agents')
        .select('id')
        .eq('retell_agent_id', metadata.retell_agent_id)
        .maybeSingle()

      if (!existingAgent) {
        await supabaseAdmin.from('agents').insert({
          client_id: client.id,
          agent_name: `Voice Agent - ${client.company_name}`,
          retell_agent_id: metadata.retell_agent_id,
          forward_webhook_url: metadata.forward_webhook_url || null
        })
      }
    } catch (agentErr) {
      console.error('[Payment Activation] Error assigning Retell agent:', agentErr)
    }
  }

  // 7. Send English Welcome & Password Setup Email (if client was pending or live closing)
  let emailSent = false
  const shouldSendEmail = isNewlyActivated || metadata?.is_live_closing === 'true'

  if (shouldSendEmail && client.email) {
    try {
      const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.berinagents.com'
      let inviteUrl: string | null = null

      // Generate Supabase Auth link (invite or recovery)
      const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: client.email,
        options: { redirectTo: `${origin}/update-password` }
      })

      if (!inviteErr && inviteData?.properties?.action_link) {
        inviteUrl = inviteData.properties.action_link
      } else {
        const { data: recData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: client.email,
          options: { redirectTo: `${origin}/update-password` }
        })
        inviteUrl = recData?.properties?.action_link || null
      }

      if (inviteUrl) {
        const companyName = client.company_name || 'Client'
        const contentHtml = `
          <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #9e4733; margin-bottom: 12px;">
            <span style="color: #9e4733; margin-right: 4px;">&#8226;</span> BERINAGENTS
          </div>
          <h1 style="font-family: 'Georgia', serif; font-size: 32px; font-weight: bold; color: #1a1918; margin: 0 0 24px 0; letter-spacing: -0.5px;">Welcome to BerinAgents</h1>
          <div style="border-bottom: 1px solid #e2dfd8; margin-bottom: 32px;"></div>
          
          <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #1a1918;">Hello ${companyName},</p>
          <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #403e3b;">Your payment has been successfully processed and your Voice AI platform subscription is now active.</p>
          <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #403e3b;">To complete your setup and access your client dashboard, please define your password by clicking below:</p>
          
          <div>
            <a href="${inviteUrl}" style="background-color: #1a1918; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; text-transform: uppercase;">
              <span style="color: #9e4733; margin-right: 8px; font-size: 14px;">&#8226;</span> Set Up My Password
            </a>
          </div>
          
          <p style="color: #737373; font-size: 13px; margin-top: 32px; line-height: 1.5;">
            If the button above does not work, copy this link into your browser: <br/>
            <a href="${inviteUrl}" style="color: #1a1918; text-decoration: underline; word-break: break-all;">${inviteUrl}</a>
          </p>
        `
        const htmlEmail = getEmailTemplate('Welcome to BerinAgents - Portal Access', contentHtml)
        await resend.emails.send({
          from: 'BerinAgents <onboarding@berinagents.com>',
          to: [client.email],
          subject: 'Welcome to BerinAgents: Set Up Your Password',
          html: htmlEmail
        })
        emailSent = true
        console.log(`[Payment Activation] Welcome email sent successfully to ${client.email}`)
      }
    } catch (mailErr) {
      console.error('[Payment Activation] Error sending welcome email:', mailErr)
    }
  }

  // 8. Mark Airtable as Active / Closed Won
  await markAirtableSubscriptionActive({
    email: client.email || cleanEmail,
    companyName: client.company_name
  }).catch(err => console.error('[Payment Activation] Airtable markActive error:', err))

  return {
    success: true,
    clientId: client.id,
    companyName: client.company_name,
    subscriptionId,
    emailSent,
    isNewlyActivated
  }
}
