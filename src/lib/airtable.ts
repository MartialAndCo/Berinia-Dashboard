import { getDemoSettings, getDemoLeads } from '@/lib/demo-settings'

export interface AirtableLeadData {
  businessName: string
  fullName: string
  phone: string
  email: string
  callId?: string
  status?: string
  error?: string
}

export interface UpdateAirtableLeadSummaryParams {
  callId?: string
  phone?: string
  callSummary?: string | null
  userSentiment?: string | null
  disconnectionReason?: string | null
  status?: string
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

    if (data.status === 'called') {
      fields["Notes d'appel"] = "Appel en cours... (en attente du résumé Retell)"
    } else if (data.error) {
      fields["Notes d'appel"] = `Erreur appel: ${data.error}`
    } else {
      fields["Notes d'appel"] = "Nouveau Lead (en attente d'appel)"
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

/**
 * Updates an Airtable Lead record with the Retell AI call summary once the call completes & is analyzed.
 */
export async function updateAirtableLeadCallSummary(params: UpdateAirtableLeadSummaryParams): Promise<{ success: boolean; recordId?: string; error?: string }> {
  const settings = await getDemoSettings().catch(() => null)
  const apiKey = settings?.airtable_api_key || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
  const baseId = settings?.airtable_base_id || process.env.AIRTABLE_BASE_ID
  const tableName = settings?.airtable_table_name || process.env.AIRTABLE_TABLE_NAME || 'Leads'

  if (!apiKey || !baseId) {
    return { success: false, error: 'Airtable credentials not configured' }
  }

  let note = params.callSummary?.trim()
  if (!note) {
    if (params.disconnectionReason) {
      const reasonMap: Record<string, string> = {
        'dial_no_answer': 'Appel non abouti : Pas de réponse',
        'dial_busy': 'Appel non abouti : Ligne occupée',
        'voicemail_reached': 'Appel non abouti : Répondeur / Messagerie vocale',
        'dial_failed': 'Appel non abouti : Échec d\'appel',
        'user_hangup': 'Appel interrompu par le prospect'
      }
      note = reasonMap[params.disconnectionReason] || `Appel terminé (${params.disconnectionReason})`
    } else {
      note = 'Appel terminé (aucun résumé disponible)'
    }
  }

  try {
    const cleanPhone = (params.phone || '').replace(/\D/g, '')
    let targetRecordId: string | null = null

    // 1. Try to find the lead in recent demo leads (which may store airtableRecordId)
    const leads = await getDemoLeads().catch(() => [])
    const matchedLead = leads.find(l => 
      (params.callId && l.callId === params.callId) ||
      (cleanPhone && l.phone && l.phone.replace(/\D/g, '') === cleanPhone)
    )

    if (matchedLead?.airtableRecordId) {
      targetRecordId = matchedLead.airtableRecordId
    }

    // 2. Fallback: Query Airtable directly to locate the record by phone or callId
    if (!targetRecordId && (cleanPhone || params.callId)) {
      const searchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?maxRecords=30`
      const listRes = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        cache: 'no-store'
      })

      if (listRes.ok) {
        const listData = await listRes.json()
        const records = listData.records || []
        
        const found = records.find((r: any) => {
          const recPhone = (r.fields?.['Phone'] || '').replace(/\D/g, '')
          if (cleanPhone && recPhone && (recPhone === cleanPhone || recPhone.endsWith(cleanPhone) || cleanPhone.endsWith(recPhone))) {
            return true
          }
          const recNotes = r.fields?.["Notes d'appel"] || ''
          if (params.callId && recNotes.includes(params.callId)) {
            return true
          }
          return false
        })

        if (found) {
          targetRecordId = found.id
        }
      }
    }

    if (!targetRecordId) {
      console.warn('[Airtable] No matching record found to update summary for call:', params.callId, params.phone)
      return { success: false, error: 'Record not found in Airtable' }
    }

    // 3. Update the Airtable record
    const patchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${targetRecordId}`
    const fieldsToUpdate: Record<string, any> = {
      "Notes d'appel": note,
      "Statut du Lead": params.status || 'Démo Réalisée'
    }

    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: fieldsToUpdate,
        typecast: true
      })
    })

    if (!patchRes.ok) {
      const errText = await patchRes.text().catch(() => '')
      console.error('[Airtable PATCH Error]', patchRes.status, errText)
      return { success: false, error: errText }
    }

    console.log(`[Airtable] Successfully updated Notes d'appel for record ${targetRecordId} with Retell AI summary!`)
    return { success: true, recordId: targetRecordId }
  } catch (err: any) {
    console.error('[Airtable Update Error]', err)
    return { success: false, error: err?.message }
  }
}

export interface MarkAirtableSubscriptionActiveParams {
  email?: string | null
  phone?: string | null
  companyName?: string | null
  fullName?: string | null
}

/**
 * Validates "Abonnement actif" on Airtable when a client adds their card / pays their 1st subscription.
 */
export async function markAirtableSubscriptionActive(params: MarkAirtableSubscriptionActiveParams): Promise<{ success: boolean; recordId?: string; error?: string }> {
  const settings = await getDemoSettings().catch(() => null)
  const apiKey = settings?.airtable_api_key || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
  const baseId = settings?.airtable_base_id || process.env.AIRTABLE_BASE_ID
  const tableName = settings?.airtable_table_name || process.env.AIRTABLE_TABLE_NAME || 'Leads'

  if (!apiKey || !baseId) {
    return { success: false, error: 'Airtable credentials not configured' }
  }

  const cleanEmail = params.email?.trim().toLowerCase()
  const cleanPhone = (params.phone || '').replace(/\D/g, '')
  const cleanCompany = params.companyName?.trim().toLowerCase()
  const cleanName = params.fullName?.trim().toLowerCase()

  try {
    // 1. Fetch recent records from Airtable (up to 100)
    const searchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?maxRecords=100`
    const listRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      cache: 'no-store'
    })

    if (!listRes.ok) {
      const err = await listRes.text().catch(() => '')
      return { success: false, error: `Failed to fetch Airtable records: ${err}` }
    }

    const data = await listRes.json()
    const records = data.records || []

    // 2. Find matching record by Email, Company Name, Phone, or Full Name
    let matchedRecord = records.find((r: any) => {
      const rEmail = (r.fields?.['Email'] || '').trim().toLowerCase()
      if (cleanEmail && rEmail && rEmail === cleanEmail) return true
      return false
    })

    if (!matchedRecord && cleanCompany) {
      matchedRecord = records.find((r: any) => {
        const rComp = (r.fields?.['Business Name'] || '').trim().toLowerCase()
        return rComp && (rComp === cleanCompany || rComp.includes(cleanCompany) || cleanCompany.includes(rComp))
      })
    }

    if (!matchedRecord && cleanPhone) {
      matchedRecord = records.find((r: any) => {
        const rPhone = (r.fields?.['Phone'] || '').replace(/\D/g, '')
        return rPhone && (rPhone === cleanPhone || rPhone.endsWith(cleanPhone) || cleanPhone.endsWith(rPhone))
      })
    }

    if (!matchedRecord && cleanName) {
      matchedRecord = records.find((r: any) => {
        const rName = (r.fields?.['Full Name'] || '').trim().toLowerCase()
        return rName && (rName === cleanName || rName.includes(cleanName) || cleanName.includes(rName))
      })
    }

    // 3. If matched, update the record with "Abonnement actif: true"
    if (matchedRecord) {
      const patchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${matchedRecord.id}`
      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'Abonnement actif': true,
            'Statut du Lead': 'GAGNÉ (Client)'
          },
          typecast: true
        })
      })

      if (!patchRes.ok) {
        const errText = await patchRes.text().catch(() => '')
        console.error('[Airtable markActive Error]', patchRes.status, errText)
        return { success: false, error: errText }
      }

      console.log(`[Airtable] Successfully validated 'Abonnement actif' for record ${matchedRecord.id} (${cleanEmail || cleanCompany})`)
      return { success: true, recordId: matchedRecord.id }
    }

    // 4. If no existing record in Airtable, create one with active subscription
    console.log(`[Airtable] No existing lead found for ${cleanEmail || cleanCompany}. Creating new active client record...`)
    const postUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`
    const createRes = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              'Full Name': params.fullName || params.companyName || 'Nouveau Client',
              'Business Name': params.companyName || params.fullName || 'Nouveau Client',
              'Email': params.email || '',
              'Phone': params.phone || '',
              'Source du Lead': 'Plateforme BerinAgents',
              'Statut du Lead': 'GAGNÉ (Client)',
              'Abonnement actif': true,
              "Notes d'appel": 'Compte activé et premier abonnement réglé par CB'
            }
          }
        ],
        typecast: true
      })
    })

    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => '')
      return { success: false, error: errText }
    }

    const createData = await createRes.json()
    const newId = createData.records?.[0]?.id
    return { success: true, recordId: newId }
  } catch (err: any) {
    console.error('[Airtable markActive Exception]', err)
    return { success: false, error: err?.message }
  }
}


