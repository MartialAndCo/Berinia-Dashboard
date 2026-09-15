import { NextResponse } from 'next/server'
import Retell from 'retell-sdk'
import { getDemoSettings, logDemoLead, formatToE164, resolveOutboundPhoneNumber } from '@/lib/demo-settings'
import { sendLeadToAirtable } from '@/lib/airtable'
import { Resend } from 'resend'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { businessName, fullName, phone, email } = body

    if (!businessName || !fullName || !phone || !email) {
      return NextResponse.json(
        { error: 'All fields (businessName, fullName, phone, email) are required.' },
        { status: 400 }
      )
    }

    const e164Phone = formatToE164(phone)
    const firstName = fullName.trim().split(/\s+/)[0] || fullName.trim()

    // 1. Fetch current demo settings
    const settings = await getDemoSettings()
    const retellApiKey = process.env.RETELL_API_KEY

    let callTriggered = false
    let callId: string | undefined = undefined
    let callError: string | undefined = undefined

    // 2. Trigger outbound phone call if active and configured
    if (settings.enabled && settings.agent_id && retellApiKey) {
      try {
        const fromNumber = (settings.from_number ? formatToE164(settings.from_number) : null) || await resolveOutboundPhoneNumber(settings.agent_id)
        
        if (!fromNumber) {
          throw new Error('No active phone number found on Retell account.')
        }

        const retell = new Retell({ apiKey: retellApiKey })

        const callResponse = await retell.call.createPhoneCall({
          from_number: formatToE164(fromNumber),
          to_number: e164Phone,
          override_agent_id: settings.agent_id,
          retell_llm_dynamic_variables: {
            customer_name: fullName.trim(),
            first_name: firstName,
            company_name: businessName.trim(),
            email: email.trim().toLowerCase(),
            phone: e164Phone,
            calendar_url: settings.calendar_url || '',
            owner_name: settings.owner_name || 'Yann'
          },
          metadata: {
            source: 'berinagents_landing_demo',
            business_name: businessName.trim(),
            contact_name: fullName.trim(),
            email: email.trim().toLowerCase()
          }
        })

        callTriggered = true
        callId = callResponse.call_id
      } catch (err: any) {
        console.error('Failed to trigger Retell outbound demo call:', err)
        callError = err?.message || 'Call trigger failed'
      }
    } else {
      if (!settings.enabled) {
        callError = 'Instant callback currently toggled off'
      } else if (!settings.agent_id) {
        callError = 'No demo agent selected in admin settings'
      }
    }

    // 3. Concurrently handle Airtable + local logging and Admin email alert
    const airtableAndLogTask = (async () => {
      let airtableRecordId: string | undefined
      try {
        const airtableRes = await sendLeadToAirtable({
          businessName: businessName.trim(),
          fullName: fullName.trim(),
          phone: e164Phone,
          email: email.trim().toLowerCase(),
          callId,
          status: callTriggered ? 'called' : (settings.enabled ? 'call_failed' : 'disabled'),
          error: callError
        })
        if (airtableRes?.recordId) {
          airtableRecordId = airtableRes.recordId
        }
      } catch (airtableErr) {
        console.error('Failed to populate Airtable:', airtableErr)
      }

      try {
        await logDemoLead({
          businessName: businessName.trim(),
          fullName: fullName.trim(),
          phone: e164Phone,
          email: email.trim().toLowerCase(),
          callId,
          status: callTriggered ? 'called' : (settings.enabled ? 'call_failed' : 'disabled'),
          error: callError,
          airtableRecordId
        })
      } catch (logErr) {
        console.error('Failed to log demo lead:', logErr)
      }
    })()

    const adminEmailTask = (async () => {
      const resendApiKey = process.env.RESEND_API_KEY
      if (resendApiKey && resendApiKey !== 're_dummy') {
        try {
          const resend = new Resend(resendApiKey)
          await resend.emails.send({
            from: 'Berin AI <contact@berinagents.com>',
            to: 'admin@berinia.com',
            subject: `🔥 New Live Demo Request: ${fullName} (${businessName})`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border: 1px solid #e6e2d6; border-radius: 6px;">
                <h2 style="color: #1a1918; margin-top: 0;">New Inbound Demo Request</h2>
                <p style="color: #66635e; font-size: 14px;">A prospect just submitted the live demo form on berinagents.com.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                  <tr><td style="padding: 8px 0; color: #8c8880; width: 140px;">Business Name:</td><td style="font-weight: 600; color: #1a1918;">${businessName}</td></tr>
                  <tr><td style="padding: 8px 0; color: #8c8880;">Contact Name:</td><td style="font-weight: 600; color: #1a1918;">${fullName}</td></tr>
                  <tr><td style="padding: 8px 0; color: #8c8880;">Phone Number:</td><td style="font-weight: 600; color: #1a1918;"><a href="tel:${e164Phone}">${e164Phone}</a></td></tr>
                  <tr><td style="padding: 8px 0; color: #8c8880;">Email:</td><td style="font-weight: 600; color: #1a1918;"><a href="mailto:${email}">${email}</a></td></tr>
                  <tr><td style="padding: 8px 0; color: #8c8880;">AI Call Status:</td><td style="font-weight: 600; color: ${callTriggered ? '#16a34a' : '#d97706'};">${callTriggered ? 'Triggered Instantly (Call ID: ' + callId + ')' : (callError || 'Pending follow up')}</td></tr>
                </table>

                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f0ece4; font-size: 12px; color: #8c8880;">
                  Berin AI Outbound Demo Dispatcher &middot; berinagents.com
                </div>
              </div>
            `
          })
        } catch (emailErr) {
          console.error('Failed to send admin notification email:', emailErr)
        }
      }
    })()

    await Promise.all([airtableAndLogTask, adminEmailTask])

    return NextResponse.json({
      success: true,
      callTriggered,
      callId,
      phone: e164Phone,
      message: callTriggered
        ? 'Outbound call successfully initiated.'
        : 'Demo request recorded.'
    })
  } catch (err: any) {
    console.error('Error handling /api/request-demo:', err)
    return NextResponse.json(
      { error: err?.message || 'Internal server error processing demo request.' },
      { status: 500 }
    )
  }
}
