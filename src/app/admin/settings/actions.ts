'use server'

import { checkAdminAuth } from '@/utils/supabase/server'
import { getDemoSettings, saveDemoSettings, getDemoLeads, formatToE164, resolveOutboundPhoneNumber, DemoSettings } from '@/lib/demo-settings'
import Retell from 'retell-sdk'

export interface RetellAgentOption {
  agent_id: string
  agent_name: string
  voice_id?: string
}

export async function fetchDemoConfigAction() {
  try {
    await checkAdminAuth()
    const settings = await getDemoSettings()
    const leads = await getDemoLeads()

    // Fetch Retell agents from API
    let retellAgents: RetellAgentOption[] = []
    let detectedNumber: string | null = null
    const retellApiKey = process.env.RETELL_API_KEY

    if (retellApiKey) {
      try {
        const res = await fetch('https://api.retellai.com/list-agents', {
          headers: { 'Authorization': `Bearer ${retellApiKey}` },
          cache: 'no-store'
        })
        if (res.ok) {
          const data = await res.json()
          const rawAgents = Array.isArray(data) ? data : (data.agents || data.items || [])
          
          // Deduplicate by agent_id, keeping the newest version
          const agentMap = new Map<string, RetellAgentOption>()
          for (const a of rawAgents) {
            if (!agentMap.has(a.agent_id) || (a.last_modification_timestamp > (agentMap.get(a.agent_id) as any)?.last_modification_timestamp)) {
              agentMap.set(a.agent_id, {
                agent_id: a.agent_id,
                agent_name: a.agent_name || 'Unnamed Agent',
                voice_id: a.voice_id
              })
            }
          }
          retellAgents = Array.from(agentMap.values())
        }
      } catch (err) {
        console.error('Error fetching Retell agents list:', err)
      }

      // Auto-detect outbound phone number
      detectedNumber = await resolveOutboundPhoneNumber(settings.agent_id)
    }

    return { 
      success: true, 
      settings, 
      leads, 
      retellAgents,
      detectedNumber 
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unauthorized' }
  }
}

export async function saveDemoConfigAction(settings: Partial<DemoSettings>) {
  try {
    await checkAdminAuth()
    const ok = await saveDemoSettings(settings)
    if (!ok) {
      return { success: false, error: 'Failed to update settings in Supabase' }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unauthorized' }
  }
}

export async function testDemoCallAction(testPhone: string) {
  try {
    await checkAdminAuth()
    const settings = await getDemoSettings()

    if (!settings.agent_id) {
      return { 
        success: false, 
        error: 'Please select an agent from the dropdown first.' 
      }
    }

    const retellApiKey = process.env.RETELL_API_KEY
    if (!retellApiKey) {
      return { 
        success: false, 
        error: 'RETELL_API_KEY is missing in server environment.' 
      }
    }

    // Auto-detect outbound phone number from Retell
    const fromNumber = await resolveOutboundPhoneNumber(settings.agent_id)
    if (!fromNumber) {
      return {
        success: false,
        error: 'No active phone number found on your Retell account. Please add a phone number in Retell.'
      }
    }

    const e164To = formatToE164(testPhone)
    const e164From = formatToE164(fromNumber)

    const retell = new Retell({ apiKey: retellApiKey })

    const callResponse = await retell.call.createPhoneCall({
      from_number: e164From,
      to_number: e164To,
      override_agent_id: settings.agent_id,
      retell_llm_dynamic_variables: {
        customer_name: 'Martin (Admin Test)',
        first_name: 'Martin',
        company_name: 'Berin AI Test',
        email: 'admin@berinia.com',
        phone: e164To,
        calendar_url: settings.calendar_url || '',
        owner_name: settings.owner_name || 'Martin'
      }
    })

    return { 
      success: true, 
      callId: callResponse.call_id,
      to: e164To,
      from: e164From 
    }
  } catch (err: any) {
    console.error('Test demo call error:', err)
    return { 
      success: false, 
      error: err?.message || 'Failed to trigger Retell test call.' 
    }
  }
}
