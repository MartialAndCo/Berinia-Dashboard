import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getEmailTemplate } from '@/lib/email-template'
import { getServiceSupabase } from '@/lib/supabase'
import { markAirtableSubscriptionActive, recordStripeInvoicePayment, markAirtableSubscriptionEnded } from '@/lib/airtable'
import { suspendClientAgent, reactivateClientAgent } from '@/lib/agent-activation'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy')

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('stripe-signature') || ''

    const Stripe = require('stripe').default || require('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key')
    
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event;
    if (endpointSecret) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret)
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message)
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
      }
    } else {
      // For local testing without webhook secret
      event = JSON.parse(rawBody)
    }

    const supabaseAdmin = getServiceSupabase()

    // 1. Invoice Payment Succeeded (Initial subscription charge or recurring invoice)
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object

      // If subscription invoice was paid
      if (invoice.subscription && invoice.amount_paid > 0) {
        // Find matching client in Supabase
        const { data: client } = await supabaseAdmin
          .from('clients')
          .select('*')
          .or(`stripe_customer_id.eq.${invoice.customer},stripe_subscription_id.eq.${invoice.subscription}${invoice.customer_email ? `,email.eq.${invoice.customer_email}` : ''}`)
          .limit(1)
          .maybeSingle()

        if (client) {
          await reactivateClientAgent(client.id)
          await markAirtableSubscriptionActive({
            email: client.email || invoice.customer_email,
            companyName: client.company_name
          }).catch(err => console.error('[Stripe Webhook] Airtable markActive error:', err))
        } else if (invoice.customer_email) {
          await markAirtableSubscriptionActive({
            email: invoice.customer_email,
            fullName: invoice.customer_name
          }).catch(err => console.error('[Stripe Webhook] Airtable markActive error:', err))
        }

        let usageSeconds = 0
        let usageAmount = 0
        let retainerAmount = 0

        if (invoice.lines?.data) {
          invoice.lines.data.forEach((line: any) => {
            if (line.price?.recurring?.usage_type === 'metered') {
              usageSeconds += line.quantity || 0
              usageAmount += line.amount
            } else {
              retainerAmount += line.amount
            }
          })
        }

        const totalPaidDollars = Number((invoice.amount_paid / 100).toFixed(2))
        const usageDollars = Number((usageAmount / 100).toFixed(2))
        const invoiceDate = invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)

        // Record real paid LTV and metered usage into Airtable
        await recordStripeInvoicePayment({
          email: client?.email || invoice.customer_email,
          companyName: client?.company_name,
          fullName: invoice.customer_name,
          amountPaid: totalPaidDollars,
          usageAmount: usageDollars,
          invoiceDate
        }).catch(err => console.error('[Stripe Webhook] Airtable recordPayment error:', err))

        // Send email notification for the invoice
        if (invoice.customer_email) {
          const usageMinutes = Math.floor(usageSeconds / 60)
          const totalPaidStr = totalPaidDollars.toFixed(2)
          const usageAmountStr = usageDollars.toFixed(2)
          const retainerAmountStr = (retainerAmount / 100).toFixed(2)
          const invoicePdf = invoice.invoice_pdf || invoice.hosted_invoice_url

          const contentHtml = `
            <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #9e4733; margin-bottom: 12px;">
              <span style="color: #9e4733; margin-right: 4px;">&#8226;</span> BERINAGENTS
            </div>
            <h1 style="font-family: 'Georgia', serif; font-size: 32px; font-weight: bold; color: #1a1918; margin: 0 0 24px 0; letter-spacing: -0.5px;">Your invoice is ready</h1>
            <div style="border-bottom: 1px solid #e2dfd8; margin-bottom: 32px;"></div>
            
            <p style="margin: 0 0 28px 0; font-size: 16px; line-height: 1.6; color: #403e3b;">Your payment has been processed successfully. Your voice AI platform is fully active.</p>
            
            <div style="background-color: #f0ede6; border: 1px solid #e2dfd8; padding: 20px 24px; margin-bottom: 36px;">
              <div style="font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #73706b; margin-bottom: 12px;">
                Billing Summary
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px; color: #1a1918; line-height: 2;">
                ${retainerAmount > 0 ? `
                <tr>
                  <td>Monthly Platform Subscription</td>
                  <td align="right" style="font-weight: 600; font-family: monospace; font-size: 15px;">$${retainerAmountStr}</td>
                </tr>` : ''}
                ${usageAmount > 0 ? `
                <tr>
                  <td>Voice AI Usage (${usageMinutes} min)</td>
                  <td align="right" style="font-weight: 600; font-family: monospace; font-size: 15px;">$${usageAmountStr}</td>
                </tr>` : ''}
                <tr style="border-top: 1px solid #dcd7ce;">
                  <td style="padding-top: 10px; font-weight: bold; font-size: 16px;">Total Billed</td>
                  <td align="right" style="padding-top: 10px; font-weight: bold; font-size: 18px; color: #9e4733; font-family: monospace;">$${totalPaidStr}</td>
                </tr>
              </table>
            </div>
            
            <div>
              <a href="${invoicePdf}" style="background-color: #1a1918; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; text-transform: uppercase;">
                <span style="color: #9e4733; margin-right: 8px; font-size: 14px;">&#8226;</span> VIEW INVOICE
              </a>
            </div>
          `

          const htmlEmail = getEmailTemplate('Your BerinAgents Invoice', contentHtml)

          await resend.emails.send({
            from: 'BerinAgents Billing <billing@berinagents.com>',
            to: [invoice.customer_email],
            subject: 'Your Monthly Invoice - BerinAgents',
            html: htmlEmail,
          }).catch(e => console.error('Error sending invoice email:', e))
        }
      }
    }

    // 1b. Invoice Payment Failed (Card declined, insufficient funds, expired card)
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object
      if (invoice.subscription || invoice.customer) {
        const { data: client } = await supabaseAdmin
          .from('clients')
          .select('*')
          .or(`stripe_customer_id.eq.${invoice.customer},stripe_subscription_id.eq.${invoice.subscription}${invoice.customer_email ? `,email.eq.${invoice.customer_email}` : ''}`)
          .limit(1)
          .maybeSingle()

        if (client) {
          console.warn(`[Stripe Webhook] Payment failed for invoice ${invoice.id}, client: ${client.company_name}`)
          await suspendClientAgent(client.id, 'invoice.payment_failed', invoice.hosted_invoice_url)
        }
      }
    }

    // 2. Subscription transitions (Active / Past_Due / Canceled)
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const subscription = event.data.object
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('*')
        .or(`stripe_customer_id.eq.${subscription.customer},stripe_subscription_id.eq.${subscription.id}`)
        .limit(1)
        .maybeSingle()

      if (subscription.status === 'active') {
        if (client) {
          await reactivateClientAgent(client.id)
          await markAirtableSubscriptionActive({
            email: client.email,
            companyName: client.company_name
          }).catch(err => console.error('[Stripe Webhook] Airtable markActive error:', err))
        } else {
          try {
            const customer = await stripe.customers.retrieve(subscription.customer)
            if (customer && !customer.deleted && customer.email) {
              await markAirtableSubscriptionActive({
                email: customer.email,
                companyName: customer.name
              }).catch(err => console.error('[Stripe Webhook] Airtable markActive error:', err))
            }
          } catch (e) {
            console.error('[Stripe Webhook] Error fetching customer for subscription update:', e)
          }
        }
      } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        if (client) {
          console.warn(`[Stripe Webhook] Subscription status is ${subscription.status} for client ${client.company_name}. Marking as Lost Client.`)
          await suspendClientAgent(client.id, `subscription_${subscription.status}`)
        }
        const cancelDate = subscription.canceled_at 
          ? new Date(subscription.canceled_at * 1000).toISOString().slice(0, 10)
          : (subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))

        let customerEmail = client?.email
        let customerName = client?.company_name
        if (!customerEmail && subscription.customer) {
          try {
            const customer = await stripe.customers.retrieve(subscription.customer)
            if (customer && !customer.deleted) {
              customerEmail = customer.email
              customerName = customer.name
            }
          } catch (e) {
            console.error('[Stripe Webhook] Error fetching customer for subscription cancelation:', e)
          }
        }

        await markAirtableSubscriptionEnded({
          email: customerEmail,
          companyName: customerName,
          endDate: cancelDate
        }).catch(err => console.error('[Stripe Webhook] Airtable markAirtableSubscriptionEnded error:', err))
      } else if (subscription.status === 'past_due') {
        if (client) {
          console.warn(`[Stripe Webhook] Subscription status is past_due for client ${client.company_name}. In grace period (Stripe smart retries in progress).`)
        }
      }
    }

    // 2b. Subscription Deleted (Canceled)
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('*')
        .or(`stripe_customer_id.eq.${subscription.customer},stripe_subscription_id.eq.${subscription.id}`)
        .limit(1)
        .maybeSingle()

      if (client) {
        console.warn(`[Stripe Webhook] Subscription deleted for client ${client.company_name}`)
        await suspendClientAgent(client.id, 'subscription_canceled')
      }

      const cancelDate = subscription.canceled_at 
        ? new Date(subscription.canceled_at * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)

      let customerEmail = client?.email
      let customerName = client?.company_name
      if (!customerEmail && subscription.customer) {
        try {
          const customer = await stripe.customers.retrieve(subscription.customer)
          if (customer && !customer.deleted) {
            customerEmail = customer.email
            customerName = customer.name
          }
        } catch (e) {
          console.error('[Stripe Webhook] Error retrieving customer for deleted subscription:', e)
        }
      }

      await markAirtableSubscriptionEnded({
        email: customerEmail,
        companyName: customerName,
        endDate: cancelDate
      }).catch(err => console.error('[Stripe Webhook] Airtable markAirtableSubscriptionEnded error:', err))
    }

    // 3. Invoice Created (Auto-attach remaining setup fee installments for 2x or 3x payments)
    if (event.type === 'invoice.created') {
      const invoice = event.data.object
      if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
        try {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
          const remaining = parseInt(subscription.metadata?.remaining_installments || '0')
          const installmentAmount = parseFloat(subscription.metadata?.installment_amount || '0')
          const totalInstallments = parseInt(subscription.metadata?.setup_installments || '1')

          if (remaining > 0 && installmentAmount > 0) {
            const currentInstallmentNum = totalInstallments - remaining + 1
            await stripe.invoiceItems.create({
              customer: subscription.customer,
              invoice: invoice.id,
              amount: Math.round(installmentAmount * 100),
              currency: 'usd',
              description: `Setup Fee (Installment ${currentInstallmentNum} of ${totalInstallments}) - ${subscription.metadata?.company_name || 'Client'}`
            })

            await stripe.subscriptions.update(subscription.id, {
              metadata: {
                ...subscription.metadata,
                remaining_installments: String(remaining - 1)
              }
            })
            console.log(`[Stripe Webhook] Attached setup installment ${currentInstallmentNum}/${totalInstallments} to invoice ${invoice.id}`)
          }
        } catch (err) {
          console.error('[Stripe Webhook] Error attaching recurring setup installment:', err)
        }
      }
    }

    // 4. Checkout Session Completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const email = (session.customer_details?.email || session.customer_email || session.metadata?.email || '').trim().toLowerCase()
      const customerId = session.customer
      const subscriptionId = session.subscription
      const isLiveClosing = session.metadata?.is_live_closing === 'true'

      if (customerId || subscriptionId || email) {
        // Find matching client by customerId, subscriptionId, metadata client_id, or email
        let clientQuery = supabaseAdmin.from('clients').select('*')
        if (session.metadata?.client_id) {
          clientQuery = clientQuery.eq('id', session.metadata.client_id)
        } else {
          clientQuery = clientQuery.or(`stripe_customer_id.eq.${customerId},stripe_subscription_id.eq.${subscriptionId}${email ? `,email.ilike.${email}` : ''}`)
        }

        const { data: client } = await clientQuery.limit(1).maybeSingle()

        if (client) {
          // Always activate client status upon checkout completion
          await supabaseAdmin
            .from('clients')
            .update({
              status: 'Active',
              stripe_customer_id: customerId || client.stripe_customer_id,
              stripe_subscription_id: subscriptionId || client.stripe_subscription_id
            })
            .eq('id', client.id)

          await reactivateClientAgent(client.id)

          // If this was a live closing, generate invite link and send welcome email NOW (after payment)
          if (isLiveClosing || client.status === 'Pending Payment' || client.status === 'Pending') {
            try {
              const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.berinagents.com'
              let inviteUrl: string | null = null

              const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.generateLink({
                type: 'invite',
                email: client.email,
                options: { redirectTo: `${origin}/update-password` }
              })

              if (!inviteErr && inviteData?.properties?.action_link) {
                inviteUrl = inviteData.properties.action_link
              } else {
                // If user was already registered in auth, generate recovery link
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
              }
            } catch (mailErr) {
              console.error('[Stripe Webhook] Error sending onboarding email:', mailErr)
            }
          }

          // Assign Retell agent if provided in metadata
          if (session.metadata?.retell_agent_id) {
            try {
              const { data: existingAgent } = await supabaseAdmin
                .from('agents')
                .select('id')
                .eq('retell_agent_id', session.metadata.retell_agent_id)
                .maybeSingle()

              if (!existingAgent) {
                await supabaseAdmin.from('agents').insert({
                  client_id: client.id,
                  agent_name: `Voice Agent - ${client.company_name}`,
                  retell_agent_id: session.metadata.retell_agent_id,
                  forward_webhook_url: session.metadata.forward_webhook_url || null
                })
              }
            } catch (agentErr) {
              console.error('[Stripe Webhook] Error assigning Retell agent:', agentErr)
            }
          }

          // Mark Airtable subscription active & Closed Won
          await markAirtableSubscriptionActive({
            email: client.email || email,
            companyName: client.company_name
          }).catch(err => console.error('[Stripe Webhook] Airtable markActive error:', err))

        } else if (email) {
          await markAirtableSubscriptionActive({ email }).catch(err => console.error('[Stripe Webhook] Airtable markActive error:', err))
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Stripe webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
