import { getServiceSupabase } from '@/lib/supabase'
import Retell from 'retell-sdk'

export interface DemoSettings {
  agent_id: string
  from_number?: string
  calendar_url: string
  enabled: boolean
  owner_name: string
}

export interface DemoLead {
  id: string
  fullName: string
  businessName: string
  phone: string
  email: string
  createdAt: string
  callId?: string
  status: 'called' | 'call_failed' | 'disabled' | 'pending'
  error?: string
}

const DEFAULT_SETTINGS: DemoSettings = {
  agent_id: process.env.RETELL_DEMO_AGENT_ID || '',
  from_number: process.env.RETELL_DEMO_FROM_NUMBER || '',
  calendar_url: process.env.CALENDAR_URL || '',
  enabled: true,
  owner_name: 'Yann'
}

/**
 * Format phone to E.164 (+1XXXXXXXXXX for US if 10 digits)
 */
export function formatToE164(phone: string, defaultCountryCode = '+1'): string {
  let cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '')
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.slice(2)
  }
  if (/^\d{10}$/.test(cleaned)) {
    return `+1${cleaned}`
  }
  if (/^1\d{10}$/.test(cleaned)) {
    return `+${cleaned}`
  }
  const prefix = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`
  return `${prefix}${cleaned.replace(/^\+/, '')}`
}

/**
 * Automatically resolve the outbound phone number from Retell
 * Checks if a number is assigned to the agent, otherwise falls back to the first available Retell number
 */
export async function resolveOutboundPhoneNumber(agentId?: string): Promise<string | null> {
  try {
    const apiKey = process.env.RETELL_API_KEY
    if (!apiKey) return null

    const res = await fetch('https://api.retellai.com/list-phone-numbers', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      cache: 'no-store'
    })

    if (!res.ok) return null
    const numbers = await res.json()
    if (!Array.isArray(numbers) || numbers.length === 0) return null

    // 1. Try to find a number bound to this agent
    if (agentId) {
      const bound = numbers.find(n => 
        (n.inbound_agents && n.inbound_agents.some((a: any) => a.agent_id === agentId)) ||
        n.outbound_agent_id === agentId
      )
      if (bound?.phone_number) return bound.phone_number
    }

    // 2. Default to the first available number on the account
    return numbers[0].phone_number || null
  } catch (err) {
    console.error('Failed to resolve Retell phone number automatically:', err)
    return null
  }
}

/**
 * Find admin user record
 */
async function getAdminUser() {
  const supabase = getServiceSupabase()
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error || !data?.users) {
    console.error('Error listing users for admin check:', error)
    return null
  }
  const admin = data.users.find(u => u.email === 'admin@berinia.com') || data.users[0]
  return admin || null
}

/**
 * Get Demo Agent settings from Supabase admin metadata with env fallback
 */
export async function getDemoSettings(): Promise<DemoSettings> {
  try {
    const admin = await getAdminUser()
    const stored = admin?.user_metadata?.demo_settings as Partial<DemoSettings> | undefined

    return {
      agent_id: stored?.agent_id || process.env.RETELL_DEMO_AGENT_ID || '',
      from_number: stored?.from_number || process.env.RETELL_DEMO_FROM_NUMBER || '',
      calendar_url: stored?.calendar_url || process.env.CALENDAR_URL || '',
      enabled: stored?.enabled !== undefined ? Boolean(stored.enabled) : true,
      owner_name: stored?.owner_name || 'Yann'
    }
  } catch (err) {
    console.error('Failed to get demo settings, falling back to defaults:', err)
    return DEFAULT_SETTINGS
  }
}

/**
 * Update Demo Agent settings in Supabase admin metadata
 */
export async function saveDemoSettings(newSettings: Partial<DemoSettings>): Promise<boolean> {
  try {
    const admin = await getAdminUser()
    if (!admin) throw new Error('Admin user not found')

    const currentMetadata = admin.user_metadata || {}
    const existingSettings = (currentMetadata.demo_settings as Partial<DemoSettings>) || {}

    const mergedSettings: DemoSettings = {
      agent_id: newSettings.agent_id !== undefined ? newSettings.agent_id.trim() : (existingSettings.agent_id || ''),
      from_number: newSettings.from_number !== undefined ? newSettings.from_number.trim() : (existingSettings.from_number || ''),
      calendar_url: newSettings.calendar_url !== undefined ? newSettings.calendar_url.trim() : (existingSettings.calendar_url || ''),
      enabled: newSettings.enabled !== undefined ? Boolean(newSettings.enabled) : (existingSettings.enabled ?? true),
      owner_name: newSettings.owner_name !== undefined ? newSettings.owner_name.trim() : (existingSettings.owner_name || 'Yann')
    }

    const supabase = getServiceSupabase()
    const { error } = await supabase.auth.admin.updateUserById(admin.id, {
      user_metadata: {
        ...currentMetadata,
        demo_settings: mergedSettings
      }
    })

    if (error) {
      console.error('Error saving demo settings:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Failed to save demo settings:', err)
    return false
  }
}

/**
 * Log a demo lead to Supabase admin metadata
 */
export async function logDemoLead(lead: Omit<DemoLead, 'id' | 'createdAt'>): Promise<DemoLead | null> {
  try {
    const admin = await getAdminUser()
    if (!admin) return null

    const currentMetadata = admin.user_metadata || {}
    const existingLeads = (currentMetadata.demo_leads as DemoLead[]) || []

    const newLead: DemoLead = {
      ...lead,
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    }

    // Keep up to 100 most recent leads
    const updatedLeads = [newLead, ...existingLeads].slice(0, 100)

    const supabase = getServiceSupabase()
    await supabase.auth.admin.updateUserById(admin.id, {
      user_metadata: {
        ...currentMetadata,
        demo_leads: updatedLeads
      }
    })

    return newLead
  } catch (err) {
    console.error('Failed to log demo lead:', err)
    return null
  }
}

/**
 * Retrieve recent demo leads
 */
export async function getDemoLeads(): Promise<DemoLead[]> {
  try {
    const admin = await getAdminUser()
    if (!admin) return []
    const leads = (admin.user_metadata?.demo_leads as DemoLead[]) || []
    return leads
  } catch (err) {
    console.error('Failed to get demo leads:', err)
    return []
  }
}

/**
 * Ensure Demo Client and Demo Agent exist in Supabase and sync Retell webhook
 */
export async function ensureDemoClientAndAgent(agentId: string): Promise<{ clientId: string; agentRecordId: string } | null> {
  try {
    if (!agentId) return null
    const supabase = getServiceSupabase()
    const admin = await getAdminUser()
    if (!admin) return null

    // 1. Find or create demo client in clients table
    let { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('email', 'demo@berinagents.com')
      .single()

    if (!client) {
      const { data: newClient, error: clientErr } = await supabase
        .from('clients')
        .insert({
          user_id: admin.id,
          company_name: 'Berin AI (Demo Outbound)',
          email: 'demo@berinagents.com',
          status: 'Demo',
          billing_rate_per_min: 0,
          monthly_retainer: 0
        })
        .select()
        .single()

      if (clientErr || !newClient) {
        console.error('Failed to create demo client in clients table:', clientErr)
        return null
      }
      client = newClient
    }

    // 2. Fetch agent name from Retell if possible and configure webhook
    let agentName = 'Demo Voice Agent'
    const retellApiKey = process.env.RETELL_API_KEY
    if (retellApiKey && agentId) {
      try {
        const retell = new Retell({ apiKey: retellApiKey })
        const agentDetail = await retell.agent.retrieve(agentId)
        if (agentDetail?.agent_name) {
          agentName = `${agentDetail.agent_name} (Demo)`
        }

        // Automatic Webhook setup on Retell
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.berinagents.com'
        const webhookUrl = `${siteUrl}/api/webhooks/retell`
        await retell.agent.update(agentId, { webhook_url: webhookUrl })
        console.log(`[Demo Setup] Configured Retell webhook for ${agentId} -> ${webhookUrl}`)
      } catch (err) {
        console.error('Error syncing Retell agent webhook in ensureDemoClientAndAgent:', err)
      }
    }

    // 3. Find or update agent in agents table
    let { data: existingAgent } = await supabase
      .from('agents')
      .select('*')
      .eq('client_id', client.id)
      .single()

    let agentRecordId = ''
    if (existingAgent) {
      agentRecordId = existingAgent.id
      if (existingAgent.retell_agent_id !== agentId || existingAgent.agent_name !== agentName) {
        await supabase
          .from('agents')
          .update({
            retell_agent_id: agentId,
            agent_name: agentName
          })
          .eq('id', existingAgent.id)
      }
    } else {
      const { data: newAgent, error: agentErr } = await supabase
        .from('agents')
        .insert({
          client_id: client.id,
          retell_agent_id: agentId,
          agent_name: agentName
        })
        .select()
        .single()

      if (agentErr || !newAgent) {
        console.error('Failed to create demo agent in agents table:', agentErr)
        return null
      }
      agentRecordId = newAgent.id
    }

    return {
      clientId: client.id,
      agentRecordId
    }
  } catch (err) {
    console.error('Failed to ensure demo client and agent:', err)
    return null
  }
}
