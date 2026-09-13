import { FathomAnalysisResult } from './airtable'

export interface FathomParsedMeeting {
  attendeeEmail: string
  attendeeName?: string | null
  title?: string | null
  recordingUrl?: string | null
  transcriptText: string
  summaryText: string
  actionItems: string[]
}

/**
 * Extracts normalized meeting data from various Fathom webhook payload structures.
 */
export function parseFathomPayload(body: any): FathomParsedMeeting | null {
  if (!body || typeof body !== 'object') return null

  const meeting = body.meeting || body.data || body

  // 1. Extract attendees
  const rawAttendees = meeting.attendees || meeting.participants || body.attendees || []
  let attendeeEmail = ''
  let attendeeName = ''

  // Host emails to filter out
  const hostDomainFilters = ['berinagents.com', 'berinia.com']
  const hostEmails = ['yannrosemark@gmail.com', 'martialandco@gmail.com']

  if (Array.isArray(rawAttendees)) {
    for (const att of rawAttendees) {
      const email = typeof att === 'string' ? att : (att.email || '')
      const name = typeof att === 'object' ? (att.name || att.displayName || '') : ''
      const cleanEmail = email.trim().toLowerCase()

      // Look for the prospect (non-host)
      if (cleanEmail && !hostEmails.includes(cleanEmail) && !hostDomainFilters.some(d => cleanEmail.endsWith(d))) {
        attendeeEmail = cleanEmail
        attendeeName = name
        break
      }
    }
    // Fallback if only 1 attendee or all matched
    if (!attendeeEmail && rawAttendees.length > 0) {
      const first = rawAttendees[0]
      attendeeEmail = typeof first === 'string' ? first : (first.email || '')
      attendeeName = typeof first === 'object' ? (first.name || '') : ''
    }
  } else if (meeting.email || body.email) {
    attendeeEmail = (meeting.email || body.email).trim().toLowerCase()
    attendeeName = meeting.name || body.name || ''
  }

  // 2. Extract Transcript text
  let transcriptText = ''
  const rawTranscript = meeting.transcript || body.transcript
  if (typeof rawTranscript === 'string') {
    transcriptText = rawTranscript.trim()
  } else if (Array.isArray(rawTranscript)) {
    transcriptText = rawTranscript.map((u: any) => {
      const speaker = u.speaker?.name || u.speaker || 'Speaker'
      const text = u.text || u.words || ''
      return `${speaker}: ${text}`
    }).join('\n')
  }

  // 3. Extract Summary and Action items
  let summaryText = ''
  const rawSummary = meeting.default_summary || meeting.summary || body.summary
  if (typeof rawSummary === 'string') {
    summaryText = rawSummary.trim()
  } else if (rawSummary && typeof rawSummary === 'object') {
    summaryText = rawSummary.markdown || rawSummary.overview || rawSummary.text || JSON.stringify(rawSummary)
  }

  const actionItems: string[] = []
  const rawActions = meeting.action_items || body.action_items || rawSummary?.action_items
  if (Array.isArray(rawActions)) {
    rawActions.forEach((item: any) => {
      const text = typeof item === 'string' ? item : (item.text || item.description || '')
      if (text) actionItems.push(text.trim())
    })
  }

  // 4. Recording URL
  const recordingUrl = meeting.url || meeting.share_url || meeting.recording_url || body.recording_url || null

  return {
    attendeeEmail,
    attendeeName: attendeeName || null,
    title: meeting.title || body.title || null,
    recordingUrl,
    transcriptText,
    summaryText,
    actionItems
  }
}

/**
 * Intelligent Sales Classifier for Fathom calls.
 * Uses OpenAI if OPENAI_API_KEY is available, or Gemini if GEMINI_API_KEY is available,
 * or falls back to intelligent NLP rule analysis on Fathom's built-in summary.
 */
export async function analyzeFathomMeeting(data: FathomParsedMeeting): Promise<FathomAnalysisResult> {
  const combinedContext = [
    `Meeting Title: ${data.title || 'Sales Call'}`,
    `Prospect: ${data.attendeeName || 'Unknown'} (${data.attendeeEmail})`,
    data.summaryText ? `Fathom AI Summary:\n${data.summaryText}` : '',
    data.actionItems.length > 0 ? `Action Items:\n- ${data.actionItems.join('\n- ')}` : '',
    data.transcriptText ? `Full Transcript:\n${data.transcriptText.slice(0, 10000)}` : ''
  ].filter(Boolean).join('\n\n')

  // 1. Try OpenAI if configured
  if (process.env.OPENAI_API_KEY) {
    try {
      const aiResult = await classifyWithOpenAI(combinedContext)
      if (aiResult) return aiResult
    } catch (err) {
      console.warn('[Fathom Analyzer] OpenAI classification failed, falling back to NLP:', err)
    }
  }

  // 2. Try Google Gemini if configured
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (geminiKey) {
    try {
      const geminiResult = await classifyWithGemini(combinedContext, geminiKey)
      if (geminiResult) return geminiResult
    } catch (err) {
      console.warn('[Fathom Analyzer] Gemini classification failed, falling back to NLP:', err)
    }
  }

  // 3. Fallback: Intelligent Heuristic NLP Analyzer
  return classifyWithHeuristicNLP(data)
}

async function classifyWithOpenAI(context: string): Promise<FathomAnalysisResult | null> {
  const systemPrompt = `You are an elite Sales Operations AI analyzing a B2B sales call for BerinAgents (an AI Voice Receptionist agency).
Your task is to analyze the conversation and categorize the outcome into the CRM's strict field taxonomy.

Strict Output Schema (JSON only):
{
  "callOutcome": "Closed Won (One-Call)" | "Proposal / Contract Sent" | "Second Call Scheduled" | "Under Consideration (Hot)" | "Nurturing (Cold)" | "Closed Lost" | "Disqualified",
  "leadStatus": "Closed Won" | "Meeting Scheduled" | "Demo Completed" | "Closed Lost" | "Not Interested",
  "lostReason": "Price / Retainer Too High" | "Refused Contract Commitment" | "AI / Voice Skepticism" | "Bad Timing / Postponed" | "Not Sole Decision Maker" | "Lack of Call Volume" | "Existing Provider / Agency" | "Ghost / Unresponsive" | "Other" | null,
  "nurturingStatus": "Follow-up Day 2 (Urgent)" | "Follow-up Day 7 (Case Study)" | "Follow-up 30 Days" | "Email / SMS Sequence" | "Do Not Contact (Blacklist)" | null,
  "followUpDate": "YYYY-MM-DD" | null,
  "keySummary": "2-3 concise sentences summarizing the client's needs, their objection or buying decision, and the agreed next step."
}

Rules:
- If the prospect agreed to sign, gave payment info, or officially accepted: callOutcome = "Closed Won (One-Call)", leadStatus = "Closed Won", lostReason = null.
- If the sales rep is sending a proposal/contract/invoice or agreed to send an offer: callOutcome = "Proposal / Contract Sent", leadStatus = "Meeting Scheduled", followUpDate = 2 business days from today.
- If a 2nd demo or meeting was agreed upon: callOutcome = "Second Call Scheduled", leadStatus = "Meeting Scheduled".
- If the prospect is evaluating with partner or undecided: callOutcome = "Under Consideration (Hot)", leadStatus = "Demo Completed".
- If the prospect explicitly rejected or declined: callOutcome = "Closed Lost", leadStatus = "Closed Lost", lostReason MUST be chosen from the allowed list.
- If not interested or low call volume (< 50 calls/mo): callOutcome = "Disqualified", leadStatus = "Not Interested".`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this call recording data:\n\n${context}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[OpenAI API Error]', res.status, err)
    return null
  }

  const json = await res.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) return null

  const parsed = JSON.parse(content)
  return validateAndSanitizeAnalysis(parsed)
}

async function classifyWithGemini(context: string, apiKey: string): Promise<FathomAnalysisResult | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
  const prompt = `Analyze this B2B sales call transcript and return ONLY a JSON object with this exact schema:
{
  "callOutcome": "Closed Won (One-Call)" | "Proposal / Contract Sent" | "Second Call Scheduled" | "Under Consideration (Hot)" | "Nurturing (Cold)" | "Closed Lost" | "Disqualified",
  "leadStatus": "Closed Won" | "Meeting Scheduled" | "Demo Completed" | "Closed Lost" | "Not Interested",
  "lostReason": "Price / Retainer Too High" | "Refused Contract Commitment" | "AI / Voice Skepticism" | "Bad Timing / Postponed" | "Not Sole Decision Maker" | "Lack of Call Volume" | "Existing Provider / Agency" | "Ghost / Unresponsive" | "Other" | null,
  "nurturingStatus": "Follow-up Day 2 (Urgent)" | "Follow-up Day 7 (Case Study)" | "Follow-up 30 Days" | "Email / SMS Sequence" | "Do Not Contact (Blacklist)" | null,
  "followUpDate": "YYYY-MM-DD" | null,
  "keySummary": "Summary of conversation, objections, and next step"
}

Conversation:
${context}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  })

  if (!res.ok) return null
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return null

  const parsed = JSON.parse(text)
  return validateAndSanitizeAnalysis(parsed)
}

/**
 * Intelligent Fallback NLP rules that inspect Fathom's built-in AI summary and transcript.
 */
function classifyWithHeuristicNLP(data: FathomParsedMeeting): FathomAnalysisResult {
  const text = `${data.summaryText} ${data.actionItems.join(' ')} ${data.transcriptText}`.toLowerCase()

  const today = new Date()
  const formatDate = (daysAhead: number) => {
    const d = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000)
    return d.toISOString().split('T')[0]
  }

  // 1. Closed Won indicators
  const closedWonTerms = ['closed won', 'deal closed', 'signed agreement', 'payment completed', 'card entered', 'onboarding scheduled', 'signed the contract', 'ready to sign right now']
  if (closedWonTerms.some(t => text.includes(t))) {
    return {
      callOutcome: 'Closed Won (One-Call)',
      leadStatus: 'Closed Won',
      lostReason: null,
      nurturingStatus: null,
      followUpDate: null,
      keySummary: data.summaryText || 'Prospect officially approved and closed during the call.'
    }
  }

  // 2. Proposal / Contract Sent indicators
  const proposalTerms = ['send proposal', 'send the contract', 'send agreement', 'email the contract', 'send invoice', 'proposal sent', 'envoyer le devis', 'envoyer le contrat']
  if (proposalTerms.some(t => text.includes(t))) {
    return {
      callOutcome: 'Proposal / Contract Sent',
      leadStatus: 'Meeting Scheduled',
      lostReason: null,
      nurturingStatus: 'Follow-up Day 2 (Urgent)',
      followUpDate: formatDate(2),
      keySummary: data.summaryText || 'Proposal/contract requested by prospect. Scheduled for 48h follow-up.'
    }
  }

  // 3. Second call scheduled indicators
  const secondCallTerms = ['second call', 'follow-up call', 'next meeting scheduled', 'scheduled another call', 'meet next week', 'prochain rendez-vous']
  if (secondCallTerms.some(t => text.includes(t))) {
    return {
      callOutcome: 'Second Call Scheduled',
      leadStatus: 'Meeting Scheduled',
      lostReason: null,
      nurturingStatus: 'Follow-up Day 7 (Case Study)',
      followUpDate: formatDate(5),
      keySummary: data.summaryText || 'Follow-up strategy session agreed with stakeholder.'
    }
  }

  // 4. Closed Lost & Disqualified indicators
  const lostReasonTerms: Record<string, string[]> = {
    'Price / Retainer Too High': ['too expensive', 'trop cher', 'out of budget', 'budget too high', 'cannot afford', 'cost is high'],
    'AI / Voice Skepticism': ['ai latency', 'sounds like a robot', 'skeptical about ai', 'patients won\'t like ai', 'not natural enough'],
    'Bad Timing / Postponed': ['not the right time', 'call us in 6 months', 'postpone', 'next quarter', 'too busy right now'],
    'Not Sole Decision Maker': ['need partner approval', 'board of directors', 'must check with ceo', 'not my decision alone'],
    'Lack of Call Volume': ['not enough calls', 'only 5 calls a week', 'low volume', 'pas assez d\'appels']
  }

  for (const [reason, terms] of Object.entries(lostReasonTerms)) {
    if (terms.some(t => text.includes(t))) {
      const isDisqualified = reason === 'Lack of Call Volume'
      return {
        callOutcome: isDisqualified ? 'Disqualified' : 'Closed Lost',
        leadStatus: isDisqualified ? 'Not Interested' : 'Closed Lost',
        lostReason: reason as any,
        nurturingStatus: reason === 'Bad Timing / Postponed' ? 'Follow-up 30 Days' : 'Email / SMS Sequence',
        followUpDate: formatDate(30),
        keySummary: data.summaryText || `Closed lost due to: ${reason}.`
      }
    }
  }

  // 5. Default for completed meetings: Under Consideration (Hot)
  return {
    callOutcome: 'Under Consideration (Hot)',
    leadStatus: 'Demo Completed',
    lostReason: null,
    nurturingStatus: 'Follow-up Day 2 (Urgent)',
    followUpDate: formatDate(3),
    keySummary: data.summaryText || 'Call completed successfully with positive engagement. Following up shortly.'
  }
}

function validateAndSanitizeAnalysis(obj: any): FathomAnalysisResult {
  const allowedOutcomes = [
    'Closed Won (One-Call)',
    'Proposal / Contract Sent',
    'Second Call Scheduled',
    'Under Consideration (Hot)',
    'Nurturing (Cold)',
    'Closed Lost',
    'Disqualified'
  ]
  const allowedLeadStatuses = ['Closed Won', 'Meeting Scheduled', 'Demo Completed', 'Closed Lost', 'Not Interested']
  const allowedLostReasons = [
    'Price / Retainer Too High',
    'Refused Contract Commitment',
    'AI / Voice Skepticism',
    'Bad Timing / Postponed',
    'Not Sole Decision Maker',
    'Lack of Call Volume',
    'Existing Provider / Agency',
    'Ghost / Unresponsive',
    'Other'
  ]
  const allowedNurture = [
    'Follow-up Day 2 (Urgent)',
    'Follow-up Day 7 (Case Study)',
    'Follow-up 30 Days',
    'Email / SMS Sequence',
    'Do Not Contact (Blacklist)'
  ]

  const callOutcome = allowedOutcomes.includes(obj.callOutcome) ? obj.callOutcome : 'Under Consideration (Hot)'
  const leadStatus = allowedLeadStatuses.includes(obj.leadStatus) ? obj.leadStatus : 'Demo Completed'
  const lostReason = allowedLostReasons.includes(obj.lostReason) ? obj.lostReason : null
  const nurturingStatus = allowedNurture.includes(obj.nurturingStatus) ? obj.nurturingStatus : null

  return {
    callOutcome,
    leadStatus,
    lostReason,
    nurturingStatus,
    followUpDate: obj.followUpDate || null,
    keySummary: obj.keySummary || obj.summary || 'Fathom call completed.'
  }
}
