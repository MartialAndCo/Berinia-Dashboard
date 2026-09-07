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

      console.log('[Cal.com Webhook] Booking detected for:', {
        attendeeEmail,
        attendeeName,
        attendeePhone,
        startTime,
        meetingLink
      })

      const res = await markAirtableMeetingBooked({
        email: attendeeEmail,
        phone: attendeePhone,
        fullName: attendeeName,
        startTime: startTime,
        bookingUrl: meetingLink,
        meetingUrl: meetingLink,
        callLink: meetingLink
      })

      return NextResponse.json({ success: true, airtable: res })
    }

    return NextResponse.json({ success: true, ignored: event })
  } catch (err: any) {
    console.error('[Cal.com Webhook Exception]', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
