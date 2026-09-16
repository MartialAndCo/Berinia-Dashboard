import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { checkAdminAuth } from '@/utils/supabase/server'
import { updateAirtableLeadRecord, findAirtableLeadData, getOrCreateAirtableAbonnement } from '@/lib/airtable'

export async function POST(req: Request) {
  try {
    // 1. Verify admin permissions
    try {
      await checkAdminAuth()
    } catch {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 })
    }

    const body = await req.json()
    const {
      email,
      company_name,
      billing_rate = 0.50,
      monthly_retainer = 500,
      setup_fee = 0,
      setup_installments = 1,
      discount_percent = 0,
      discount_amount = 0,
      discount_duration_months = 1,
      airtable_record_id,
      retell_agent_id,
      forward_webhook_url,
      backfill_history = false
    } = body

    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanCompanyName = (company_name || '').trim()

    if (!cleanEmail || !cleanCompanyName) {
      return NextResponse.json({ error: 'Email and Company Name are required' }, { status: 400 })
    }

    const rawMonthly = typeof monthly_retainer === 'number' ? monthly_retainer : parseFloat(monthly_retainer || '0')
    const rawRate = typeof billing_rate === 'number' ? billing_rate : parseFloat(billing_rate || '0')
    const rawSetup = typeof setup_fee === 'number' ? setup_fee : parseFloat(setup_fee || '0')
    const rawInstallments = Math.max(1, Math.min(3, parseInt(setup_installments) || 1))
    const rawDiscountPercent = typeof discount_percent === 'number' ? discount_percent : parseFloat(discount_percent || '0')
    const rawDiscountAmount = typeof discount_amount === 'number' ? discount_amount : parseFloat(discount_amount || '0')
    const rawDiscountMonths = parseInt(discount_duration_months) || 1

    const supabaseAdmin = getServiceSupabase()
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.berinagents.com'

    // 2. Ensure a Supabase Auth user exists WITHOUT sending any email
    let userId: string | null = null
    const { data: createdAuth, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      email_confirm: true,
      user_metadata: { company_name: cleanCompanyName }
    })

    if (createdAuth?.user) {
      userId = createdAuth.user.id
    } else if (createAuthError?.message?.toLowerCase().includes('already')) {
      // User already exists in auth. Find existing user ID
      const { data: existingClient } = await supabaseAdmin
        .from('clients')
        .select('id, user_id')
        .ilike('email', cleanEmail)
        .maybeSingle()

      if (existingClient?.user_id) {
        userId = existingClient.user_id
      } else {
        const { data: listRes } = await supabaseAdmin.auth.admin.listUsers()
        const found = listRes?.users?.find(u => u.email?.toLowerCase() === cleanEmail)
        if (found) userId = found.id
      }
    } else if (createAuthError) {
      return NextResponse.json({ error: `Auth user error: ${createAuthError.message}` }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unable to initialize user record' }, { status: 500 })
    }

    // 3. Initialize Stripe
    const Stripe = require('stripe').default || require('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
      apiVersion: '2023-10-16' as any
    })

    // 4. Create or retrieve Stripe Customer
    let stripeCustomer: any = null
    const existingCustomers = await stripe.customers.list({ email: cleanEmail, limit: 1 })
    if (existingCustomers.data && existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0]
      if (!stripeCustomer.name || !stripeCustomer.preferred_locales?.includes('en')) {
        stripeCustomer = await stripe.customers.update(stripeCustomer.id, { 
          name: cleanCompanyName,
          preferred_locales: ['en']
        })
      }
    } else {
      stripeCustomer = await stripe.customers.create({
        email: cleanEmail,
        name: cleanCompanyName,
        preferred_locales: ['en']
      })
    }

    // 5. Create or find existing client record in Supabase
    let clientRecord: any = null
    const { data: existingClientRecord } = await supabaseAdmin
      .from('clients')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (existingClientRecord) {
      const { data: updatedClient, error: updateError } = await supabaseAdmin
        .from('clients')
        .update({
          company_name: cleanCompanyName,
          billing_rate_per_min: rawRate,
          monthly_retainer: rawMonthly,
          status: existingClientRecord.status === 'Active' ? 'Active' : 'Pending Payment',
          stripe_customer_id: stripeCustomer.id
        })
        .eq('id', existingClientRecord.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      clientRecord = updatedClient
    } else {
      const { data: insertedClient, error: insertError } = await supabaseAdmin
        .from('clients')
        .insert({
          user_id: userId,
          company_name: cleanCompanyName,
          billing_rate_per_min: rawRate,
          monthly_retainer: rawMonthly,
          email: cleanEmail,
          status: 'Pending Payment',
          stripe_customer_id: stripeCustomer.id
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      clientRecord = insertedClient
    }

    // 6. Build Stripe Checkout Session line items
    const lineItems: any[] = []

    // A. Recurring Monthly Retainer
    if (rawMonthly > 0) {
      const productSub = await stripe.products.create({
        name: `Voice AI Platform Subscription - ${cleanCompanyName}`,
        description: 'Monthly recurring Voice AI platform subscription'
      })
      const priceSub = await stripe.prices.create({
        product: productSub.id,
        unit_amount: Math.round(rawMonthly * 100),
        currency: 'usd',
        recurring: { interval: 'month' }
      })
      lineItems.push({ price: priceSub.id, quantity: 1 })
    }

    // B. Setup Fee (comptant or installment 1)
    if (rawSetup > 0) {
      const installmentAmount = Math.round((rawSetup / rawInstallments) * 100)
      const setupDesc = rawInstallments > 1
        ? `Installment 1 of ${rawInstallments} (split payment)`
        : 'Voice AI architecture, prompt engineering, integration & onboarding'

      const productSetup = await stripe.products.create({
        name: `Setup & Onboarding Fee - ${cleanCompanyName}`,
        description: setupDesc
      })
      const priceSetup = await stripe.prices.create({
        product: productSetup.id,
        unit_amount: installmentAmount,
        currency: 'usd'
      })
      lineItems.push({ price: priceSetup.id, quantity: 1 })
    }

    // C. Optional Discount Coupon
    let discounts: any[] | undefined = undefined
    if (rawDiscountPercent > 0) {
      const coupon = await stripe.coupons.create({
        percent_off: rawDiscountPercent,
        duration: rawDiscountMonths > 1 ? 'repeating' : 'once',
        duration_in_months: rawDiscountMonths > 1 ? rawDiscountMonths : undefined,
        name: `Discount ${rawDiscountPercent}% - ${cleanCompanyName}`
      })
      discounts = [{ coupon: coupon.id }]
    } else if (rawDiscountAmount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(rawDiscountAmount * 100),
        currency: 'usd',
        duration: rawDiscountMonths > 1 ? 'repeating' : 'once',
        duration_in_months: rawDiscountMonths > 1 ? rawDiscountMonths : undefined,
        name: `Discount $${rawDiscountAmount} - ${cleanCompanyName}`
      })
      discounts = [{ coupon: coupon.id }]
    }

    // 7. Create Stripe Checkout Session
    const isSubscription = rawMonthly > 0
    const sessionMetadata: Record<string, string> = {
      is_live_closing: 'true',
      client_id: clientRecord.id,
      email: cleanEmail,
      company_name: cleanCompanyName,
      monthly_retainer: String(rawMonthly),
      setup_fee: String(rawSetup),
      setup_installments: String(rawInstallments),
      billing_rate: String(rawRate),
      airtable_record_id: airtable_record_id || '',
      retell_agent_id: retell_agent_id || '',
      forward_webhook_url: forward_webhook_url || '',
      backfill_history: backfill_history ? 'true' : 'false'
    }

    const sessionPayload: any = {
      mode: isSubscription ? 'subscription' : 'payment',
      customer: stripeCustomer.id,
      line_items: lineItems,
      discounts,
      metadata: sessionMetadata,
      locale: 'en',
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/canceled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto'
    }

    if (isSubscription) {
      sessionPayload.subscription_data = {
        metadata: {
          ...sessionMetadata,
          remaining_installments: rawInstallments > 1 ? String(rawInstallments - 1) : '0',
          installment_amount: rawInstallments > 1 ? String(Math.round(rawSetup / rawInstallments)) : '0'
        }
      }
    }

    const session = await stripe.checkout.sessions.create(sessionPayload)

    // 8. Update Airtable asynchronously with the generated checkout link notes
    ;(async () => {
      let targetRecordId = airtable_record_id
      if (!targetRecordId) {
        try {
          const lead = await findAirtableLeadData(cleanEmail, cleanCompanyName)
          if (lead?.recordId) targetRecordId = lead.recordId
        } catch (e) {
          console.warn('[PaymentLink API] Airtable lead lookup error:', e)
        }
      }

      if (targetRecordId) {
        try {
          const abonnementId = await getOrCreateAirtableAbonnement({
            monthlyRetainer: rawMonthly,
            setupFee: rawSetup,
            billingRate: rawRate,
            companyName: cleanCompanyName
          })

          const noteText = [
            `[Lien de paiement Closing Visio généré]:`,
            `• Lien: ${session.url}`,
            `• Retainer: $${rawMonthly}/mois`,
            `• Setup: $${rawSetup}${rawInstallments > 1 ? ` (en ${rawInstallments}x sans frais)` : ' (comptant)'}`,
            `• Tarif appels: $${rawRate}/min`,
            rawDiscountPercent > 0 ? `• Remise: -${rawDiscountPercent}%` : null
          ].filter(Boolean).join('\n')

          const fieldsToUpdate: Record<string, any> = {
            'Call Notes': noteText
          }
          if (abonnementId) {
            fieldsToUpdate['Abonnement'] = [abonnementId]
          }

          await updateAirtableLeadRecord(targetRecordId, fieldsToUpdate)
        } catch (atErr) {
          console.warn('[PaymentLink API] Could not update Airtable notes:', atErr)
        }
      }
    })().catch(() => {})

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      clientId: clientRecord.id,
      customerId: stripeCustomer.id
    })

  } catch (err: any) {
    console.error('[PaymentLink API Error]', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
