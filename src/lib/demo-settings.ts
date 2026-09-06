import { getServiceSupabase } from '@/lib/supabase'

export interface DemoSettings {
  agent_id: string
  from_number: string
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
  calendar_url: process.env.CALENDAR_URL || 'https://cal.com',
  enabled: true,
  owner_name: 'Martin'
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
      calendar_url: stored?.calendar_url || process.env.CALENDAR_URL || 'https://cal.com',
      enabled: stored?.enabled !== undefined ? Boolean(stored.enabled) : true,
      owner_name: stored?.owner_name || 'Martin'
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
      owner_name: newSettings.owner_name !== undefined ? newSettings.owner_name.trim() : (existingSettings.owner_name || 'Martin')
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
