import { NextResponse } from 'next/server'
import { dispatchReminder, ReminderStep } from '@/lib/sendblue'

/**
 * Cal.com Workflows Reminder Webhook Handler
 * Called internally by Cal.com Workflows before the scheduled event.
 * Endpoint: /api/webhooks/cal/reminder?step=h24 | h6 | h1 | m5 | m1
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rawStep = searchParams.get('step')?.toLowerCase() || 'h24'

    const validSteps: ReminderStep[] = ['direct', 'yes_ack', 'h24', 'h6', 'h1', 'm5', 'm1']
    const step: ReminderStep = validSteps.includes(rawStep as ReminderStep)
      ? (rawStep as ReminderStep)
      : 'h24'

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const payload = body.payload || body.data || body
    const attendees = payload.attendees || []
    const primaryAttendee = attendees[0] || {}

    const attendeePhone =
      primaryAttendee.phoneNumber ||
      payload.responses?.phone?.value ||
      payload.phone ||
      null

    const attendeeName =
      primaryAttendee.name ||
      payload.responses?.name?.value ||
      payload.name ||
      null

    const startTime = payload.startTime || payload.start || null

    const meetingLink =
      (payload.meetingUrl && typeof payload.meetingUrl === 'string' && payload.meetingUrl.startsWith('http'))
        ? payload.meetingUrl
        : ((payload.location && typeof payload.location === 'string' && payload.location.startsWith('http'))
          ? payload.location
          : (payload.videoCallUrl || (payload.uid ? `https://app.cal.com/booking/${payload.uid}` : payload.bookingUrl || null)))

    const status = payload.status?.toLowerCase() || ''
    if (status === 'cancelled' || status === 'rejected') {
      console.log(`[Cal.com Reminder] Skipped ${step} reminder because booking is ${status}`)
      return NextResponse.json({ success: true, skipped: status })
    }

    if (!attendeePhone) {
      console.warn(`[Cal.com Reminder] No phone number found in payload for ${step} reminder`)
      return NextResponse.json({ success: false, error: 'No phone number in payload' }, { status: 400 })
    }

    console.log(`[Cal.com Reminder] Dispatching step "${step}" to ${attendeePhone} for ${attendeeName}`)

    const result = await dispatchReminder({
      phone: attendeePhone,
      fullName: attendeeName,
      startTime,
      meetingLink,
      step,
    })

    return NextResponse.json({ success: true, step, result })
  } catch (err: any) {
    console.error('[Cal.com Reminder Exception]', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
