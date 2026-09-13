import { NextResponse } from 'next/server'
import { markAirtableMeetingBooked } from '@/lib/airtable'

/**
 * Cal.com Webhook Handler
 * When a booking is created or rescheduled on Cal.com (via AI agent live call or direct link),
 * this updates the prospect's record in Airtable to "RDV Programmé".
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const event = body.triggerEvent || body.event || ''
    const payload = body.payload || body.data || body

    console.log(`[Cal.com Webhook] Received event: ${event}`)

    if (event === 'BOOKING_CREATED' || event === 'BOOKING_RESCHEDULED') {
      const attendees = payload.attendees || []
      const primaryAttendee = attendees[0] || {}

      const attendeeEmail = primaryAttendee.email || payload.responses?.email?.value || payload.email || null
      const attendeeName = primaryAttendee.name || payload.responses?.name?.value || payload.name || null
      const attendeePhone = primaryAttendee.phoneNumber || payload.responses?.phone?.value || payload.phone || null
      
      const startTime = payload.startTime || payload.start || null
      const meetingLink = 
        (payload.meetingUrl && typeof payload.meetingUrl === 'string' && payload.meetingUrl.startsWith('http'))
          ? payload.meetingUrl
          : ((payload.location && typeof payload.location === 'string' && payload.location.startsWith('http'))
            ? payload.location
            : (payload.videoCallUrl || (payload.uid ? `https://app.cal.com/booking/${payload.uid}` : payload.bookingUrl || null)))

      // Extract questionnaire responses & single-select values from Cal.com webhook
      let businessType = payload.metadata?.businessType || null
      let revenue = payload.metadata?.revenue || null
      let currentSystem = payload.metadata?.currentSystem || null
      let afterHours = payload.metadata?.afterHours || null
      let callVolume = payload.metadata?.callVolume || null

      const rawNotes =
        payload.responses?.notes?.value ||
        payload.responses?.notes ||
        payload.description ||
        payload.additionalNotes ||
        payload.metadata?.funnelAnswers ||
        payload.metadata?.answers ||
        ''

      // Fallback: parse from embedded [AIRTABLE_DATA:{...}] tag if present in notes
      if (typeof rawNotes === 'string') {
        const match = rawNotes.match(/\[AIRTABLE_DATA:(\{.*?\})\]/)
        if (match && match[1]) {
          try {
            const parsed = JSON.parse(match[1])
            businessType = businessType || parsed.businessType || null
            revenue = revenue || parsed.revenue || null
            currentSystem = currentSystem || parsed.currentSystem || null
            afterHours = afterHours || parsed.afterHours || null
            callVolume = callVolume || parsed.callVolume || null
          } catch {
            // ignore parse error
          }
        }
      }

      // Extract genuine user notes if the prospect wrote a personal comment in Cal.com
      let userNote: string | null = null
      if (typeof rawNotes === 'string') {
        const stripped = rawNotes
          .replace(/\[AIRTABLE_DATA:\{[\s\S]*?\}\]/g, '')
          .replace(/•\s*Type d'activité\s*:[\s\S]*$/g, '')
          .replace(/•\s*CA annuel\s*:[\s\S]*$/g, '')
          .replace(/•\s*Qui répond actuellement\s*:[\s\S]*$/g, '')
          .replace(/•\s*Gestion en fermeture\s*:[\s\S]*$/g, '')
          .replace(/•\s*Volume d'appels[\s\S]*$/g, '')
          .replace(/📋\s*Réponses au Questionnaire[\s\S]*$/g, '')
          .trim()
        if (stripped.length > 0) {
          userNote = stripped
        }
      }

      // Extract Business Name from Cal.com responses (custom booking question) or metadata
      let businessName = payload.metadata?.businessName || payload.metadata?.company || null
      if (!businessName && payload.responses && typeof payload.responses === 'object') {
        for (const [k, v] of Object.entries(payload.responses)) {
          const keyLower = k.toLowerCase()
          const val = typeof v === 'object' && v !== null ? (v as any).value : v
          if (
            (keyLower.includes('business') || keyLower.includes('company') || keyLower.includes('entreprise')) &&
            typeof val === 'string' &&
            val.trim()
          ) {
            businessName = val.trim()
            break
          }
        }
      }

      console.log('[Cal.com Webhook] Booking detected for:', {
        attendeeEmail,
        attendeeName,
        attendeePhone,
        businessName,
        startTime,
        meetingLink,
        businessType,
        revenue,
        currentSystem,
        afterHours,
        callVolume,
        userNote
      })

      const res = await markAirtableMeetingBooked({
        email: attendeeEmail,
        phone: attendeePhone,
        fullName: attendeeName,
        companyName: businessName,
        startTime: startTime,
        bookingUrl: meetingLink,
        meetingUrl: meetingLink,
        callLink: meetingLink,
        notes: userNote || undefined,
        businessType,
        revenue,
        currentSystem,
        afterHours,
        callVolume
      })

      return NextResponse.json({ success: true, airtable: res })
    }

    return NextResponse.json({ success: true, ignored: event })
  } catch (err: any) {
    console.error('[Cal.com Webhook Exception]', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
