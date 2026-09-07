import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { createClient, isAdminUser } from '@/utils/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-08-26.dahlia' as any
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { clientId } = body
    const supabaseAdmin = getServiceSupabase()

    let client = null
    const isUserAdmin = isAdminUser(user)

    if (isUserAdmin && clientId) {
      const { data } = await supabaseAdmin.from('clients').select('*').eq('id', clientId).single()
      client = data
    } else {
      const { data } = await supabaseAdmin.from('clients').select('*').eq('user_id', user.id).single()
      client = data
    }

    if (!client) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

    let stripeCustomerId = client.stripe_customer_id

    // Create customer if one doesn't exist yet
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: client.email || user.email || undefined,
        name: client.company_name,
        preferred_locales: ['en'],
        metadata: {
          clientId: client.id,
          userId: user.id
        }
      })
      stripeCustomerId = customer.id

      await supabaseAdmin.from('clients').update({ stripe_customer_id: stripeCustomerId }).eq('id', client.id)
    } else {
      // Ensure existing customer has English preferred_locales
      stripe.customers.update(stripeCustomerId, { preferred_locales: ['en'] }).catch(() => {})
    }

    // Generate a billing portal session
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const returnPath = isUserAdmin && clientId ? `/dashboard?clientId=${clientId}` : '/dashboard/billing'
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}${returnPath}`,
      locale: 'en',
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Checkout portal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
