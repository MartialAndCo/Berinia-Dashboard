import { getServiceSupabase } from '@/lib/supabase'
import Retell from 'retell-sdk'
import { Resend } from 'resend'
import { getEmailTemplate } from '@/lib/email-template'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy')

/**
 * Suspends a client and temporarily unbinds their Retell agents from inbound phone numbers.
 * The agent configuration, prompts, voices, and LLM are NEVER deleted or altered.
 */
export async function suspendClientAgent(clientId: string, reason: string = 'Payment overdue', hostedInvoiceUrl?: string) {
  const supabaseAdmin = getServiceSupabase()

  const { data: client, error: clientErr } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (clientErr || !client) {
    console.error(`[Agent Suspension] Client not found: ${clientId}`, clientErr)
    return { success: false, error: 'Client not found' }
  }

  // 1b. Strictly exclude Demo clients & Demo Outbound from suspension
  const isDemoClient =
    client.email === 'demo@berinagents.com' ||
    client.company_name?.toLowerCase().includes('demo')

  if (isDemoClient) {
    console.log(`[Agent Suspension] Skipped: ${client.company_name} is a demo client and cannot be suspended.`)
    return { success: false, error: 'Demo agents and outbound demo cannot be suspended.' }
  }

  await supabaseAdmin
    .from('clients')
    .update({ status: 'Past_Due' })
    .eq('id', clientId)

  console.log(`[Agent Suspension] Set client ${client.company_name} (${clientId}) status to Past_Due (reason: ${reason})`)

  const { data: agents } = await supabaseAdmin
    .from('agents')
    .select('*')
    .eq('client_id', clientId)

  const retellApiKey = process.env.RETELL_API_KEY

  if (retellApiKey && agents && agents.length > 0) {
    try {
      const retell = new Retell({ apiKey: retellApiKey })
      const phoneRes = await retell.phoneNumber.list()
      const phoneNumbers = phoneRes.items || (Array.isArray(phoneRes) ? phoneRes : [])

      const updateTasks: Promise<any>[] = []

      for (const agent of agents) {
        if (!agent.retell_agent_id) continue

        // Strictly exclude demo agents (especially Demo Outbound)
        const isDemoAgent =
          agent.agent_name?.toLowerCase().includes('demo') ||
          agent.agent_name?.toLowerCase().includes('outreach') ||
          agent.retell_agent_id?.startsWith('demo_') ||
          agent.retell_agent_id === 'agent_f2bd0d3b5f76f135b6c65ec503'

        if (isDemoAgent) {
          console.log(`[Agent Suspension] Skipped demo agent: ${agent.agent_name} (${agent.retell_agent_id})`)
          continue
        }

        for (const phone of phoneNumbers) {
          const inbound = phone.inbound_agents || []
          const hasAgent = inbound.some((a: any) => a.agent_id === agent.retell_agent_id)

          if (hasAgent) {
            console.log(`[Agent Suspension] Unbinding phone ${phone.phone_number} from agent ${agent.retell_agent_id} (preserving outbound_agents)`)
            updateTasks.push(
              retell.phoneNumber.update(phone.phone_number, {
                inbound_agents: [],
                outbound_agents: phone.outbound_agents || [], // PRESERVE Demo Outbound agent intact!
                nickname: `[SUSPENDED:${agent.retell_agent_id}] ${phone.nickname || phone.phone_number_pretty || ''}`.trim().slice(0, 100)
              }).catch(e => console.error(`[Agent Suspension] Failed to unbind phone ${phone.phone_number}:`, e))
            )
          }
        }
      }

      if (updateTasks.length > 0) {
        await Promise.all(updateTasks)
      }
    } catch (retellErr) {
      console.error('[Agent Suspension] Error updating Retell phone numbers:', retellErr)
    }
  }

  if (client.email) {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.berinagents.com'
      const payUrl = hostedInvoiceUrl || `${siteUrl}/dashboard/billing`
      const contentHtml = `
        <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #9e4733; margin-bottom: 12px;">
          <span style="color: #9e4733; margin-right: 4px;">&#8226;</span> BERINAGENTS BILLING NOTICE
        </div>
        <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #1a1918; margin: 0 0 20px 0;">Service Temporarily Suspended</h1>
        <div style="border-bottom: 1px solid #e2dfd8; margin-bottom: 24px;"></div>

        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #403e3b;">
          Hello, we were unable to process the renewal payment for your <strong>${client.company_name}</strong> voice IN agent subscription.
        </p>

        <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #403e3b;">
          To avoid disruption to your operations, please update your payment method or pay the outstanding invoice. Your voice agent and phone routing will be <strong>automatically and immediately restored</strong> as soon as payment is confirmed.
        </p>

        <div>
          <a href="${payUrl}" style="background-color: #9e4733; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; text-transform: uppercase; border-radius: 2px;">
            <span style="margin-right: 8px; font-size: 14px;">&#8226;</span> REGULARIZE PAYMENT &amp; RESTORE AGENT
          </a>
        </div>
      `

      const emailHtml = getEmailTemplate('Action Required: Voice Agent Suspended', contentHtml, 'URGENT')
      await resend.emails.send({
        from: 'BerinAgents Billing <billing@berinagents.com>',
        to: [client.email],
        subject: 'Action Required: Your Voice AI Agent is Temporarily Suspended',
        html: emailHtml
      })
    } catch (emailErr) {
      console.error('[Agent Suspension] Error sending suspension email:', emailErr)
    }
  }

  return { success: true }
}

/**
 * Reactivates a client and rebinds their Retell agents to inbound phone numbers.
 */
export async function reactivateClientAgent(clientId: string) {
  const supabaseAdmin = getServiceSupabase()

  const { data: client, error: clientErr } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (clientErr || !client) {
    console.error(`[Agent Reactivation] Client not found: ${clientId}`, clientErr)
    return { success: false, error: 'Client not found' }
  }

  await supabaseAdmin
    .from('clients')
    .update({ status: 'Active' })
    .eq('id', clientId)

  console.log(`[Agent Reactivation] Set client ${client.company_name} (${clientId}) status to Active`)

  const { data: agents } = await supabaseAdmin
    .from('agents')
    .select('*')
    .eq('client_id', clientId)


  const retellApiKey = process.env.RETELL_API_KEY

  if (retellApiKey && agents && agents.length > 0) {
    try {
      const retell = new Retell({ apiKey: retellApiKey })
      const phoneRes = await retell.phoneNumber.list()
      const phoneNumbers = phoneRes.items || (Array.isArray(phoneRes) ? phoneRes : [])

      const updateTasks: Promise<any>[] = []

      for (const agent of agents) {
        if (!agent.retell_agent_id) continue

        // Strictly exclude demo agents (especially Demo Outbound)
        const isDemoAgent =
          agent.agent_name?.toLowerCase().includes('demo') ||
          agent.agent_name?.toLowerCase().includes('outreach') ||
          agent.retell_agent_id?.startsWith('demo_') ||
          agent.retell_agent_id === 'agent_f2bd0d3b5f76f135b6c65ec503'

        if (isDemoAgent) continue

        for (const phone of phoneNumbers) {
          const isSuspendedForAgent = phone.nickname && phone.nickname.includes(`[SUSPENDED:${agent.retell_agent_id}]`)
          const hasInboundAgent = (phone.inbound_agents || []).some((a: any) => a.agent_id === agent.retell_agent_id)

          if (isSuspendedForAgent || (!hasInboundAgent && phone.nickname && phone.nickname.includes(agent.retell_agent_id))) {
            console.log(`[Agent Reactivation] Restoring phone ${phone.phone_number} to agent ${agent.retell_agent_id} (preserving outbound_agents)`)
            const cleanedNickname = (phone.nickname || '').replace(`[SUSPENDED:${agent.retell_agent_id}]`, '').trim()
            updateTasks.push(
              retell.phoneNumber.update(phone.phone_number, {
                inbound_agents: [
                  {
                    agent_id: agent.retell_agent_id,
                    agent_version: 'latest_published',
                    weight: 1
                  }
                ],
                outbound_agents: phone.outbound_agents || [], // PRESERVE Demo Outbound agent intact!
                nickname: cleanedNickname || phone.phone_number_pretty || phone.phone_number
              }).catch(e => console.error(`[Agent Reactivation] Failed to rebind phone ${phone.phone_number}:`, e))
            )
          }
        }
      }

      if (updateTasks.length > 0) {
        await Promise.all(updateTasks)
      }
    } catch (retellErr) {
      console.error('[Agent Reactivation] Error restoring Retell phone numbers:', retellErr)
    }
  }


  if (client.email) {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.berinagents.com'
      const contentHtml = `
        <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #166534; margin-bottom: 12px;">
          <span style="color: #166534; margin-right: 4px;">&#8226;</span> BERINAGENTS SERVICE RESTORED
        </div>
        <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #1a1918; margin: 0 0 20px 0;">Voice AI Agent Active</h1>
        <div style="border-bottom: 1px solid #e2dfd8; margin-bottom: 24px;"></div>

        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #403e3b;">
          Great news! Your payment has been received and confirmed for <strong>${client.company_name}</strong>.
        </p>

        <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #403e3b;">
          Your voice AI agent is now <strong>fully restored and live</strong> on your phone numbers. All calls will be answered as configured.
        </p>

        <div>
          <a href="${siteUrl}/dashboard" style="background-color: #1a1918; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; text-transform: uppercase; border-radius: 2px;">
            <span style="margin-right: 8px; font-size: 14px;">&#8226;</span> OPEN DASHBOARD
          </a>
        </div>
      `

      const emailHtml = getEmailTemplate('Voice Agent Service Restored', contentHtml, 'CONFIRMATION')
      await resend.emails.send({
        from: 'BerinAgents Billing <billing@berinagents.com>',
        to: [client.email],
        subject: 'Service Restored: Your Voice AI Agent is Active',
        html: emailHtml
      })
    } catch (emailErr) {
      console.error('[Agent Reactivation] Error sending reactivation email:', emailErr)
    }
  }

  return { success: true }
}
