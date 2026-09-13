import { NextResponse } from 'next/server'
import { parseFathomPayload, analyzeFathomMeeting } from '@/lib/fathom-analyzer'
import { updateAirtableFromFathom } from '@/lib/airtable'

/**
 * Fathom AI Meeting Webhook Handler
 * 
 * Triggered automatically when a sales / strategy call is completed and transcribed by Fathom.video.
 * 1. Extracts the meeting transcript, summary, and prospect email.
 * 2. Uses AI (OpenAI / Gemini / Fathom NLP) to categorize:
 *    - Show-up Status -> 'Attended'
 *    - Call Outcome ('Closed Won', 'Proposal Sent', 'Second Call Scheduled', etc.)
 *    - Lost Reason (if objection/refusal detected)
 *    - Nurturing Status & Follow-up Date
 *    - Condensed Call Notes with Fathom recording link
 * 3. Updates Airtable CRM record automatically.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid or missing JSON payload' }, { status: 400 })
    }

    console.log('[Fathom Webhook] Received webhook payload')

    const parsed = parseFathomPayload(body)
    if (!parsed || !parsed.attendeeEmail) {
      console.warn('[Fathom Webhook] Could not extract prospect email from Fathom payload:', JSON.stringify(body).slice(0, 300))
      return NextResponse.json({
        success: false,
        message: 'No prospect email found in payload. Ensure the attendee email is present.'
      }, { status: 200 })
    }

    console.log('[Fathom Webhook] Processing call for prospect:', parsed.attendeeEmail, parsed.attendeeName)

    // Run AI analysis on the transcript / summary
    const analysis = await analyzeFathomMeeting(parsed)

    console.log('[Fathom Webhook] AI Analysis Result:', {
      callOutcome: analysis.callOutcome,
      leadStatus: analysis.leadStatus,
      lostReason: analysis.lostReason,
      nurturingStatus: analysis.nurturingStatus,
      followUpDate: analysis.followUpDate
    })

    // Update Airtable record
    const airtableRes = await updateAirtableFromFathom({
      attendeeEmail: parsed.attendeeEmail,
      attendeeName: parsed.attendeeName,
      recordingUrl: parsed.recordingUrl,
      analysis
    })

    return NextResponse.json({
      success: true,
      attendee: parsed.attendeeEmail,
      analysis,
      airtable: airtableRes
    })
  } catch (err: any) {
    console.error('[Fathom Webhook Exception]', err)
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * Health check & verification ping for webhook setup (e.g. Fathom, Zapier, Make)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/fathom',
    service: 'BerinAgents Fathom AI Meeting Processor',
    timestamp: new Date().toISOString()
  })
}
