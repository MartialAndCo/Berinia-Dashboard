import { NextResponse, after } from 'next/server'
import { parseFathomPayload, analyzeFathomMeeting, verifyFathomWebhook } from '@/lib/fathom-analyzer'
import { updateAirtableFromFathom } from '@/lib/airtable'

/**
 * Fathom AI Meeting Webhook Handler
 * 
 * Triggered automatically when a sales / strategy call is completed and transcribed by Fathom.video.
 * 1. Verifies the cryptographic webhook signature (if secret is configured).
 * 2. Extracts the meeting transcript, summary, and prospect email.
 * 3. Uses AI (OpenAI / Gemini / Fathom NLP) to categorize:
 *    - Show-up Status -> 'Attended'
 *    - Call Outcome ('Closed Won', 'Proposal Sent', 'Second Call Scheduled', etc.)
 *    - Lost Reason (if objection/refusal detected)
 *    - Nurturing Status & Follow-up Date
 *    - Condensed Call Notes with Fathom recording link
 * 4. Updates Airtable CRM record automatically.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    if (!rawBody) {
      return NextResponse.json({ error: 'Missing request body' }, { status: 400 })
    }

    // Cryptographic verification if secret is provided
    const webhookSecret = process.env.FATHOM_WEBHOOK_SECRET
    if (webhookSecret && req.headers.get('webhook-signature')) {
      const isValid = verifyFathomWebhook(webhookSecret, req.headers, rawBody)
      if (!isValid) {
        console.warn('[Fathom Webhook] Invalid webhook signature from Fathom')
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
      }
    }

    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
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

    // Run AI analysis & Airtable sync in background using Next.js after() to prevent webhook timeouts
    after(async () => {
      try {
        const analysis = await analyzeFathomMeeting(parsed)

        console.log('[Fathom Webhook] AI Analysis Result:', {
          callOutcome: analysis.callOutcome,
          leadStatus: analysis.leadStatus,
          lostReason: analysis.lostReason,
          nurturingStatus: analysis.nurturingStatus,
          followUpDate: analysis.followUpDate
        })

        await updateAirtableFromFathom({
          attendeeEmail: parsed.attendeeEmail,
          attendeeName: parsed.attendeeName,
          recordingUrl: parsed.recordingUrl,
          analysis
        })

        console.log('[Fathom Webhook] Completed background analysis and Airtable update for:', parsed.attendeeEmail)
      } catch (bgErr) {
        console.error('[Fathom Webhook Background Error]', bgErr)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Fathom webhook received and queued for processing',
      attendee: parsed.attendeeEmail
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
