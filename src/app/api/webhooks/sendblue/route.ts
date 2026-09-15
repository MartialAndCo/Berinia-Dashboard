import { NextResponse } from 'next/server'
import { confirmAirtableMeeting } from '@/lib/airtable'
import { dispatchReminder } from '@/lib/sendblue'

/**
 * Sendblue Inbound Webhook Handler
 * Triggered when a prospect replies to an iMessage / SMS.
 * If they reply "YES", it marks their appointment as 'Confirmed' in Airtable
 * and sends back an immediate, ultra-short confirmation acknowledgment.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    console.log('[Sendblue Webhook] Received payload:', JSON.stringify(body))

    const data = body.data || body
    const isOutbound = Boolean(data.is_outbound)
    if (isOutbound) {
      return NextResponse.json({ success: true, ignored: 'outbound' })
    }

    const fromNumber = data.from_number || data.number || data.from || ''
    const content = (data.content || data.body || data.text || '').trim()
    const lowerContent = content.toLowerCase()

    if (!fromNumber) {
      return NextResponse.json({ error: 'Missing phone number' }, { status: 400 })
    }

    // Check if reply is an affirmative confirmation ("YES", "OK", "YEP", etc.)
    const isConfirmation =
      lowerContent === 'yes' ||
      lowerContent === 'ok' ||
      lowerContent === 'yep' ||
      lowerContent === 'yup' ||
      lowerContent.includes('yes') ||
      lowerContent.includes('confirm')

    if (isConfirmation) {
      console.log(`[Sendblue Webhook] Positive confirmation detected from ${fromNumber}: "${content}"`)

      // 1. Update Airtable Lead record to Confirmed
      const airtableResult = await confirmAirtableMeeting({
        phone: fromNumber,
        replyText: content,
        source: 'Sendblue Webhook'
      })

      // 2. Send back immediate short confirmation acknowledgement
      const replyResult = await dispatchReminder({
        phone: fromNumber,
        step: 'yes_ack'
      }).catch((err) => {
        console.warn('[Sendblue Webhook] Failed to send auto-reply:', err)
        return { success: false, error: err?.message }
      })

      return NextResponse.json({
        success: true,
        confirmed: true,
        airtable: airtableResult,
        reply: replyResult
      })
    }

    return NextResponse.json({
      success: true,
      received: true,
      message: 'Inbound message received but not an affirmative confirmation'
    })
  } catch (err: any) {
    console.error('[Sendblue Webhook Exception]', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
