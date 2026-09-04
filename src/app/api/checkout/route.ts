import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-08-26.dahlia' as any
})

export async function POST(req: Request) {
  try {
    const { clientId } = await req.json()
    const supabaseAdmin = getServiceSupabase()

    // Get client info
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    let stripeCustomerId = client.stripe_customer_id

    // Create a customer if one doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: 'test@example.com', // In a real app, query auth.users for email
        name: client.company_name
      })
      stripeCustomerId = customer.id

      await supabaseAdmin.from('clients').update({ stripe_customer_id: stripeCustomerId }).eq('id', clientId)
    }

    // Generate a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${req.headers.get('origin')}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
