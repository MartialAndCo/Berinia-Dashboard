import { getDemoSettings } from '@/lib/demo-settings'

export interface AirtableLeadData {
  businessName: string
  fullName: string
  phone: string
  email: string
  callId?: string
  status?: string
  error?: string
}

/**
 * Sends a demo lead submission to Airtable via either:
 * 1. Webhook Automation URL (settings.airtable_webhook_url or AIRTABLE_WEBHOOK_URL)
 * 2. REST API (settings.airtable_api_key + settings.airtable_base_id or AIRTABLE_API_KEY + AIRTABLE_BASE_ID)
 */
export async function sendLeadToAirtable(data: AirtableLeadData): Promise<{ success: boolean; recordId?: string; error?: string; reason?: string }> {
  const submittedAt = new Date().toISOString()
  const settings = await getDemoSettings().catch(() => null)

  // 1. Check if Airtable Automation Webhook URL is configured
  const webhookUrl = settings?.airtable_webhook_url || process.env.AIRTABLE_WEBHOOK_URL
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: data.fullName,
          businessName: data.businessName,
          phone: data.phone,
          email: data.email,
          callId: data.callId || '',
          status: data.status || 'Pending',
          error: data.error || '',
          submittedAt
        })
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => '')
        console.error('[Airtable Webhook Error]', res.status, errorText)
        return { success: false, error: `Webhook error (${res.status}): ${errorText}` }
      }

      console.log('[Airtable Webhook] Lead successfully delivered to Airtable automation.')
      return { success: true }
    } catch (err: any) {
      console.error('[Airtable Webhook Exception]', err)
      return { success: false, error: err?.message }
    }
  }

  // 2. Check if standard Airtable REST API is configured
  const apiKey = settings?.airtable_api_key || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
  const baseId = settings?.airtable_base_id || process.env.AIRTABLE_BASE_ID
  const tableName = settings?.airtable_table_name || process.env.AIRTABLE_TABLE_NAME || 'Leads'

  if (!apiKey || !baseId) {
    console.warn('[Airtable] No Airtable credentials found (AIRTABLE_WEBHOOK_URL or AIRTABLE_API_KEY + AIRTABLE_BASE_ID).')
    return { success: false, reason: 'Airtable credentials not configured' }
  }

  try {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`
    
    // Map to the user's exact Airtable schema
    const fields: Record<string, any> = {
      'Full Name': data.fullName,
      'Business Name': data.businessName,
      'Phone': data.phone,
      'Email': data.email,
      'Source du Lead': 'Site Web (Démo)',
      'Statut du Lead': data.status === 'called' ? 'Appel lancé' : 'Nouveau Lead'
    }

    if (data.callId) {
      fields["Notes d'appel"] = `Appel IA Retell lancé (ID: ${data.callId})`
    } else if (data.error) {
      fields["Notes d'appel"] = `Erreur appel: ${data.error}`
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [
          {
            fields
          }
        ],
        typecast: true // Allows Airtable to create select options or convert formats automatically
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[Airtable API Error]', res.status, errorText)
      return { success: false, error: errorText }
    }

    const result = await res.json()
    const recordId = result?.records?.[0]?.id
    console.log('[Airtable API] Lead successfully inserted into Airtable:', recordId)
    return { success: true, recordId }
  } catch (err: any) {
    console.error('[Airtable API Exception]', err)
    return { success: false, error: err?.message }
  }
}
