import { NextResponse } from 'next/server'
import { activatePaidClient } from '@/lib/payment-activation'

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // body optional
    }

    const effectiveSessionId = sessionId || body.sessionId
    if (!effectiveSessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const Stripe = require('stripe').default || require('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key')

    const session = await stripe.checkout.sessions.retrieve(effectiveSessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Only activate if session is paid or complete
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ 
        success: false, 
        message: 'Session is not paid yet',
        payment_status: session.payment_status 
      })
    }

    const result = await activatePaidClient({ sessionId: effectiveSessionId })
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[API Checkout Confirm] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
