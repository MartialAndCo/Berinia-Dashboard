import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
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
  origin?: string
}

async function processAirtableInvite(params: ProcessInviteParams) {
  let { recordId, email, company_name, full_name, phone, billing_rate, monthly_retainer, origin } = params
  origin = origin || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.berinagents.com'

  let existingAirtableNotes = ''
  let airtableFields: any = null

  // 1. If recordId is provided, pull fresh data from Airtable
  if (recordId) {
    const airtableRes = await getAirtableLeadRecord(recordId)
    if (airtableRes.success && airtableRes.record?.fields) {
      airtableFields = airtableRes.record.fields
      existingAirtableNotes = airtableFields["Notes d'appel"] || ''
      
      if (!email) {
        email = airtableFields['Email'] || airtableFields['email'] || ''
      }
      if (!company_name) {
        company_name = airtableFields['Business Name'] || airtableFields['Company'] || airtableFields['Entreprise'] || airtableFields['Full Name'] || ''
      }
      if (!full_name) {
        full_name = airtableFields['Full Name'] || airtableFields['Nom'] || ''
      }
      if (!phone) {
        phone = airtableFields['Phone'] || airtableFields['Téléphone'] || ''
      }
      if (billing_rate === undefined) {
        const rawRate = airtableFields['Tarif / min'] || airtableFields['Billing Rate'] || airtableFields['Tarif']
        billing_rate = rawRate ? parseFloat(rawRate) : 0.50
      }
      if (monthly_retainer === undefined) {
        const rawRetainer = airtableFields['Retainer'] || airtableFields['Abonnement mensuel'] || airtableFields['Monthly Retainer']
        monthly_retainer = rawRetainer ? parseFloat(rawRetainer) : 500
      }
    }
  }

  // Defaults if still empty
  email = (email || '').trim().toLowerCase()
  company_name = (company_name || full_name || 'Nouveau Client').trim()
  billing_rate = typeof billing_rate === 'number' && !isNaN(billing_rate) ? billing_rate : 0.50
  monthly_retainer = typeof monthly_retainer === 'number' && !isNaN(monthly_retainer) ? monthly_retainer : 500

  if (!email) {
    return {
      success: false,
      error: 'Aucune adresse email trouvée pour ce contact dans Airtable. Veuillez renseigner le champ "Email" puis réessayer.',
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
        <h1 style="font-family: 'Georgia', serif; font-size: 32px; font-weight: bold; color: #202020; margin: 0 0 24px 0; letter-spacing: -0.5px;">Accès à votre Portail</h1>
        <div style="border-bottom: 1px solid #e2dfd8; margin-bottom: 32px;"></div>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">Bonjour ${existingClient.company_name || company_name},</p>
        <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6;">Voici votre lien pour vous connecter et configurer votre mot de passe sur votre portail client BerinAgents :</p>
        
        <div>
          <a href="${inviteUrl}" style="background-color: #1a1918; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; text-transform: uppercase;">
            <span style="color: #9e4733; margin-right: 8px; font-size: 14px;">&#8226;</span> Accéder à mon espace
          </a>
        </div>
        
        <p style="color: #737373; font-size: 13px; margin-top: 32px; line-height: 1.5;">
          Si le bouton ne fonctionne pas, copiez ce lien : <br/>
          <a href="${inviteUrl}" style="color: #202020; text-decoration: underline; word-break: break-all;">${inviteUrl}</a>
        </p>
      `

      const htmlEmail = getEmailTemplate('Accès à votre Portail BerinAgents', contentHtml)

      await resend.emails.send({
        from: 'BerinAgents <onboarding@berinagents.com>',
        to: [email],
        subject: 'Accès à votre Portail BerinAgents',
        html: htmlEmail,
      })
    }

    // Update Airtable
    if (recordId) {
      const nowStr = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
      const noteAppend = `[BerinAgents] Invitation renvoyée (client existant) le ${nowStr}.`
      await updateAirtableLeadRecord(recordId, {
        'Statut du Lead': 'Client Invité',
        "Notes d'appel": existingAirtableNotes ? `${existingAirtableNotes}\n\n${noteAppend}` : noteAppend
      }).catch(e => console.error('Airtable update error:', e))
    }

    return {
      success: true,
      isExisting: true,
      clientId: existingClient.id,
      email,
      company_name: existingClient.company_name,
      message: `Compte déjà existant. Un email d'accès au dashboard vient d'être renvoyé à ${email}.`
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
    return { success: false, error: "Impossible de générer le compte utilisateur Supabase.", company_name }
  }

  // 4. STRIPE INTEGRATION (Customer + Monthly Retainer + Usage)
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

    const items: any[] = []

    // Monthly Retainer product & price
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

    // Usage calls metered per second
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

  // 6. Send the customized welcome email with password creation link via Resend
  const inviteUrl = inviteData.properties?.action_link
  if (inviteUrl) {
    const { getEmailTemplate } = require('@/lib/email-template')

    const contentHtml = `
      <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #9e4733; margin-bottom: 12px;">
        <span style="color: #9e4733; margin-right: 4px;">&#8226;</span> BERINAGENTS
      </div>
      <h1 style="font-family: 'Georgia', serif; font-size: 32px; font-weight: bold; color: #202020; margin: 0 0 24px 0; letter-spacing: -0.5px;">Bienvenue</h1>
      <div style="border-bottom: 1px solid #e2dfd8; margin-bottom: 32px;"></div>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">Bonjour ${company_name},</p>
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6;">Votre portail client a été configuré avec succès. Vous pouvez désormais suivre vos appels, vos enregistrements et vos analyses d'appels en temps réel.</p>
      
      <div>
        <a href="${inviteUrl}" style="background-color: #1a1918; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; text-transform: uppercase;">
          <span style="color: #9e4733; margin-right: 8px; font-size: 14px;">&#8226;</span> Définir mon mot de passe
        </a>
      </div>
      
      <p style="color: #737373; font-size: 13px; margin-top: 32px; line-height: 1.5;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : <br/>
        <a href="${inviteUrl}" style="color: #202020; text-decoration: underline; word-break: break-all;">${inviteUrl}</a>
      </p>
    `

    const htmlEmail = getEmailTemplate('Bienvenue sur BerinAgents', contentHtml)

    await resend.emails.send({
      from: 'BerinAgents <onboarding@berinagents.com>',
      to: [email],
      subject: 'Accès à votre Portail BerinAgents',
      html: htmlEmail,
    }).catch(e => console.error('Resend error:', e))
  }

  // 7. Update Airtable record
  if (recordId) {
    const nowStr = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
    const noteAppend = `[BerinAgents] Dashboard créé et invitation envoyée par email le ${nowStr}.`
    await updateAirtableLeadRecord(recordId, {
      'Statut du Lead': 'Client Invité',
      "Notes d'appel": existingAirtableNotes ? `${existingAirtableNotes}\n\n${noteAppend}` : noteAppend
    }).catch(e => console.error('Airtable status update error:', e))
  }

  return {
    success: true,
    isExisting: false,
    clientId: newClient.id,
    email,
    company_name,
    monthly_retainer,
    billing_rate,
    message: `Client ${company_name} créé avec succès et invitation envoyée à ${email} !`
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
  billing_rate?: number
  message?: string
  error?: string
}) {
  const isSuccess = result.success
  const title = isSuccess 
    ? (result.isExisting ? 'Accès renvoyé avec succès' : 'Invitation envoyée avec succès !')
    : 'Erreur lors de l\'invitation'

  const subtitle = isSuccess
    ? (result.isExisting 
        ? `Un nouvel email d'accès au dashboard a été envoyé à <strong>${result.email}</strong>.` 
        : `Le compte client a été créé et l'email d'activation a été expédié à <strong>${result.email}</strong>.`)
    : (result.error || 'Une erreur inattendue est survenue.')

  const clientAdminUrl = result.clientId ? `/admin/client/${result.clientId}` : '/admin'

  return `
<!DOCTYPE html>
<html lang="fr">
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
      padding: 6px 0;
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
      <span>•</span> ${isSuccess ? 'INVITATION ENVOYÉE' : 'ATTENTION REQUISE'}
    </div>

    <h1>${title}</h1>
    <p class="sub">${subtitle}</p>

    ${isSuccess ? `
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Entreprise</span>
          <span class="info-val">${result.company_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email de connexion</span>
          <span class="info-val">${result.email}</span>
        </div>
        ${result.monthly_retainer !== undefined ? `
        <div class="info-row">
          <span class="info-label">Tarification</span>
          <span class="info-val">${result.monthly_retainer} $ / mois + ${result.billing_rate} $ / min</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Statut Stripe & Supabase</span>
          <span class="info-val" style="color: #2e6930;">✓ Configuré</span>
        </div>
        <div class="info-row">
          <span class="info-label">Statut Airtable</span>
          <span class="info-val" style="color: #2e6930;">✓ Mis à jour (Client Invité)</span>
        </div>
      </div>

      <div class="btn-group">
        <a href="${clientAdminUrl}" class="btn btn-primary">
          Ouvrir la fiche client dans l'Admin &rarr;
        </a>
        <button onclick="window.close()" class="btn btn-secondary">
          Fermer cet onglet
        </button>
      </div>
    ` : `
      <div class="info-box" style="background: #fdf2f0; border-color: #f5c6cb; color: #9e4733;">
        ${result.error || 'Erreur'}
      </div>

      <div class="btn-group">
        <a href="/admin" class="btn btn-primary">
          Retour au Dashboard Admin
        </a>
        <button onclick="window.close()" class="btn btn-secondary">
          Fermer cet onglet
        </button>
      </div>
    `}
  </div>
</body>
</html>
`
}

// GET: Triggered when user clicks the Airtable Button (opens URL in browser)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const recordId = searchParams.get('recordId') || searchParams.get('id') || undefined
  const email = searchParams.get('email') || undefined
  const company_name = searchParams.get('company_name') || searchParams.get('company') || undefined
  const full_name = searchParams.get('full_name') || searchParams.get('name') || undefined
  const phone = searchParams.get('phone') || undefined
  const rawRate = searchParams.get('billing_rate') || searchParams.get('rate')
  const rawRetainer = searchParams.get('monthly_retainer') || searchParams.get('retainer')
  const billing_rate = rawRate ? parseFloat(rawRate) : undefined
  const monthly_retainer = rawRetainer ? parseFloat(rawRetainer) : undefined

  const origin = req.headers.get('origin') || new URL(req.url).origin

  const result = await processAirtableInvite({
    recordId,
    email,
    company_name,
    full_name,
    phone,
    billing_rate,
    monthly_retainer,
    origin
  })

  // If client requested JSON specifically
  const acceptHeader = req.headers.get('accept') || ''
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
    const body = await req.json().catch(() => ({}))
    const origin = req.headers.get('origin') || new URL(req.url).origin

    const result = await processAirtableInvite({
      recordId: body.recordId || body.id,
      email: body.email,
      company_name: body.company_name || body.company || body.businessName,
      full_name: body.full_name || body.fullName || body.name,
      phone: body.phone,
      billing_rate: body.billing_rate !== undefined ? parseFloat(body.billing_rate) : undefined,
      monthly_retainer: body.monthly_retainer !== undefined ? parseFloat(body.monthly_retainer) : undefined,
      origin
    })

    const acceptHeader = req.headers.get('accept') || ''
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
