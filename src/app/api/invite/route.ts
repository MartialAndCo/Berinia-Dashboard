import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { updateAirtableLeadRecord } from '@/lib/airtable'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy')

export async function GET(req: Request) {
  const url = new URL(req.url)
  url.pathname = '/api/invite/airtable'
  return NextResponse.redirect(url)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      email, 
      company_name, 
      billing_rate, 
      monthly_retainer, 
      setup_fee, 
      setup_installments, 
      discount_percent, 
      discount_amount, 
      discount_duration_months, 
      airtable_record_id 
    } = body

    if (!email || !company_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = getServiceSupabase()
    const origin = req.headers.get('origin') || 'https://www.berinagents.com'
    
    // 1. Generate an invite link for the user
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${origin}/update-password`
      }
    })

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }

    // 2. STRIPE INTEGRATION (Customer + Retainer + Metered Usage + Setup + Discounts)
    let stripeCustomerId = null
    let stripeSubscriptionId = null
    let invoiceUrl = ''

    try {
      const Stripe = require('stripe').default || require('stripe')
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
        apiVersion: '2023-10-16' as any
      })
      
      const customer = await stripe.customers.create({
        email: email,
        name: company_name,
        preferred_locales: ['en'],
      })
      stripeCustomerId = customer.id

      // Handle Setup Fee (1x comptant or installments)
      const rawSetupFee = typeof setup_fee === 'number' ? setup_fee : parseFloat(setup_fee || '0')
      const rawInstallments = parseInt(setup_installments) || 1
      const numInstallments = Math.max(1, Math.min(3, rawInstallments))

      if (rawSetupFee > 0) {
        if (numInstallments > 1) {
          const installmentAmount = Math.round((rawSetupFee / numInstallments) * 100)
          await stripe.invoiceItems.create({
            customer: customer.id,
            amount: installmentAmount,
            currency: 'usd',
            description: `Setup Fee (Échéance 1 sur ${numInstallments}) - ${company_name}`
          })
        } else {
          await stripe.invoiceItems.create({
            customer: customer.id,
            amount: Math.round(rawSetupFee * 100),
            currency: 'usd',
            description: `Setup Fee - ${company_name}`
          })
        }
      }

      const items: any[] = []

      // Monthly Subscription (exact retainer chosen by admin)
      if (monthly_retainer > 0) {
        const productSubscription = await stripe.products.create({ name: `Monthly Subscription - ${company_name}` })
        const priceSubscription = await stripe.prices.create({
          product: productSubscription.id,
          unit_amount: Math.round(monthly_retainer * 100),
          currency: 'usd',
          recurring: { interval: 'month' }
        })
        items.push({ price: priceSubscription.id })
      }

      // Usage-based billing (Metered per second, exact rate chosen by admin)
      if (billing_rate > 0) {
        const productUsage = await stripe.products.create({ name: `Usage Calls (Seconds) - ${company_name}` })
        const priceUsage = await stripe.prices.create({
          product: productUsage.id,
          currency: 'usd',
          unit_amount_decimal: ((billing_rate * 100) / 60).toFixed(12),
          recurring: { 
            interval: 'month',
            usage_type: 'metered'
          }
        })
        items.push({ price: priceUsage.id })
      }

      // Optional Stripe Coupon (discounts)
      let discounts: any[] | undefined = undefined
      if (discount_percent && discount_percent > 0) {
        const durMonths = parseInt(discount_duration_months) || 1
        const coupon = await stripe.coupons.create({
          percent_off: discount_percent,
          duration: durMonths > 1 ? 'repeating' : 'once',
          duration_in_months: durMonths > 1 ? durMonths : undefined,
          name: `Remise ${discount_percent}% - ${company_name}`
        })
        discounts = [{ coupon: coupon.id }]
      } else if (discount_amount && discount_amount > 0) {
        const durMonths = parseInt(discount_duration_months) || 1
        const coupon = await stripe.coupons.create({
          amount_off: Math.round(discount_amount * 100),
          currency: 'usd',
          duration: durMonths > 1 ? 'repeating' : 'once',
          duration_in_months: durMonths > 1 ? durMonths : undefined,
          name: `Remise $${discount_amount} - ${company_name}`
        })
        discounts = [{ coupon: coupon.id }]
      }

      if (items.length > 0) {
        const subPayload: any = {
          customer: customer.id,
          items: items,
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice']
        }
        if (discounts && discounts.length > 0) {
          subPayload.discounts = discounts
        }

        const subscription = await stripe.subscriptions.create(subPayload)
        stripeSubscriptionId = subscription.id

        if (subscription.latest_invoice && typeof subscription.latest_invoice !== 'string') {
          invoiceUrl = subscription.latest_invoice.hosted_invoice_url || ''
        }
      }
    } catch (stripeErr: any) {
      console.error('Stripe error:', stripeErr)
    }

    // 3. Update Airtable record if provided
    if (airtable_record_id) {
      try {
        const rawSetupFee = typeof setup_fee === 'number' ? setup_fee : parseFloat(setup_fee || '0')
        const rawInstallments = parseInt(setup_installments) || 1
        const numInstallments = Math.max(1, Math.min(3, rawInstallments))
        const pricingSummary = [
          `[Abonnement Configuré]:`,
          `• Retainer: $${monthly_retainer}/mois`,
          `• Tarif appels: $${billing_rate}/min`,
          rawSetupFee > 0 ? `• Setup: $${rawSetupFee}${numInstallments > 1 ? ` (en ${numInstallments}x)` : ' (comptant)'}` : null,
          discount_percent > 0 ? `• Remise: -${discount_percent}%` : null,
          discount_amount > 0 ? `• Remise: -$${discount_amount}` : null
        ].filter(Boolean).join('\n')

        await updateAirtableLeadRecord(airtable_record_id, {
          'Lead Status': 'Client Invited',
          'Monthly Subscription': monthly_retainer || 0,
          'Cost Per Min': billing_rate || 0,
          'Setup Fee': rawSetupFee || 0,
          'Call Notes': pricingSummary
        })
      } catch (atErr) {
        console.warn('[Invite API] Could not update Airtable lead:', atErr)
      }
    }

    // 4. Create the client record in the database
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({
        user_id: inviteData.user.id,
        company_name,
        billing_rate_per_min: billing_rate || 0,
        monthly_retainer: monthly_retainer || 0,
        email: email,
        status: 'Pending',
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId
      })
      .select()
      .single()

    if (clientError) {
      await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id)
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }

    // 4. Send the custom invite email via Resend
    const inviteUrl = inviteData.properties.action_link
    
    const { getEmailTemplate } = require('@/lib/email-template')

    const contentHtml = `
      <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #9e4733; margin-bottom: 12px;">
        <span style="color: #9e4733; margin-right: 4px;">&#8226;</span> BERINAGENTS
      </div>
      <h1 style="font-family: 'Georgia', serif; font-size: 32px; font-weight: bold; color: #202020; margin: 0 0 24px 0; letter-spacing: -0.5px;">Welcome</h1>
      <div style="border-bottom: 1px solid #e2dfd8; margin-bottom: 32px;"></div>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">Hello ${company_name},</p>
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6;">Your client portal has been successfully created. You can now monitor your calls, analytics, and usage in real-time.</p>
      
      <div>
        <a href="${inviteUrl}" style="background-color: #1a1918; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; text-transform: uppercase;">
          <span style="color: #9e4733; margin-right: 8px; font-size: 14px;">&#8226;</span> Set up my password
        </a>
      </div>
      
      <p style="color: #737373; font-size: 13px; margin-top: 32px; line-height: 1.5;">
        If the button does not work, copy this link: <br/>
        <a href="${inviteUrl}" style="color: #202020; text-decoration: underline; word-break: break-all;">${inviteUrl}</a>
      </p>
    `

    const htmlEmail = getEmailTemplate('Welcome to BerinAgents', contentHtml)

    const { error: resendError } = await resend.emails.send({
      from: 'BerinAgents <onboarding@berinagents.com>',
      to: [email],
      subject: 'Access your BerinAgents Portal',
      html: htmlEmail,
    })

    if (resendError) {
      console.error('Resend error:', resendError)
      return NextResponse.json({ success: true, warning: 'User created but email failed to send', clientId: clientData.id })
    }

    return NextResponse.json({ success: true, clientId: clientData.id })

  } catch (err: any) {
    console.error('Invite error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
