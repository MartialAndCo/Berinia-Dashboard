/**
 * Sendblue iMessage / SMS Client
 * Internal integration for Cal.com booking confirmation and automated reminders.
 * All messages are short, human, and direct.
 */

export type ReminderStep = 'direct' | 'yes_ack' | 'h24' | 'h6' | 'h1' | 'm5' | 'm1'

export interface SendBlueMessageOptions {
  number: string
  content: string
  sendStyle?: 'celebration' | 'shooting_star' | 'invisible' | 'gentle' | 'loud' | 'slam' | null
  mediaUrl?: string | null
}

export interface DispatchReminderParams {
  phone: string
  fullName?: string | null
  startTime?: string | null
  meetingLink?: string | null
  step: ReminderStep
}

/**
 * Sends a message via the Sendblue REST API.
 * Uses iMessage (blue bubble) by default with automatic SMS fallback for non-iOS devices.
 */
export async function sendBlueMessage({
  number,
  content,
  sendStyle,
  mediaUrl,
}: SendBlueMessageOptions): Promise<{ success: boolean; data?: any; error?: string }> {
  const apiKey = process.env.SENDBLUE_API_KEY
  const apiSecret = process.env.SENDBLUE_API_SECRET

  if (!apiKey || !apiSecret) {
    console.warn('[Sendblue] SENDBLUE_API_KEY or SENDBLUE_API_SECRET missing in environment.')
    return { success: false, error: 'Sendblue credentials not configured' }
  }

  // Format clean E.164 phone number
  const cleanNumber = number.startsWith('+') ? number : `+${number.replace(/\D/g, '')}`

  try {
    const payload: Record<string, any> = {
      number: cleanNumber,
      content: content.trim(),
    }

    if (sendStyle) payload.send_style = sendStyle
    if (mediaUrl) payload.media_url = mediaUrl

    const res = await fetch('https://api.sendblue.co/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sb-api-key-id': apiKey,
        'sb-api-secret-key': apiSecret,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[Sendblue Send Error]', res.status, errText)
      return { success: false, error: `Sendblue error (${res.status}): ${errText}` }
    }

    const json = await res.json().catch(() => ({}))
    console.log(`[Sendblue] Message sent successfully to ${cleanNumber}: "${content.slice(0, 40)}..."`)
    return { success: true, data: json }
  } catch (err: any) {
    console.error('[Sendblue Exception]', err)
    return { success: false, error: err?.message }
  }
}

/**
 * Format a human-readable meeting date/time string from ISO
 */
export function formatMeetingTime(isoString?: string | null): string {
  if (!isoString) return 'your scheduled time'
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString

    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    })
  } catch {
    return isoString
  }
}

/**
 * Builds the ultra-short message copy for each reminder step.
 * 1-2 lines maximum, human, clear, and high-converting.
 */
export function buildReminderCopy({
  firstName,
  timeStr,
  meetingLink,
  step,
}: {
  firstName: string
  timeStr: string
  meetingLink?: string | null
  step: ReminderStep
}): string {
  const link = meetingLink || 'your calendar link'

  switch (step) {
    case 'direct':
      return `Hey ${firstName}, your Strategy Call is booked for ${timeStr}. Reply YES to confirm your spot on desktop.`

    case 'yes_ack':
      return `Locked in! See you on desktop at ${timeStr}.`

    case 'h24':
      return `Hey ${firstName}, quick reminder our call is tomorrow at ${timeStr}. Please make sure you join from a computer.`

    case 'h6':
      return `Hey ${firstName}, our call is in 6 hours (${timeStr}). If you can't make it, please let me know here.`

    case 'h1':
      return `Hey ${firstName}, we're on in 1 hour (${timeStr}). Here's your link: ${link}`

    case 'm5':
      return `Hey ${firstName}, hopping on in 5 mins! Link: ${link}`

    case 'm1':
      return `I'm in the room! Join here: ${link}`

    default:
      return `Hey ${firstName}, reminder for our upcoming call at ${timeStr}. Link: ${link}`
  }
}

/**
 * High-level helper to dispatch a reminder step to a phone number.
 */
export async function dispatchReminder(
  params: DispatchReminderParams
): Promise<{ success: boolean; error?: string }> {
  if (!params.phone) {
    return { success: false, error: 'No phone number provided' }
  }

  const firstName = (params.fullName || 'there').trim().split(' ')[0]
  const timeStr = formatMeetingTime(params.startTime)

  const content = buildReminderCopy({
    firstName,
    timeStr,
    meetingLink: params.meetingLink,
    step: params.step,
  })

  return sendBlueMessage({
    number: params.phone,
    content,
    sendStyle: params.step === 'yes_ack' ? 'celebration' : null,
  })
}
