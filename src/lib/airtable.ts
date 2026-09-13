import { getDemoSettings, getDemoLeads } from '@/lib/demo-settings'

export interface AirtableLeadData {
  businessName: string
  fullName: string
  phone: string
  email: string
  callId?: string
  status?: string
  error?: string
  leadSource?: string
}

export interface UpdateAirtableLeadSummaryParams {
  callId?: string
  phone?: string
  email?: string
  callSummary?: string | null
  userSentiment?: string | null
  disconnectionReason?: string | null
  status?: string
  isBooked?: boolean
  bookedTime?: string | null
  bookingUrl?: string | null
  recordingUrl?: string | null
  callLink?: string | null
  transcript?: string | null
  customAnalysisData?: any
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
    
    // Map to the user's exact Airtable schema (English)
    const fields: Record<string, any> = {
      'Full Name': data.fullName,
      'Business Name': data.businessName,
      'Phone': data.phone,
      'Email': data.email,
      'Lead Source': data.leadSource || 'Website (Demo)',
      'Lead Status': data.status === 'called' ? 'Call Triggered' : 'New Lead',
      'Operations Metrics': ['recGIbV6Jd2rc3MXf']
    }

    if (data.status === 'called') {
      fields['Call Notes'] = 'Call in progress... (waiting for Retell summary)'
    } else if (data.error) {
      fields['Call Notes'] = `Call error: ${data.error}`
    } else {
      fields['Call Notes'] = 'New Lead (waiting for demo call)'
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

function normalizeDateToISO(dateInput?: string | null): string | null {
  if (!dateInput) return null
  const trimmed = dateInput.trim()
  const parsed = Date.parse(trimmed)
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString()
  }
  return null
}

export interface DetermineLeadStatusParams {
  isBooked?: boolean
  disconnectionReason?: string | null
  userSentiment?: string | null
  callSummary?: string | null
  transcript?: string | null
  customAnalysisData?: any
}

/**
 * Intelligent lead qualification from call analysis data
 */
export function determineLeadStatus(params: DetermineLeadStatusParams): {
  status: 'Meeting Scheduled' | 'Not Interested' | 'Demo Completed' | 'Unreachable / Voicemail'
  note?: string
} {
  // 1. Meeting Scheduled (highest priority)
  if (params.isBooked) {
    return { status: 'Meeting Scheduled' }
  }

  // 2. Unreached calls (no answer, busy, failed, voicemail)
  const unreachedReasons = ['dial_no_answer', 'dial_busy', 'dial_failed', 'voicemail_reached']
  if (params.disconnectionReason && unreachedReasons.includes(params.disconnectionReason)) {
    const reasonMap: Record<string, string> = {
      'dial_no_answer': 'Call unreached: No answer',
      'dial_busy': 'Call unreached: Line busy',
      'voicemail_reached': 'Call unreached: Voicemail reached',
      'dial_failed': 'Call unreached: Dial failed'
    }
    return {
      status: 'Unreachable / Voicemail',
      note: reasonMap[params.disconnectionReason]
    }
  }

  // 3. Detection of "Pas intéressé" / Refusal
  const sentiment = (params.userSentiment || '').toLowerCase().trim()
  const summary = (params.callSummary || '').toLowerCase()
  const transcript = (params.transcript || '').toLowerCase()
  const custom = params.customAnalysisData || {}

  const refusalPatterns = [
    /pas\s+int[eé]ress[eé]/i,
    /aucun\s+int[eé]r[eê]t/i,
    /ne\s+m'?int[eé]resse\s+pas/i,
    /ne\s+souhaite\s+pas/i,
    /refus(?:e|\b)/i,
    /ne\s+veut\s+pas/i,
    /pas\s+le\s+moment/i,
    /trop\s+cher/i,
    /pas\s+de\s+budget/i,
    /d[eé]j[aà]\s+[eé]quip[eé]/i,
    /supprimer\s+(?:mon|de\s+la)\s+liste/i,
    /ne\s+plus\s+(?:me\s+)?rappeler/i,
    /ne\s+plus\s+appeler/i,
    /d[eé]sabonner/i,
    /not\s+interested/i,
    /no\s+interest/i,
    /stop\s+calling/i,
    /remove\s+(?:me|from)/i
  ]

  const matchesRefusal = refusalPatterns.some(p => p.test(summary) || p.test(transcript))
  const isNegativeSentiment = sentiment === 'negative'
  const isCustomDeclined = custom.interested === false || custom.interest_level === 'not_interested' || custom.lead_interest === 'not_interested'

  if (matchesRefusal || isNegativeSentiment || isCustomDeclined) {
    return { status: 'Not Interested' }
  }

  // 4. Default for completed calls without booking
  return { status: 'Demo Completed' }
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

  // Determine intelligent lead status if not provided
  let resolvedStatus = params.status
  if (!resolvedStatus) {
    const calculated = determineLeadStatus({
      isBooked: params.isBooked,
      disconnectionReason: params.disconnectionReason,
      userSentiment: params.userSentiment,
      callSummary: params.callSummary,
      transcript: params.transcript,
      customAnalysisData: params.customAnalysisData
    })
    resolvedStatus = calculated.status
  }

  let note: string | null = null
  if (params.callSummary && params.callSummary.trim()) {
    note = params.callSummary.trim()
  } else if (params.disconnectionReason) {
    const unreachedReasonMap: Record<string, string> = {
      'dial_no_answer': 'Call unreached: No answer',
      'dial_busy': 'Call unreached: Line busy',
      'voicemail_reached': 'Call unreached: Voicemail reached',
      'dial_failed': 'Call unreached: Dial failed',
      'user_hangup': 'Call ended by prospect'
    }
    note = unreachedReasonMap[params.disconnectionReason] || null
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
          const recNotes = r.fields?.['Call Notes'] || r.fields?.["Notes d'appel"] || ''
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
      'Lead Status': resolvedStatus
    }

    // Only update "Call Notes" if we have a real summary or a specific failure note
    // Never overwrite with generic "agent_hangup" or empty placeholders
    if (note) {
      fieldsToUpdate['Call Notes'] = note
    }

    // Populate Meeting Date field if booking timestamp is present
    if (params.bookedTime) {
      const isoDate = normalizeDateToISO(params.bookedTime)
      if (isoDate) {
        fieldsToUpdate['Meeting Date'] = isoDate
      }
    }

    // Populate Call Link with the appointment meeting link (Google Meet / Cal.com link) ONLY if a meeting was booked
    const meetingLink = (params.isBooked || resolvedStatus === 'Meeting Scheduled' || resolvedStatus === 'RDV Programmé')
      ? (params.callLink || params.bookingUrl || null)
      : null

    if (meetingLink) {
      fieldsToUpdate['Call Link'] = meetingLink
    }

    let patchRes = await fetch(patchUrl, {
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
      const errJson = await patchRes.json().catch(() => null)
      const errMsg = errJson?.error?.message || ''

      // 1. If 'Call Link' is unknown in Airtable, try 'Call link'
      if (errJson?.error?.type === 'UNKNOWN_FIELD_NAME' && errMsg.includes('Call Link') && meetingLink) {
        delete fieldsToUpdate['Call Link']
        fieldsToUpdate['Call link'] = meetingLink

        patchRes = await fetch(patchUrl, {
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
      }

      // 2. If 'Call link' is also unknown, remove the field so note, status, and Date RDV still update cleanly
      if (!patchRes.ok) {
        const retryErr = await patchRes.json().catch(() => null)
        const retryMsg = retryErr?.error?.message || ''
        if (retryErr?.error?.type === 'UNKNOWN_FIELD_NAME' && (retryMsg.includes('Call link') || retryMsg.includes('Call Link'))) {
          delete fieldsToUpdate['Call Link']
          delete fieldsToUpdate['Call link']

          patchRes = await fetch(patchUrl, {
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
        }
      }
    }

    if (!patchRes.ok) {
      const errText = await patchRes.text().catch(() => '')
      console.error('[Airtable PATCH Error]', patchRes.status, errText)
      return { success: false, error: errText }
    }

    console.log(`[Airtable] Successfully updated lead for record ${targetRecordId}!`)
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
            'Active Subscription': true,
            'Lead Status': 'Closed Won'
          },
          typecast: true
        })
      })

      if (!patchRes.ok) {
        const errText = await patchRes.text().catch(() => '')
        console.error('[Airtable markActive Error]', patchRes.status, errText)
        return { success: false, error: errText }
      }

      console.log(`[Airtable] Successfully validated 'Active Subscription' for record ${matchedRecord.id} (${cleanEmail || cleanCompany})`)
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
              'Full Name': params.fullName || params.companyName || 'New Client',
              'Business Name': params.companyName || params.fullName || 'New Client',
              'Email': params.email || '',
              'Phone': params.phone || '',
              'Lead Source': 'Platform Sign-up',
              'Lead Status': 'Closed Won',
              'Active Subscription': true,
              'Call Notes': 'Account activated and first subscription paid by card'
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

export interface MarkAirtableMeetingBookedParams {
  email?: string | null
  phone?: string | null
  fullName?: string | null
  companyName?: string | null
  startTime?: string | null
  bookingUrl?: string | null
  meetingUrl?: string | null
  callLink?: string | null
  notes?: string | null
  showUpStatus?: 'Scheduled' | 'Rescheduled' | 'Attended' | 'Cancelled' | null
  businessType?: string | null
  revenue?: string | null
  currentSystem?: string | null
  afterHours?: string | null
  callVolume?: string | null
  leadSource?: string | null
}

/**
 * Updates a Lead record to "RDV Programmé" when a booking is created on Cal.com
 */
export async function markAirtableMeetingBooked(params: MarkAirtableMeetingBookedParams): Promise<{ success: boolean; recordId?: string; error?: string }> {
  const settings = await getDemoSettings().catch(() => null)
  const apiKey = settings?.airtable_api_key || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
  const baseId = settings?.airtable_base_id || process.env.AIRTABLE_BASE_ID
  const tableName = settings?.airtable_table_name || process.env.AIRTABLE_TABLE_NAME || 'Leads'

  if (!apiKey || !baseId) {
    return { success: false, error: 'Airtable credentials not configured' }
  }

  const cleanEmail = params.email?.trim().toLowerCase()
  const cleanPhone = (params.phone || '').replace(/\D/g, '')
  const cleanName = params.fullName?.trim().toLowerCase()
  const cleanCompany = params.companyName?.trim().toLowerCase()

  try {
    const searchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?maxRecords=100`
    const listRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      cache: 'no-store'
    })

    if (!listRes.ok) {
      const err = await listRes.text().catch(() => '')
      return { success: false, error: err }
    }

    const data = await listRes.json()
    const records = data.records || []

    let matchedRecord = records.find((r: any) => {
      const rEmail = (r.fields?.['Email'] || '').trim().toLowerCase()
      if (cleanEmail && rEmail && rEmail === cleanEmail) return true
      return false
    })

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

    if (!matchedRecord && cleanCompany) {
      matchedRecord = records.find((r: any) => {
        const rComp = (r.fields?.['Business Name'] || '').trim().toLowerCase()
        return rComp && (rComp === cleanCompany || rComp.includes(cleanCompany) || cleanCompany.includes(rComp))
      })
    }

    const fieldsToUpdate: Record<string, any> = {
      'Lead Status': 'Meeting Scheduled',
      'Show-up Status': params.showUpStatus || 'Scheduled',
      'Operations Metrics': ['recGIbV6Jd2rc3MXf']
    }

    if (params.startTime) {
      const isoDate = normalizeDateToISO(params.startTime)
      if (isoDate) {
        fieldsToUpdate['Meeting Date'] = isoDate
      }
    }

    const meetingLink = params.callLink || params.meetingUrl || params.bookingUrl || null
    if (meetingLink) {
      fieldsToUpdate['Call Link'] = meetingLink
    }

    if (params.notes && params.notes.trim()) {
      const existingNotes = matchedRecord?.fields?.['Call Notes'] || matchedRecord?.fields?.["Notes d'appel"] || ''
      fieldsToUpdate['Call Notes'] = existingNotes ? `${existingNotes}\n\n${params.notes.trim()}` : params.notes.trim()
    }

    if (params.companyName) {
      fieldsToUpdate['Business Name'] = params.companyName
    }

    // Set dedicated Single Select questionnaire fields (English)
    if (params.businessType) {
      fieldsToUpdate['Business Type'] = params.businessType
    }
    if (params.revenue) {
      fieldsToUpdate['Annual Revenue'] = params.revenue
    }
    if (params.currentSystem) {
      fieldsToUpdate['Current Phone System'] = params.currentSystem
    }
    if (params.afterHours) {
      fieldsToUpdate['After-Hours Handling'] = params.afterHours
    }
    if (params.callVolume) {
      fieldsToUpdate['Monthly Call Volume'] = params.callVolume
    }
    if (params.leadSource) {
      fieldsToUpdate['Lead Source'] = params.leadSource
    }

    if (matchedRecord) {
      const patchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${matchedRecord.id}`
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
        return { success: false, error: errText }
      }

      console.log(`[Airtable] Successfully set 'Meeting Scheduled' and questionnaire answers for record ${matchedRecord.id}`)
      return { success: true, recordId: matchedRecord.id }
    } else {
      // Create new lead if not exists
      const postUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`
      const newLeadFields: Record<string, any> = {
        'Full Name': params.fullName || 'Cal.com Prospect',
        'Email': params.email || '',
        'Phone': params.phone || '',
        'Lead Source': params.leadSource || 'Website (Demo)',
        'Lead Status': 'Meeting Scheduled',
        'Show-up Status': params.showUpStatus || 'Scheduled',
        'Operations Metrics': ['recGIbV6Jd2rc3MXf']
      }

      if (params.companyName) {
        newLeadFields['Business Name'] = params.companyName
      }

      if (params.notes && params.notes.trim()) {
        newLeadFields['Call Notes'] = params.notes.trim()
      }

      const isoDate = normalizeDateToISO(params.startTime)
      if (isoDate) {
        newLeadFields['Meeting Date'] = isoDate
      }

      if (meetingLink) {
        newLeadFields['Call Link'] = meetingLink
      }

      // Set dedicated Single Select questionnaire fields (English)
      if (params.businessType) {
        newLeadFields['Business Type'] = params.businessType
      }
      if (params.revenue) {
        newLeadFields['Annual Revenue'] = params.revenue
      }
      if (params.currentSystem) {
        newLeadFields['Current Phone System'] = params.currentSystem
      }
      if (params.afterHours) {
        newLeadFields['After-Hours Handling'] = params.afterHours
      }
      if (params.callVolume) {
        newLeadFields['Monthly Call Volume'] = params.callVolume
      }

      const createRes = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [
            {
              fields: newLeadFields
            }
          ],
          typecast: true
        })
      })

      if (!createRes.ok) {
        const err = await createRes.text().catch(() => '')
        return { success: false, error: err }
      }

      const createData = await createRes.json()
      return { success: true, recordId: createData.records?.[0]?.id }
    }
  } catch (err: any) {
    console.error('[Airtable markMeetingBooked Error]', err)
    return { success: false, error: err?.message }
  }
}

/**
 * Queries Cal.com API to find a booking matching the given date, email, or phone,
 * and extracts the Google Meet or Cal.com meeting URL.
 */
export async function getCalMeetingUrl(options: {
  email?: string | null
  phone?: string | null
  startTime?: string | null
}): Promise<string | null> {
  const apiKey = process.env.CAL_API_KEY || 'cal_live_80fa86a5d22da79196f19d220a7ebd1e'
  if (!apiKey) return null

  try {
    const res = await fetch('https://api.cal.com/v2/bookings?take=15', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'cal-api-version': '2024-08-13'
      },
      cache: 'no-store'
    })
    if (!res.ok) return null
    const data = await res.json()
    const bookings = data.data || []

    const cleanEmail = options.email?.toLowerCase().trim()
    const cleanPhone = (options.phone || '').replace(/\D/g, '')

    const matched = bookings.find((b: any) => {
      if (options.startTime && b.start) {
        const bTime = new Date(b.start).getTime()
        const targetTime = new Date(options.startTime).getTime()
        if (!isNaN(bTime) && !isNaN(targetTime) && Math.abs(bTime - targetTime) < 60000) {
          return true
        }
      }
      if (cleanEmail && Array.isArray(b.attendees)) {
        if (b.attendees.some((a: any) => a.email?.toLowerCase() === cleanEmail)) {
          return true
        }
      }
      if (cleanPhone && Array.isArray(b.attendees)) {
        if (b.attendees.some((a: any) => (a.phoneNumber || '').replace(/\D/g, '').endsWith(cleanPhone.slice(-8)))) {
          return true
        }
      }
      return false
    })

    if (matched) {
      if (matched.meetingUrl && typeof matched.meetingUrl === 'string' && matched.meetingUrl.startsWith('http')) {
        return matched.meetingUrl
      }
      if (matched.location && typeof matched.location === 'string' && matched.location.startsWith('http')) {
        return matched.location
      }
      if (matched.uid) {
        return `https://app.cal.com/booking/${matched.uid}`
      }
    }
  } catch (e) {
    console.warn('[getCalMeetingUrl Error]', e)
  }
  return null
}

/**
 * Fetches a single record from Airtable by record ID.
 */
export async function getAirtableLeadRecord(recordId: string): Promise<{ success: boolean; record?: any; error?: string }> {
  const settings = await getDemoSettings().catch(() => null)
  const apiKey = settings?.airtable_api_key || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
  const baseId = settings?.airtable_base_id || process.env.AIRTABLE_BASE_ID
  const tableName = settings?.airtable_table_name || process.env.AIRTABLE_TABLE_NAME || 'Leads'

  if (!apiKey || !baseId) {
    return { success: false, error: 'Airtable credentials not configured' }
  }

  try {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store'
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { success: false, error: `Airtable fetch failed (${res.status}): ${errText}` }
    }

    const record = await res.json()
    return { success: true, record }
  } catch (err: any) {
    return { success: false, error: err?.message }
  }
}

/**
 * Updates a single record in Airtable by record ID.
 */
export async function updateAirtableLeadRecord(recordId: string, fields: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  const settings = await getDemoSettings().catch(() => null)
  const apiKey = settings?.airtable_api_key || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
  const baseId = settings?.airtable_base_id || process.env.AIRTABLE_BASE_ID
  const tableName = settings?.airtable_table_name || process.env.AIRTABLE_TABLE_NAME || 'Leads'

  if (!apiKey || !baseId) {
    return { success: false, error: 'Airtable credentials not configured' }
  }

  try {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields,
        typecast: true
      })
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { success: false, error: `Airtable update failed (${res.status}): ${errText}` }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message }
  }
}

export interface CancelAirtableMeetingParams {
  email?: string | null
  phone?: string | null
  fullName?: string | null
  bookingUid?: string | null
  cancellationReason?: string | null
}

/**
 * Marks a lead as 'Cancelled' in Airtable when a booking is cancelled or rejected in Cal.com
 */
export async function cancelAirtableMeeting(params: CancelAirtableMeetingParams): Promise<{ success: boolean; recordId?: string; error?: string }> {
  const settings = await getDemoSettings().catch(() => null)
  const apiKey = settings?.airtable_api_key || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
  const baseId = settings?.airtable_base_id || process.env.AIRTABLE_BASE_ID
  const tableName = settings?.airtable_table_name || process.env.AIRTABLE_TABLE_NAME || 'Leads'

  if (!apiKey || !baseId) {
    return { success: false, error: 'Airtable credentials not configured' }
  }

  const cleanEmail = params.email?.trim().toLowerCase()
  const cleanPhone = (params.phone || '').replace(/\D/g, '')

  try {
    const searchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?maxRecords=100`
    const listRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      cache: 'no-store'
    })

    if (!listRes.ok) {
      const err = await listRes.text().catch(() => '')
      return { success: false, error: err }
    }

    const data = await listRes.json()
    const records = data.records || []

    let matchedRecord = records.find((r: any) => {
      const rEmail = (r.fields?.['Email'] || '').trim().toLowerCase()
      return rEmail && rEmail === cleanEmail
    })

    if (!matchedRecord && cleanPhone) {
      matchedRecord = records.find((r: any) => {
        const rPhone = (r.fields?.['Phone'] || '').replace(/\D/g, '')
        return rPhone && (rPhone === cleanPhone || rPhone.endsWith(cleanPhone) || cleanPhone.endsWith(rPhone))
      })
    }

    if (!matchedRecord && params.fullName) {
      const cleanName = params.fullName.trim().toLowerCase()
      matchedRecord = records.find((r: any) => {
        const rName = (r.fields?.['Full Name'] || '').trim().toLowerCase()
        return rName && (rName === cleanName || rName.includes(cleanName) || cleanName.includes(rName))
      })
    }

    if (!matchedRecord) {
      console.warn('[Airtable] No matching lead record found to cancel meeting for:', params.email, params.phone)
      return { success: false, error: 'Record not found in Airtable' }
    }

    const fieldsToUpdate: Record<string, any> = {
      'Show-up Status': 'Cancelled',
      'Operations Metrics': ['recGIbV6Jd2rc3MXf']
    }

    if (params.cancellationReason && params.cancellationReason.trim()) {
      const existingNotes = matchedRecord.fields?.['Call Notes'] || ''
      fieldsToUpdate['Call Notes'] = existingNotes
        ? `${existingNotes}\n\n[Cal.com Cancelled] Reason: ${params.cancellationReason.trim()}`
        : `[Cal.com Cancelled] Reason: ${params.cancellationReason.trim()}`
    }

    const patchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${matchedRecord.id}`
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
      return { success: false, error: errText }
    }

    console.log(`[Airtable] Successfully marked meeting as 'Cancelled' for record ${matchedRecord.id}`)
    return { success: true, recordId: matchedRecord.id }
  } catch (err: any) {
    console.error('[Airtable cancelAirtableMeeting Exception]', err)
    return { success: false, error: err?.message }
  }
}

export interface FathomAnalysisResult {
  callOutcome: 'Closed Won (One-Call)' | 'Proposal / Contract Sent' | 'Second Call Scheduled' | 'Under Consideration (Hot)' | 'Nurturing (Cold)' | 'Closed Lost' | 'Disqualified'
  leadStatus: 'Closed Won' | 'Meeting Scheduled' | 'Demo Completed' | 'Closed Lost' | 'Not Interested'
  lostReason?: 'Price / Retainer Too High' | 'Refused Contract Commitment' | 'AI / Voice Skepticism' | 'Bad Timing / Postponed' | 'Not Sole Decision Maker' | 'Lack of Call Volume' | 'Existing Provider / Agency' | 'Ghost / Unresponsive' | 'Other' | null
  nurturingStatus?: 'Follow-up Day 2 (Urgent)' | 'Follow-up Day 7 (Case Study)' | 'Follow-up 30 Days' | 'Email / SMS Sequence' | 'Do Not Contact (Blacklist)' | null
  followUpDate?: string | null // YYYY-MM-DD
  keySummary: string
  recordingUrl?: string | null
}

export interface UpdateAirtableFromFathomParams {
  attendeeEmail: string
  attendeeName?: string | null
  recordingUrl?: string | null
  analysis: FathomAnalysisResult
}

/**
 * Updates an Airtable Lead with post-call classification, notes, and metrics from Fathom AI transcription.
 */
export async function updateAirtableFromFathom(params: UpdateAirtableFromFathomParams): Promise<{ success: boolean; recordId?: string; error?: string }> {
  const settings = await getDemoSettings().catch(() => null)
  const apiKey = settings?.airtable_api_key || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
  const baseId = settings?.airtable_base_id || process.env.AIRTABLE_BASE_ID
  const tableName = settings?.airtable_table_name || process.env.AIRTABLE_TABLE_NAME || 'Leads'

  if (!apiKey || !baseId) {
    return { success: false, error: 'Airtable credentials not configured' }
  }

  const cleanEmail = params.attendeeEmail.trim().toLowerCase()

  try {
    const searchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?maxRecords=100`
    const listRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      cache: 'no-store'
    })

    if (!listRes.ok) {
      const err = await listRes.text().catch(() => '')
      return { success: false, error: err }
    }

    const data = await listRes.json()
    const records = data.records || []

    let matchedRecord = records.find((r: any) => {
      const rEmail = (r.fields?.['Email'] || '').trim().toLowerCase()
      return rEmail && rEmail === cleanEmail
    })

    if (!matchedRecord && params.attendeeName) {
      const cleanName = params.attendeeName.trim().toLowerCase()
      matchedRecord = records.find((r: any) => {
        const rName = (r.fields?.['Full Name'] || '').trim().toLowerCase()
        return rName && (rName === cleanName || rName.includes(cleanName) || cleanName.includes(rName))
      })
    }

    const fieldsToUpdate: Record<string, any> = {
      'Show-up Status': 'Attended',
      'Call Outcome': params.analysis.callOutcome,
      'Lead Status': params.analysis.leadStatus,
      'Operations Metrics': ['recGIbV6Jd2rc3MXf']
    }

    if (params.analysis.leadStatus === 'Closed Won') {
      fieldsToUpdate['Active Subscription'] = true
    }

    if (params.analysis.lostReason) {
      fieldsToUpdate['Lost Reason'] = params.analysis.lostReason
    }

    if (params.analysis.nurturingStatus) {
      fieldsToUpdate['Nurturing Status'] = params.analysis.nurturingStatus
    }

    if (params.analysis.followUpDate) {
      fieldsToUpdate['Follow-up Date'] = params.analysis.followUpDate
    }

    let notesText = params.analysis.keySummary || ''
    if (params.recordingUrl) {
      notesText = `Fathom Recording: ${params.recordingUrl}\n\n${notesText}`
    }

    if (matchedRecord) {
      const existingNotes = matchedRecord.fields?.['Call Notes'] || ''
      fieldsToUpdate['Call Notes'] = existingNotes 
        ? `${existingNotes}\n\n---\n[Fathom Post-Call Summary]:\n${notesText}` 
        : `[Fathom Post-Call Summary]:\n${notesText}`

      const patchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${matchedRecord.id}`
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
        return { success: false, error: errText }
      }

      console.log(`[Airtable] Successfully updated post-call metrics from Fathom for record ${matchedRecord.id}`)
      return { success: true, recordId: matchedRecord.id }
    } else {
      // Create new lead if prospect was not already in Airtable
      const postUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`
      fieldsToUpdate['Full Name'] = params.attendeeName || 'Fathom Prospect'
      fieldsToUpdate['Email'] = params.attendeeEmail
      fieldsToUpdate['Lead Source'] = 'Other'
      fieldsToUpdate['Call Notes'] = `[Fathom Post-Call Summary]:\n${notesText}`

      const postRes = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{ fields: fieldsToUpdate }],
          typecast: true
        })
      })

      if (!postRes.ok) {
        const errText = await postRes.text().catch(() => '')
        return { success: false, error: errText }
      }

      const postData = await postRes.json()
      const newId = postData?.records?.[0]?.id
      console.log(`[Airtable] Created new lead from Fathom call: ${newId}`)
      return { success: true, recordId: newId }
    }
  } catch (err: any) {
    console.error('[Airtable updateAirtableFromFathom Exception]', err)
    return { success: false, error: err?.message }
  }
}






