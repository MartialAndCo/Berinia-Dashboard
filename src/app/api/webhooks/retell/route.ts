import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const payload = await req.json()

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

    const supabaseAdmin = getServiceSupabase()

    // 1. Find the agent in our database to link it to a client
    const { data: agentData, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, client_id, clients(billing_rate_per_min)')
      .eq('retell_agent_id', retellAgentId)
      .single()

    if (agentError || !agentData) {
      console.error('Agent not found or error:', agentError)
      return NextResponse.json({ error: 'Agent not linked to any client' }, { status: 404 })
    }

    // 2. Calculate the cost based on the client's custom rate
    const clientRecord: any = agentData.clients
    const billingRate = clientRecord.billing_rate_per_min || 0
    const minutes = Math.ceil(duration / 60)
    const cost = minutes * billingRate

    // 3. Upsert the call to prevent duplicates
    const { error: insertError } = await supabaseAdmin
      .from('calls')
      .upsert({
        retell_call_id: retellCallId,
        client_id: agentData.client_id,
        agent_id: agentData.id,
        duration_secs: duration,
        cost: cost,
        transcript: transcript,
        recording_url: recordingUrl,
      }, { onConflict: 'retell_call_id' })

    if (insertError) {
      console.error('Failed to insert call:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
