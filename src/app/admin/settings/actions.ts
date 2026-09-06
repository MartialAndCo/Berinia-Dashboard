'use server'

import { checkAdminAuth } from '@/utils/supabase/server'
import { getDemoSettings, saveDemoSettings, getDemoLeads, formatToE164, DemoSettings } from '@/lib/demo-settings'
import Retell from 'retell-sdk'

export async function fetchDemoConfigAction() {
  try {
    await checkAdminAuth()
    const settings = await getDemoSettings()
    const leads = await getDemoLeads()
    return { success: true, settings, leads }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unauthorized' }
  }
}

export async function saveDemoConfigAction(settings: DemoSettings) {
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

    if (!settings.agent_id || !settings.from_number) {
      return { 
        success: false, 
        error: 'Please fill in both the Retell Agent ID and Outbound Phone Number first.' 
      }
    }

    const retellApiKey = process.env.RETELL_API_KEY
    if (!retellApiKey) {
      return { 
        success: false, 
        error: 'RETELL_API_KEY is missing in server environment (.env.local).' 
      }
    }

    const e164To = formatToE164(testPhone)
    const e164From = formatToE164(settings.from_number)

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
        calendar_url: settings.calendar_url || 'https://cal.com',
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
