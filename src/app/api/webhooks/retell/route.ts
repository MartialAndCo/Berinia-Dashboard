import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-retell-signature') || ''
    
    let payload;
    try {
      payload = JSON.parse(rawBody)
    } catch(e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // We only care about call_analyzed for billing
    if (payload.event !== 'call_analyzed') {
      return NextResponse.json({ received: true })
    }

    const { call } = payload
    if (!call) {
      return NextResponse.json({ error: 'No call data' }, { status: 400 })
    }

    const retellAgentId = call.agent_id
    const retellCallId = call.call_id
    const duration = Math.floor((call.end_timestamp - call.start_timestamp) / 1000)
    const transcript = call.transcript
    const recordingUrl = call.recording_url
    const callSummary = call.call_analysis?.call_summary || null
    const userSentiment = call.call_analysis?.user_sentiment || null
    const fromNumber = call.from_number || null

    const supabaseAdmin = getServiceSupabase()

    // 1. Find the agent in our database to link it to a client
    const { data: agentData, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, client_id, forward_webhook_url, clients(billing_rate_per_min, stripe_customer_id, stripe_subscription_id)')
      .eq('retell_agent_id', retellAgentId)
      .single()

    if (agentError || !agentData) {
      console.error('Agent not found or error:', agentError)
      return NextResponse.json({ error: 'Agent not linked to any client' }, { status: 404 })
    }

    // 2. Calculate the cost based on the client's custom rate
    const clientRecord: any = agentData.clients
    const billingRate = clientRecord.billing_rate_per_min || 0
    const minutes = duration / 60
    const cost = Math.round(minutes * billingRate * 100) / 100 // au centime près
    const retellCost = call.call_cost?.combined_cost ? call.call_cost.combined_cost / 100 : 0 // cents -> euros

    // 3. Upsert the call to prevent duplicates
    const { error: insertError } = await supabaseAdmin
      .from('calls')
      .upsert({
        retell_call_id: retellCallId,
        client_id: agentData.client_id,
        agent_id: agentData.id,
        duration_secs: duration,
        cost: cost,
        retell_cost: retellCost,
        transcript: transcript,
        recording_url: recordingUrl,
        call_summary: callSummary,
        user_sentiment: userSentiment,
        from_number: fromNumber,
      }, { onConflict: 'retell_call_id' })

    if (insertError) {
      console.error('Failed to insert call:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // 3b. Report Usage to Stripe for Automated Metered Billing
    if (clientRecord.stripe_subscription_id) {
      try {
        const Stripe = require('stripe').default || require('stripe')
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy')
        const sub = await stripe.subscriptions.retrieve(clientRecord.stripe_subscription_id)
        const meteredItems = sub.items.data.filter((item: any) => item.price.recurring?.usage_type === 'metered')
        const targetPerSec = parseFloat(((billingRate * 100) / 60).toFixed(12))

        // Find the metered item matching the current rate, or fallback to the latest metered item
        const meteredItem = meteredItems.find((item: any) => {
          const unit = parseFloat(item.price.unit_amount_decimal || '0')
          return Math.abs(unit - targetPerSec) < 0.00001
        }) || meteredItems[meteredItems.length - 1]
        
        if (meteredItem) {
          await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
            quantity: duration, // Billed per second
            timestamp: Math.floor(Date.now() / 1000),
            action: 'increment'
          }, {
            idempotencyKey: retellCallId // Prevents duplicate billing if webhook retries
          })
        }
      } catch (stripeErr) {
        console.error("Failed to report usage to Stripe:", stripeErr)
      }
    }

    // 4. Relay the webhook if configured (Raw Transfer)
    if (agentData.forward_webhook_url) {
      try {
        await fetch(agentData.forward_webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-retell-signature': signature
          },
          body: rawBody
        })
      } catch (proxyErr) {
        console.error('Failed to proxy webhook:', proxyErr)
        // We still return success to Retell so it doesn't retry infinitely
      }
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
