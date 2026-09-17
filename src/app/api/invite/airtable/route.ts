import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/utils/supabase/server'
import { Resend } from 'resend'
import { getAirtableLeadRecord, updateAirtableLeadRecord } from '@/lib/airtable'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy')

interface ProcessInviteParams {
  recordId?: string
  email?: string
  company_name?: string
  full_name?: string
  phone?: string
  billing_rate?: number
  monthly_retainer?: number
  setup_fee?: number
  origin?: string
}

function extractAirtableNumber(val: any): number | undefined {
  if (Array.isArray(val)) {
    val = val[0]
  }
  if (typeof val === 'number' && !isNaN(val)) {
    return val
  }
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/[^0-9.-]/g, ''))
    if (!isNaN(parsed)) return parsed
  }
  return undefined
}

function extractAirtableString(val: any): string | undefined {
  if (Array.isArray(val)) {
    val = val[0]
  }
  if (typeof val === 'string' && val.trim()) {
    return val.trim()
  }
  return undefined
}

async function processAirtableInvite(params: ProcessInviteParams) {
  let { recordId, email, company_name, full_name, phone, billing_rate, monthly_retainer, setup_fee, origin } = params
  origin = origin || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.berinagents.com'

  let existingAirtableNotes = ''
  let airtableFields: any = null

  // 1. If recordId is provided, pull fresh data from Airtable
  if (recordId) {
    const airtableRes = await getAirtableLeadRecord(recordId)
    if (airtableRes.success && airtableRes.record?.fields) {
      airtableFields = airtableRes.record.fields
      existingAirtableNotes = airtableFields['Call Notes'] || airtableFields["Notes d'appel"] || ''
      
      if (!email) {
        email = extractAirtableString(airtableFields['Email'] || airtableFields['email']) || ''
      }
      if (!company_name) {
        company_name = extractAirtableString(airtableFields['Business Name'] || airtableFields['Company'] || airtableFields['Entreprise'] || airtableFields['Full Name']) || ''
      }
      if (!full_name) {
        full_name = extractAirtableString(airtableFields['Full Name'] || airtableFields['Nom']) || ''
      }
      if (!phone) {
        phone = extractAirtableString(airtableFields['Phone'] || airtableFields['Téléphone']) || ''
      }

      // Exact fields from Airtable: "Monthly Subscription (from Abonnement)" or "Monthly Retainer (from Abonnement)", "Cost Per Min (from Abonnement)", "Setup Fee (from Abonnement)"
      if (monthly_retainer === undefined) {
        const fromAbonnement = extractAirtableNumber(airtableFields['Monthly Subscription (from Abonnement)'] || airtableFields['Monthly Retainer (from Abonnement)'])
        const direct = extractAirtableNumber(airtableFields['Monthly Subscription'] || airtableFields['Subscription'] || airtableFields['Monthly Retainer'] || airtableFields['Retainer'] || airtableFields['Abonnement mensuel'])
        monthly_retainer = fromAbonnement ?? direct ?? 500
      }

      if (billing_rate === undefined) {
        const fromAbonnement = extractAirtableNumber(airtableFields['Cost Per Min (from Abonnement)'])
        const direct = extractAirtableNumber(airtableFields['Cost Per Min'] || airtableFields['Billing Rate'] || airtableFields['Tarif / min'] || airtableFields['Tarif'])
        billing_rate = fromAbonnement ?? direct ?? 0.50
      }

      if (setup_fee === undefined) {
        const fromAbonnement = extractAirtableNumber(airtableFields['Setup Fee (from Abonnement)'])
        const direct = extractAirtableNumber(airtableFields['Setup Fee'] || airtableFields['Frais de setup'])
        setup_fee = fromAbonnement ?? direct ?? 0
      }
    }
  }

  // Defaults if still empty
  email = (email || '').trim().toLowerCase()
  company_name = (company_name || full_name || 'New Client').trim()
  billing_rate = typeof billing_rate === 'number' && !isNaN(billing_rate) ? billing_rate : 0.50
  monthly_retainer = typeof monthly_retainer === 'number' && !isNaN(monthly_retainer) ? monthly_retainer : 500
  setup_fee = typeof setup_fee === 'number' && !isNaN(setup_fee) ? setup_fee : 0

  if (!email) {
    return {
      success: false,
      error: 'No email address found for this contact in Airtable. Please fill in the "Email" field and try again.',
      company_name
    }
  }

  const supabaseAdmin = getServiceSupabase()

  // 2. Check if a client with this email already exists
  const { data: existingClient } = await supabaseAdmin
    .from('clients')
    .select('*')
    .ilike('email', email)
    .maybeSingle()

  if (existingClient) {
    // Generate an access / recovery link for the existing client
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${origin}/update-password`
      }
    })

    if (!linkErr && linkData?.properties?.action_link) {
      const inviteUrl = linkData.properties.action_link
      const { getEmailTemplate } = require('@/lib/email-template')

      const contentHtml = `
        <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #9e4733; margin-bottom: 12px;">
          <span style="color: #9e4733; margin-right: 4px;">&#8226;</span> BERINAGENTS
        </div>
        <h1 style="font-family: 'Georgia', serif; font-size: 32px; font-weight: bold; color: #202020; margin: 0 0 24px 0; letter-spacing: -0.5px;">Access Your Portal</h1>
        <div style="border-bottom: 1px solid #e2dfd8; margin-bottom: 32px;"></div>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">Hello ${existingClient.company_name || company_name},</p>
        <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6;">Here is your link to log in and set up your password for your BerinAgents client portal:</p>
        
        <div>
          <a href="${inviteUrl}" style="background-color: #1a1918; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; text-transform: uppercase;">
            <span style="color: #9e4733; margin-right: 8px; font-size: 14px;">&#8226;</span> Access My Portal
          </a>
        </div>
        
        <p style="color: #737373; font-size: 13px; margin-top: 32px; line-height: 1.5;">
          If the button does not work, copy this link into your browser: <br/>
          <a href="${inviteUrl}" style="color: #202020; text-decoration: underline; word-break: break-all;">${inviteUrl}</a>
        </p>
      `

      const htmlEmail = getEmailTemplate('Access your BerinAgents Portal', contentHtml)

      await resend.emails.send({
        from: 'BerinAgents <onboarding@berinagents.com>',
        to: [email],
        subject: 'Access your BerinAgents Portal',
        html: htmlEmail,
      })
    }

    // Update Airtable
    if (recordId) {
      await updateAirtableLeadRecord(recordId, {
        'Lead Status': 'Client Invited'
      }).catch(e => console.error('Airtable update error:', e))
    }

    return {
      success: true,
      isExisting: true,
      clientId: existingClient.id,
      email,
      company_name: existingClient.company_name,
      message: `Account already exists. A dashboard access email has been re-sent to ${email}.`
    }
  }

  // 3. New Client: Generate Auth Invite Link
  let inviteData: any = null
  const { data: genInvite, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email: email,
    options: {
      redirectTo: `${origin}/update-password`
    }
  })

  if (inviteError) {
    // If user already exists in Supabase Auth (e.g. from a past deleted test)
    if (inviteError.message?.toLowerCase().includes('already')) {
      const { data: recData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: { redirectTo: `${origin}/update-password` }
      })
      inviteData = recData
    } else {
      return { success: false, error: inviteError.message, company_name }
    }
  } else {
    inviteData = genInvite
  }

  const userId = inviteData?.user?.id
  if (!userId) {
    return { success: false, error: "Unable to generate Supabase user account.", company_name }
  }

  // 4. STRIPE INTEGRATION (Customer + Monthly Subscription + Usage)
  let stripeCustomerId: string | null = null
  let stripeSubscriptionId: string | null = null

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

    // One-off Setup Fee attached to the customer's first invoice (from "Setup Fee (from Abonnement)")
    if (setup_fee > 0) {
      await stripe.invoiceItems.create({
        customer: customer.id,
        amount: Math.round(setup_fee * 100),
        currency: 'usd',
        description: `Setup Fee (Setup & configuration) - ${company_name}`
      })
    }

    const items: any[] = []
    const productTasks: Promise<void>[] = []

    // Monthly Subscription product & price
    if (monthly_retainer > 0) {
      productTasks.push(
        (async () => {
          const productSub = await stripe.products.create({ name: `Monthly Subscription - ${company_name}` })
          const priceSub = await stripe.prices.create({
            product: productSub.id,
            unit_amount: Math.round(monthly_retainer * 100),
            currency: 'usd',
            recurring: { interval: 'month' }
          })
          items.push({ price: priceSub.id })
        })()
      )
    }

    // Usage calls metered per second (from "Cost Per Min (from Abonnement)")
    if (billing_rate > 0) {
      productTasks.push(
        (async () => {
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
        })()
      )
    }

    if (productTasks.length > 0) {
      await Promise.all(productTasks)
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
    }
  } catch (stripeErr: any) {
    console.error('[Airtable Invite] Stripe setup error:', stripeErr)
  }

  // 5. Create the client record in Supabase DB
  const { data: newClient, error: clientError } = await supabaseAdmin
    .from('clients')
    .insert({
      user_id: userId,
      company_name,
      billing_rate_per_min: billing_rate,
      monthly_retainer: monthly_retainer,
      email: email,
      status: 'Pending',
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId
    })
    .select()
    .single()

  if (clientError) {
    return { success: false, error: clientError.message, company_name }
  }

  // 6 & 7. Send the customized welcome email via Resend and update Airtable in parallel
  const emailTask = (async () => {
    const inviteUrl = inviteData.properties?.action_link
    if (!inviteUrl) return

    const { getEmailTemplate } = require('@/lib/email-template')

    const contentHtml = `
      <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #9e4733; margin-bottom: 12px;">
        <span style="color: #9e4733; margin-right: 4px;">&#8226;</span> BERINAGENTS
      </div>
      <h1 style="font-family: 'Georgia', serif; font-size: 32px; font-weight: bold; color: #202020; margin: 0 0 24px 0; letter-spacing: -0.5px;">Welcome</h1>
      <div style="border-bottom: 1px solid #e2dfd8; margin-bottom: 32px;"></div>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">Hello ${company_name},</p>
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6;">Your client portal has been successfully created. You can now monitor your calls, recordings, and call analytics in real-time.</p>
      
      <div>
        <a href="${inviteUrl}" style="background-color: #1a1918; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; text-transform: uppercase;">
          <span style="color: #9e4733; margin-right: 8px; font-size: 14px;">&#8226;</span> Set Up My Password
        </a>
      </div>
      
      <p style="color: #737373; font-size: 13px; margin-top: 32px; line-height: 1.5;">
        If the button does not work, copy this link into your browser: <br/>
        <a href="${inviteUrl}" style="color: #202020; text-decoration: underline; word-break: break-all;">${inviteUrl}</a>
      </p>
    `

    const htmlEmail = getEmailTemplate('Welcome to BerinAgents', contentHtml)

    await resend.emails.send({
      from: 'BerinAgents <onboarding@berinagents.com>',
      to: [email],
      subject: 'Access your BerinAgents Portal',
      html: htmlEmail,
    }).catch((e: any) => console.error('Resend error:', e))
  })()

  const airtableTask = (async () => {
    if (!recordId) return
    await updateAirtableLeadRecord(recordId, {
      'Lead Status': 'Client Invited'
    }).catch((e: any) => console.error('Airtable status update error:', e))
  })()

  await Promise.all([emailTask, airtableTask])

  return {
    success: true,
    isExisting: false,
    clientId: newClient.id,
    email,
    company_name,
    monthly_retainer,
    setup_fee,
    billing_rate,
    message: `Client ${company_name} successfully created and invite sent to ${email}!`
  }
}

// Render a clean branded confirmation / error HTML page for browser clicks
function renderHtmlResponse(result: {
  success: boolean
  isExisting?: boolean
  clientId?: string
  email?: string
  company_name?: string
  monthly_retainer?: number
  setup_fee?: number
  billing_rate?: number
  message?: string
  error?: string
}) {
  const isSuccess = result.success
  const title = isSuccess 
    ? (result.isExisting ? 'Access Re-sent Successfully' : 'Invitation Sent Successfully!')
    : 'Invitation Error'

  const subtitle = isSuccess
    ? (result.isExisting 
        ? `A new dashboard access email has been sent to <strong>${result.email}</strong>.` 
        : `The client account has been created and an invitation email has been sent to <strong>${result.email}</strong>.`)
    : (result.error || 'An unexpected error occurred.')

  const clientAdminUrl = result.clientId ? `/admin/client/${result.clientId}` : '/admin'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} • BerinAgents</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f6f4f0;
      color: #1a1918;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e6e2d6;
      border-radius: 4px;
      max-width: 520px;
      width: 90%;
      margin: 20px;
      padding: 36px 32px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.03);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: ${isSuccess ? '#9e4733' : '#b91c1c'};
      margin-bottom: 12px;
    }
    h1 {
      font-family: 'Georgia', serif;
      font-size: 26px;
      font-weight: 700;
      color: #1a1918;
      margin: 0 0 10px 0;
      letter-spacing: -0.02em;
    }
    p.sub {
      color: #73706b;
      font-size: 14px;
      line-height: 1.55;
      margin: 0 0 24px 0;
    }
    .info-box {
      background: #faf9f7;
      border: 1px solid #e2dfd8;
      border-radius: 4px;
      padding: 16px 18px;
      margin-bottom: 28px;
      font-size: 13px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 0;
      border-bottom: 1px solid #f0ece4;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #73706b;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .info-val {
      color: #1a1918;
      font-weight: 600;
    }
    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-decoration: none;
      border-radius: 2px;
      cursor: pointer;
      transition: all 0.15s ease;
      box-sizing: border-box;
      border: 1px solid transparent;
    }
    .btn-primary {
      background: #1a1918;
      color: #f6f4f0;
    }
    .btn-primary:hover {
      background: #2d2d2d;
    }
    .btn-secondary {
      background: #ffffff;
      color: #73706b;
      border-color: #e6e2d6;
    }
    .btn-secondary:hover {
      background: #faf8f5;
      color: #1a1918;
    }
  </style>
</head>
<body>
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <img src="/logo-horizontal-black.png" alt="BerinAgents" style="height: 20px; width: auto;" />
      <span style="font-size: 9px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; background: #1a1918; color: #f6f4f0; padding: 2px 6px; border-radius: 2px;">Airtable</span>
    </div>

    <div class="badge">
      <span>•</span> ${isSuccess ? 'INVITATION SENT' : 'ATTENTION REQUIRED'}
    </div>

    <h1>${title}</h1>
    <p class="sub">${subtitle}</p>

    ${isSuccess ? `
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Company</span>
          <span class="info-val">${result.company_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Login Email</span>
          <span class="info-val">${result.email}</span>
        </div>
        ${result.monthly_retainer !== undefined ? `
        <div class="info-row">
          <span class="info-label">Monthly Subscription</span>
          <span class="info-val">$${result.monthly_retainer} / month</span>
        </div>
        ` : ''}
        ${result.setup_fee !== undefined && result.setup_fee > 0 ? `
        <div class="info-row">
          <span class="info-label">Setup Fee</span>
          <span class="info-val">$${result.setup_fee} (billed on 1st invoice)</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Cost Per Min</span>
          <span class="info-val">$${result.billing_rate} / min</span>
        </div>
        <div class="info-row">
          <span class="info-label">Stripe &amp; Supabase Status</span>
          <span class="info-val" style="color: #2e6930;">✓ Configured</span>
        </div>
        <div class="info-row">
          <span class="info-label">Airtable Status</span>
          <span class="info-val" style="color: #2e6930;">✓ Updated (Client Invité)</span>
        </div>
      </div>

      <div class="btn-group">
        <a href="${clientAdminUrl}" class="btn btn-primary">
          Open Client Profile in Admin &rarr;
        </a>
        <button onclick="window.close()" class="btn btn-secondary">
          Close This Tab
        </button>
      </div>
    ` : `
      <div class="info-box" style="background: #fdf2f0; border-color: #f5c6cb; color: #9e4733;">
        ${result.error || 'Error'}
      </div>

      <div class="btn-group">
        <a href="/admin" class="btn btn-primary">
          Back to Admin Dashboard
        </a>
        <button onclick="window.close()" class="btn btn-secondary">
          Close This Tab
        </button>
      </div>
    `}
  </div>
</body>
</html>
`
}

async function verifyAirtableAuth(req: Request): Promise<boolean> {
  // 1. Check if user is logged in as admin
  try {
    const admin = await checkAdminAuth()
    if (admin) return true
  } catch {}

  // 2. Check secret token via query or Authorization header
  const webhookSecret = process.env.AIRTABLE_WEBHOOK_SECRET
  const url = new URL(req.url)
  const tokenFromQuery = url.searchParams.get('secret') || url.searchParams.get('key')
  const authHeader = req.headers.get('authorization')
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null

  const providedSecret = tokenFromQuery || tokenFromHeader
  if (webhookSecret && providedSecret && providedSecret === webhookSecret) {
    return true
  }

  return false
}

// GET: Triggered when user clicks the Airtable Button (opens URL in browser)
export async function GET(req: Request) {
  const isAuthorized = await verifyAirtableAuth(req)
  const acceptHeader = req.headers.get('accept') || ''

  if (!isAuthorized) {
    if (acceptHeader.includes('application/json') && !acceptHeader.includes('text/html')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access or valid secret required' }, { status: 401 })
    }
    return new Response(renderHtmlResponse({
      success: false,
      error: 'Unauthorized: You must be logged into the Admin Console or provide a valid authorization key to send invitations.'
    }), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }

  const { searchParams } = new URL(req.url)
  const recordId = searchParams.get('recordId') || searchParams.get('id') || undefined
  const email = searchParams.get('email') || undefined
  const company_name = searchParams.get('company_name') || searchParams.get('company') || undefined
  const full_name = searchParams.get('full_name') || searchParams.get('name') || undefined
  const phone = searchParams.get('phone') || undefined
  const rawRate = searchParams.get('billing_rate') || searchParams.get('rate')
  const rawRetainer = searchParams.get('monthly_subscription') || searchParams.get('subscription') || searchParams.get('monthly_retainer') || searchParams.get('retainer')
  const rawSetup = searchParams.get('setup_fee') || searchParams.get('setup')
  const billing_rate = rawRate ? parseFloat(rawRate) : undefined
  const monthly_retainer = rawRetainer ? parseFloat(rawRetainer) : undefined
  const setup_fee = rawSetup ? parseFloat(rawSetup) : undefined

  const origin = req.headers.get('origin') || new URL(req.url).origin

  const result = await processAirtableInvite({
    recordId,
    email,
    company_name,
    full_name,
    phone,
    billing_rate,
    monthly_retainer,
    setup_fee,
    origin
  })

  // If client requested JSON specifically
  if (acceptHeader.includes('application/json') && !acceptHeader.includes('text/html')) {
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  }

  // Otherwise, return the responsive HTML confirmation page
  return new Response(renderHtmlResponse(result), {
    status: result.success ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}

// POST: Triggered if Airtable Automation (script / webhook action) sends a POST request
export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyAirtableAuth(req)
    const acceptHeader = req.headers.get('accept') || ''

    if (!isAuthorized) {
      if (acceptHeader.includes('text/html')) {
        return new Response(renderHtmlResponse({
          success: false,
          error: 'Unauthorized: Admin access or valid secret required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      }
      return NextResponse.json({ error: 'Unauthorized: Admin access or valid secret required' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const origin = req.headers.get('origin') || new URL(req.url).origin

    const rawMonthlySub = body.monthly_subscription !== undefined 
      ? body.monthly_subscription 
      : (body.subscription !== undefined 
          ? body.subscription 
          : (body.monthly_retainer !== undefined 
              ? body.monthly_retainer 
              : body.retainer))

    const result = await processAirtableInvite({
      recordId: body.recordId || body.id,
      email: body.email,
      company_name: body.company_name || body.company || body.businessName,
      full_name: body.full_name || body.fullName || body.name,
      phone: body.phone,
      billing_rate: body.billing_rate !== undefined ? parseFloat(body.billing_rate) : undefined,
      monthly_retainer: rawMonthlySub !== undefined ? parseFloat(rawMonthlySub) : undefined,
      setup_fee: body.setup_fee !== undefined ? parseFloat(body.setup_fee) : undefined,
      origin
    })

    if (acceptHeader.includes('text/html')) {
      return new Response(renderHtmlResponse(result), {
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
