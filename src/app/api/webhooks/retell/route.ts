import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { ensureDemoClientAndAgent } from '@/lib/demo-settings'
import Stripe from 'stripe'

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-retell-signature') || req.headers.get('X-Retell-Signature') || ''
    
    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch (e) {
      console.error('[Retell Webhook] Invalid JSON received')
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const event = payload?.event
    const call = payload?.call
    const retellAgentId = call?.agent_id || payload?.agent_id
    const retellCallId = call?.call_id || payload?.call_id

    if (!retellAgentId) {
      console.warn('[Retell Webhook] No agent_id in payload:', { event, retellCallId })
      return NextResponse.json({ error: 'No agent_id in payload' }, { status: 400 })
    }

    const supabaseAdmin = getServiceSupabase()

    // 1. Find the agent in our database to get forward_webhook_url and client config
    let { data: agentData, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, client_id, agent_name, forward_webhook_url, clients(id, billing_rate_per_min, stripe_customer_id, stripe_subscription_id, email, company_name)')
      .eq('retell_agent_id', retellAgentId)
      .single()

    if (agentError || !agentData) {
      // Auto-fallback: ensure demo agent is registered if this is the demo agent
      const demoRes = await ensureDemoClientAndAgent(retellAgentId)
      if (demoRes) {
        const { data: retryAgent } = await supabaseAdmin
          .from('agents')
          .select('id, client_id, agent_name, forward_webhook_url, clients(id, billing_rate_per_min, stripe_customer_id, stripe_subscription_id, email, company_name)')
          .eq('retell_agent_id', retellAgentId)
          .single()
        agentData = retryAgent
      }
    }

    if (!agentData) {
      console.error('[Retell Webhook] Agent not linked to any client:', { retellAgentId, agentError })
      return NextResponse.json({ error: 'Agent not linked to any client' }, { status: 404 })
    }

    // 2. FORWARD WEBHOOK IMMEDIATELY FOR ALL EVENTS (call_started, call_ended, call_analyzed, etc.)
    // We forward BEFORE any event filtering so the secondary platform receives every single event in real-time.
    let relayStatus: number | null = null
    let relayResponse: string | null = null
    if (agentData.forward_webhook_url) {
      try {
        console.log(`[Retell Webhook Relay] Relaying event "${event}" (call: ${retellCallId}) to: ${agentData.forward_webhook_url}`)
        
        const forwardRes = await fetch(agentData.forward_webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-retell-signature': signature,
            'X-Retell-Signature': signature
          },
          body: rawBody
        })

        relayStatus = forwardRes.status
        relayResponse = await forwardRes.text().catch(() => '')
        console.log(`[Retell Webhook Relay] Response from ${agentData.forward_webhook_url}: ${relayStatus} - ${relayResponse.slice(0, 300)}`)

        if (!forwardRes.ok) {
          console.warn(`[Retell Webhook Relay Warning] Target returned non-2xx status: ${relayStatus}`)
        }
      } catch (proxyErr) {
        console.error('[Retell Webhook Relay Error] Failed to proxy webhook:', proxyErr)
        // We continue processing so our internal database and Retell stay healthy
      }
    }

    // 3. For BerinAgents internal logging & billing, we only need call_ended and call_analyzed
    if (event !== 'call_analyzed' && event !== 'call_ended') {
      return NextResponse.json({ 
        success: true, 
        relayed: !!agentData.forward_webhook_url,
        relayStatus,
        event 
      })
    }

    if (!call) {
      return NextResponse.json({ error: 'No call data' }, { status: 400 })
    }

    // 3. For Demo Agent: ONLY process outbound calls (per user requirement)
    const isDemoClient = (agentData.clients as any)?.email === 'demo@berinagents.com' || (agentData.clients as any)?.company_name?.includes('Demo')
    if (isDemoClient && call.direction && call.direction !== 'outbound') {
      console.log('[Retell Webhook] Skipping non-outbound call for Demo Agent:', retellCallId)
      return NextResponse.json({ success: true, skipped: 'inbound_demo_call' })
    }

    // Calculate duration in seconds
    let duration = 0
    if (typeof call.duration_ms === 'number' && call.duration_ms > 0) {
      duration = Math.floor(call.duration_ms / 1000)
    } else if (call.end_timestamp && call.start_timestamp) {
      duration = Math.floor((call.end_timestamp - call.start_timestamp) / 1000)
    }

    const recordingUrl = call.recording_url || null
    const callSummary = call.call_analysis?.call_summary || null
    const userSentiment = call.call_analysis?.user_sentiment || null
    // In outbound calls, the contact/prospect is to_number
    const contactNumber = call.direction === 'outbound'
      ? (call.to_number || call.from_number || null)
      : (call.from_number || call.to_number || null)

    // Normalize transcript: handle string, array of {role, content/text}, or missing
    let transcript: string | null = null
    if (typeof call.transcript === 'string' && call.transcript.trim()) {
      transcript = call.transcript
    } else if (Array.isArray(call.transcript) && call.transcript.length > 0) {
      transcript = call.transcript
        .map((u: any) => `${u.role === 'agent' ? 'Agent' : 'User'}: ${u.content || u.text || ''}`)
        .join('\n')
    } else if (Array.isArray(call.transcript_object) && call.transcript_object.length > 0) {
      transcript = call.transcript_object
        .map((u: any) => `${u.role === 'agent' ? 'Agent' : 'User'}: ${u.content || u.text || ''}`)
        .join('\n')
    }

    // Fallback: fetch transcript from Retell API if not in webhook payload
    if (!transcript && retellCallId) {
      try {
        const retellApiKey = process.env.RETELL_API_KEY
        if (retellApiKey) {
          const callRes = await fetch(`https://api.retellai.com/v2/get-call/${retellCallId}`, {
            headers: { 'Authorization': `Bearer ${retellApiKey}` }
          })
          if (callRes.ok) {
            const callDetail = await callRes.json()
            if (typeof callDetail.transcript === 'string' && callDetail.transcript.trim()) {
              transcript = callDetail.transcript
            } else if (Array.isArray(callDetail.transcript_object) && callDetail.transcript_object.length > 0) {
              transcript = callDetail.transcript_object
                .map((u: any) => `${u.role === 'agent' ? 'Agent' : 'User'}: ${u.content || u.text || ''}`)
                .join('\n')
            }
          }
        }
      } catch {
        console.error('[Retell Webhook] Failed to fetch transcript fallback from Retell API')
      }
    }

    // 4. Calculate the cost based on the client's custom rate
    const clientRecord: any = agentData.clients
    const billingRate = clientRecord?.billing_rate_per_min || 0
    const minutes = duration / 60
    const retellCost = call.call_cost?.combined_cost ? call.call_cost.combined_cost / 100 : 0 // cents -> euros/dollars
    const cost = billingRate > 0 ? Math.round(minutes * billingRate * 100) / 100 : retellCost

    // 5. Upsert the call to prevent duplicates
    const upsertPayload: any = {
      retell_call_id: retellCallId,
      client_id: agentData.client_id,
      agent_id: agentData.id,
      duration_secs: duration,
      cost: cost,
      from_number: contactNumber,
    }

    if (recordingUrl) upsertPayload.recording_url = recordingUrl
    if (transcript) upsertPayload.transcript = transcript
    if (callSummary) upsertPayload.call_summary = callSummary
    if (userSentiment) upsertPayload.user_sentiment = userSentiment
    if (retellCost) upsertPayload.retell_cost = retellCost

    const { error: insertError } = await supabaseAdmin
      .from('calls')
      .upsert(upsertPayload, { onConflict: 'retell_call_id' })

    if (insertError) {
      console.error('[Retell Webhook] Failed to insert call:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // 6. Report Usage to Stripe for Automated Metered Billing (only on call_analyzed for paying clients with active subscriptions)
    if (!isDemoClient && event === 'call_analyzed' && clientRecord?.stripe_subscription_id && duration > 0) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
        const sub = await stripe.subscriptions.retrieve(clientRecord.stripe_subscription_id)
        const meteredItems = sub.items.data.filter((item: any) => item.price.recurring?.usage_type === 'metered')
        const targetPerSec = parseFloat(((billingRate * 100) / 60).toFixed(12))

        // Find the metered item matching the current rate, or fallback to the latest metered item
        const meteredItem = meteredItems.find((item: any) => {
          const unit = parseFloat(item.price.unit_amount_decimal || '0')
          return Math.abs(unit - targetPerSec) < 0.00001
        }) || meteredItems[meteredItems.length - 1]
        
        if (meteredItem) {
          await stripe.rawRequest(
            'POST',
            `/v1/subscription_items/${meteredItem.id}/usage_records`,
            {
              quantity: duration, // Billed per second
              timestamp: Math.floor(Date.now() / 1000),
              action: 'increment'
            },
            {
              idempotencyKey: retellCallId // Prevents duplicate billing if webhook retries
            }
          )
          console.log(`[Retell Webhook] Reported Stripe usage: ${duration}s for item ${meteredItem.id}`)
        }
      } catch (stripeErr) {
        console.error('[Retell Webhook] Failed to report usage to Stripe:', stripeErr)
      }
    }

    return NextResponse.json({ 
      success: true, 
      relayed: !!agentData.forward_webhook_url,
      relayStatus,
      event 
    })

  } catch (err: any) {
    console.error('[Retell Webhook] Processing error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
