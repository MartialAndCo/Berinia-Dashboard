'use server'

import { checkAdminAuth } from '@/utils/supabase/server'
import { getServiceSupabase } from '@/lib/supabase'
import { getDemoSettings, getDemoLeads, ensureDemoClientAndAgent } from '@/lib/demo-settings'
import { updateAirtableLeadCallSummary } from '@/lib/airtable'
import Retell from 'retell-sdk'

/**
 * Fetch calls, metrics, and lead info for the Outbound Demo Voice Agent
 */
export async function getDemoCallsDashboardAction() {
  try {
    await checkAdminAuth()
    const settings = await getDemoSettings()
    
    if (!settings.agent_id) {
      return {
        success: true,
        configured: false,
        settings,
        calls: [],
        leads: []
      }
    }

    const demoMeta = await ensureDemoClientAndAgent(settings.agent_id)
    if (!demoMeta) {
      return { success: false, error: 'Failed to initialize demo agent in database' }
    }

    const supabase = getServiceSupabase()
    const leads = await getDemoLeads()

    // Query all calls belonging to the demo client
    const { data: calls, error: callsErr } = await supabase
      .from('calls')
      .select('*, agents(agent_name)')
      .eq('client_id', demoMeta.clientId)
      .order('created_at', { ascending: false })

    if (callsErr) {
      return { success: false, error: callsErr.message }
    }

    // Build lead lookup map by phone
    const leadMap = new Map<string, any>()
    for (const lead of leads) {
      if (lead.phone) {
        const cleaned = lead.phone.replace(/\D/g, '')
        if (cleaned) leadMap.set(cleaned, lead)
      }
    }

    // Enrich calls with matched lead info
    const enrichedCalls = (calls || []).map(call => {
      let matchedLead = null
      if (call.from_number) {
        const cleaned = call.from_number.replace(/\D/g, '')
        matchedLead = leadMap.get(cleaned) || null
      }
      return {
        ...call,
        lead: matchedLead
      }
    })

    return {
      success: true,
      configured: true,
      settings,
      calls: enrichedCalls,
      leads
    }
  } catch (err: any) {
    console.error('getDemoCallsDashboardAction error:', err)
    return { success: false, error: err?.message || 'Unauthorized' }
  }
}

/**
 * Sync past outbound calls from Retell API for the demo agent
 */
export async function syncRetellDemoCallsAction() {
  try {
    await checkAdminAuth()
    const settings = await getDemoSettings()
    
    if (!settings.agent_id) {
      return { success: false, error: 'No demo agent selected in settings.' }
    }

    const retellApiKey = process.env.RETELL_API_KEY
    if (!retellApiKey) {
      return { success: false, error: 'RETELL_API_KEY is not configured.' }
    }

    const demoMeta = await ensureDemoClientAndAgent(settings.agent_id)
    if (!demoMeta) {
      return { success: false, error: 'Failed to link demo agent.' }
    }

    const retell = new Retell({ apiKey: retellApiKey })
    const callsRes = await retell.call.list({
      filter_criteria: {
        agent: [{ agent_id: settings.agent_id }]
      },
      limit: 100
    })

    const rawItems = Array.isArray(callsRes) ? callsRes : ((callsRes as any)?.items || [])
    
    // Per requirements: only sync outbound calls
    const outboundCalls = rawItems.filter((c: any) => c.direction === 'outbound')

    const supabase = getServiceSupabase()
    let syncedCount = 0

    for (const rawCall of outboundCalls) {
      let c: any = rawCall
      if (!c.transcript && c.call_id) {
        try {
          c = await retell.call.retrieve(c.call_id)
        } catch {
          c = rawCall
        }
      }

      const duration = typeof c.duration_ms === 'number' ? Math.floor(c.duration_ms / 1000) : 0
      const retellCost = c.call_cost?.combined_cost ? c.call_cost.combined_cost / 100 : 0

      let transcript: string | null = null
      if (typeof c.transcript === 'string' && c.transcript.trim()) {
        transcript = c.transcript
      } else if (Array.isArray(c.transcript) && c.transcript.length > 0) {
        transcript = c.transcript
          .map((u: any) => `${u.role === 'agent' ? 'Agent' : 'User'}: ${u.content || u.text || ''}`)
          .join('\n')
      } else if (Array.isArray(c.transcript_object) && c.transcript_object.length > 0) {
        transcript = c.transcript_object
          .map((u: any) => `${u.role === 'agent' ? 'Agent' : 'User'}: ${u.content || u.text || ''}`)
          .join('\n')
      }

      const prospectNumber = c.to_number || c.from_number || null

      const payload: any = {
        retell_call_id: c.call_id,
        client_id: demoMeta.clientId,
        agent_id: demoMeta.agentRecordId,
        duration_secs: duration,
        cost: retellCost,
        retell_cost: retellCost,
        from_number: prospectNumber,
        recording_url: c.recording_url || null,
        transcript: transcript,
        call_summary: c.call_analysis?.call_summary || null,
        user_sentiment: c.call_analysis?.user_sentiment || null,
        created_at: c.start_timestamp ? new Date(c.start_timestamp).toISOString() : new Date().toISOString()
      }

      const { error: upsertErr } = await supabase
        .from('calls')
        .upsert(payload, { onConflict: 'retell_call_id' })

      if (!upsertErr) {
        syncedCount++
        if (c.call_analysis?.call_summary) {
          const custom = c.call_analysis?.custom_analysis_data
          const collected = c.collected_dynamic_variables || {}
          const summary = (c.call_analysis.call_summary || '').toLowerCase()
          const isBooked = 
            custom?.meeting_booked === true || 
            custom?.meeting_booked === 'true' ||
            Boolean(collected.booked_time) ||
            /booked.*(walkthrough|meeting|appointment|call|demo|time|slot)/i.test(summary) ||
            /scheduled.*(walkthrough|meeting|appointment|call|demo|time|slot)/i.test(summary) ||
            /rendez-vous.*(programmé|confirmé|réservé|pris)/i.test(summary)

          const bookedTime = custom?.booked_time || (collected.booked_time ? String(collected.booked_time) : null)

          const directCallLink = c.recording_url || (c.call_id ? `https://dashboard.retellai.com/call-detail/${c.call_id}` : null)

          updateAirtableLeadCallSummary({
            callId: c.call_id,
            phone: prospectNumber,
            callSummary: c.call_analysis.call_summary,
            userSentiment: c.call_analysis?.user_sentiment,
            disconnectionReason: c.disconnection_reason,
            status: isBooked ? 'RDV Programmé' : 'Démo Réalisée',
            isBooked,
            bookedTime,
            recordingUrl: c.recording_url || null,
            callLink: directCallLink
          }).catch(err => console.warn('[Sync Retell Demo Calls] Airtable sync warning:', err))
        }
      } else {
        console.warn('[Sync Retell Calls] Upsert warning for call', c.call_id, upsertErr)
      }
    }

    return { success: true, count: syncedCount, totalOutbound: outboundCalls.length }
  } catch (err: any) {
    console.error('syncRetellDemoCallsAction error:', err)
    return { success: false, error: err?.message || 'Failed to sync calls with Retell' }
  }
}
