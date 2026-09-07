import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy')

export async function POST(req: Request) {
  try {
    const { email, company_name, billing_rate, monthly_retainer } = await req.json()

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

    // 2. STRIPE INTEGRATION (Customer + Retainer + Metered Usage)
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

      const items: any[] = []

      // Monthly Retainer
      if (monthly_retainer > 0) {
        const productRetainer = await stripe.products.create({ name: `Monthly Retainer - ${company_name}` })
        const priceRetainer = await stripe.prices.create({
          product: productRetainer.id,
          unit_amount: Math.round(monthly_retainer * 100),
          currency: 'usd',
          recurring: { interval: 'month' }
        })
        items.push({ price: priceRetainer.id })
      }

      // Usage-based billing (Metered per second)
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

      if (items.length > 0) {
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: items,
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice']
        })
        stripeSubscriptionId = subscription.id

        if (subscription.latest_invoice && typeof subscription.latest_invoice !== 'string') {
          invoiceUrl = subscription.latest_invoice.hosted_invoice_url || ''
        }
      }
    } catch (stripeErr: any) {
      console.error('Stripe error:', stripeErr)
    }

    // 3. Create the client record in the database
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
