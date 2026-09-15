'use server'

import { checkAdminAuth, isAdminUser, countActiveAdmins } from '@/utils/supabase/server'
import Retell from 'retell-sdk'
import { createClient } from '@supabase/supabase-js'
import { getAirtableBookedLeads, markAirtableSubscriptionEnded } from '@/lib/airtable'
import { suspendClientAgent } from '@/lib/agent-activation'
import { revalidatePath } from 'next/cache'

export async function archiveClientAction(clientId: string) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !supabaseServiceKey) return { success: false, error: 'Config manquante' }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (!client) return { success: false, error: 'Client not found' }

    // 1. Suspend the client's Retell agents so no new calls are accepted
    await suspendClientAgent(clientId, 'Client account archived')

    // 2. Cancel Stripe subscription if active (stops recurring billing)
    if (client.stripe_subscription_id) {
      const stripeKey = process.env.STRIPE_SECRET_KEY
      if (stripeKey && stripeKey !== 'dummy_key') {
        try {
          const Stripe = require('stripe').default || require('stripe')
          const stripe = new Stripe(stripeKey)
          await stripe.subscriptions.cancel(client.stripe_subscription_id)
        } catch (e) {
          console.error('[archiveClientAction] Error canceling Stripe subscription:', e)
        }
      }
    }

    // 3. Mark Airtable subscription ended and status as 'Lost Client'
    if (client.email || client.company_name) {
      await markAirtableSubscriptionEnded({
        email: client.email,
        companyName: client.company_name,
        endDate: new Date().toISOString().slice(0, 10)
      }).catch(e => console.error('[archiveClientAction] Airtable markAirtableSubscriptionEnded error:', e))
    }

    // 4. Update status in Supabase clients table to 'Archived' (keeping past calls, client row, and past invoices in Stripe)
    const { error } = await supabaseAdmin
      .from('clients')
      .update({ status: 'Archived' })
      .eq('id', clientId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin')
    revalidatePath('/admin/billing')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteClientAction(clientId: string) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !supabaseServiceKey) return { success: false, error: 'Config manquante' }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  
  // 1. Get the client before deleting
  const { data: clientData } = await supabaseAdmin.from('clients').select('*').eq('id', clientId).single()
  
  // 2. Safety check: Protect administrator accounts
  if (clientData?.user_id) {
    const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(clientData.user_id)
    if (authUserData?.user && isAdminUser(authUserData.user)) {
      const adminCount = await countActiveAdmins(supabaseAdmin)
      if (adminCount <= 1) {
        return { 
          success: false, 
          error: "Action bloquée : ce compte est associé au dernier administrateur actif. Il est impossible de supprimer le dernier compte administrateur de la plateforme." 
        }
      }
    }
  }

  // 3. Delete calls and agents from Supabase
  await supabaseAdmin.from('calls').delete().eq('client_id', clientId)
  await supabaseAdmin.from('agents').delete().eq('client_id', clientId)

  // 4. Delete Stripe customer (and their subscriptions)
  if (clientData?.stripe_customer_id) {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (stripeKey && stripeKey !== 'dummy_key') {
      try {
        const Stripe = require('stripe').default || require('stripe')
        const stripe = new Stripe(stripeKey)
        await stripe.customers.del(clientData.stripe_customer_id)
      } catch (e: any) {
        console.error("[deleteClientAction] Failed to delete Stripe customer:", e)
      }
    }
  }

  // 5. Mark Airtable subscription ended
  if (clientData?.email || clientData?.company_name) {
    await markAirtableSubscriptionEnded({
      email: clientData.email,
      companyName: clientData.company_name,
      endDate: new Date().toISOString().slice(0, 10)
    }).catch(e => console.error('[deleteClientAction] Airtable markAirtableSubscriptionEnded error:', e))
  }

  // 6. Delete the client row from clients
  const { error } = await supabaseAdmin.from('clients').delete().eq('id', clientId)
  if (error) return { success: false, error: error.message }
  
  // 7. Delete the auth user ONLY if it is not an administrator
  if (clientData?.user_id) {
    const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(clientData.user_id)
    if (authUserData?.user && isAdminUser(authUserData.user)) {
      console.log(`[deleteClientAction] Preserved admin auth user ${clientData.user_id} (${clientData.email})`)
    } else {
      await supabaseAdmin.auth.admin.deleteUser(clientData.user_id)
    }
  }
  
  revalidatePath('/admin')
  revalidatePath('/admin/billing')
  return { success: true }
}

export async function addAgentAction(clientId: string, agentName: string, retellAgentId: string, forwardWebhookUrl?: string, backfillHistory: boolean = false) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !supabaseServiceKey) return { success: false, error: 'Config manquante' }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  
  // 1. Get client billing rate
  const { data: clientData } = await supabaseAdmin.from('clients').select('billing_rate_per_min').eq('id', clientId).single()
  const billingRate = clientData?.billing_rate_per_min || 0

  // 2. Insert the agent
  const { data: agentData, error } = await supabaseAdmin.from('agents').insert({
    client_id: clientId,
    agent_name: agentName,
    retell_agent_id: retellAgentId,
    forward_webhook_url: forwardWebhookUrl || null
  }).select().single()
  
  if (error || !agentData) return { success: false, error: error?.message || 'Erreur inconnue' }

  // 3. Update the agent's webhook_url on Retell to point to our endpoint
  try {
    const retellApiKey = process.env.RETELL_API_KEY
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.berinagents.com'
    const webhookUrl = `${siteUrl}/api/webhooks/retell`

    if (retellApiKey) {
      const updateRes = await fetch(`https://api.retellai.com/update-agent/${retellAgentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${retellApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ webhook_url: webhookUrl })
      })

      if (!updateRes.ok) {
        const errorBody = await updateRes.text()
        console.error(`Failed to set Retell webhook_url for agent ${retellAgentId}:`, updateRes.status, errorBody)
      }
    }
  } catch (webhookErr) {
    console.error('Failed to update Retell agent webhook_url:', webhookErr)
    // Don't fail the agent assignment if webhook update fails
  }

  // 4. Backfill old calls from Retell (only if retro-pick toggle is explicitly checked)
  if (backfillHistory) {
    try {
      const retellApiKey = process.env.RETELL_API_KEY
      if (retellApiKey) {
        const res = await fetch('https://api.retellai.com/v3/list-calls', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${retellApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filter_criteria: { agent_id: [retellAgentId] },
            limit: 500 // Fetch up to 500 past calls
          })
        })
        
        if (res.ok) {
          const data = await res.json()
          const calls = data.items || []
          
          const callsToInsert = calls.map((c: any) => {
            if (!c.start_timestamp || !c.end_timestamp) return null
            const duration = Math.floor((c.end_timestamp - c.start_timestamp) / 1000)
            if (duration <= 0) return null
            
            const minutes = duration / 60
            const cost = Math.round(minutes * billingRate * 100) / 100 // au centime près
            const retellCost = c.call_cost?.combined_cost ? c.call_cost.combined_cost / 100 : 0 // cents -> euros

            return {
              client_id: clientId,
              agent_id: agentData.id,
              retell_call_id: c.call_id,
              duration_secs: duration,
              cost: cost,
              retell_cost: retellCost,
              transcript: c.transcript || '',
              recording_url: c.recording_url || null,
              call_summary: c.call_analysis?.call_summary || null,
              user_sentiment: c.call_analysis?.user_sentiment || null,
              from_number: c.from_number || null,
              created_at: new Date(c.start_timestamp).toISOString()
            }
          }).filter(Boolean)

          if (callsToInsert.length > 0) {
            // Fetch transcripts individually (v3/list-calls omits them)
            for (const c of callsToInsert) {
              try {
                const callRes = await fetch(`https://api.retellai.com/v2/get-call/${c.retell_call_id}`, {
                  headers: { 'Authorization': `Bearer ${retellApiKey}` }
                })
                if (callRes.ok) {
                  const callDetail = await callRes.json()
                  if (callDetail.transcript) c.transcript = callDetail.transcript
                }
              } catch { /* skip if fetch fails */ }
            }
            await supabaseAdmin.from('calls').upsert(callsToInsert, { onConflict: 'retell_call_id' })
          }
        }
      }
    } catch (err) {
      console.error("Failed to backfill calls:", err)
      // We don't fail the agent creation if backfill fails
    }
  }

  return { success: true }
}

export async function deleteAgentAction(agentId: string) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !supabaseServiceKey) return { success: false, error: 'Config manquante' }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  const { error } = await supabaseAdmin.from('agents').delete().eq('id', agentId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateAgentWebhookAction(agentId: string, webhookUrl: string) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !supabaseServiceKey) return { success: false, error: 'Config manquante' }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  const { error } = await supabaseAdmin.from('agents').update({ forward_webhook_url: webhookUrl || null }).eq('id', agentId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function syncRetellAgentWebhookAction(retellAgentId: string) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) return { success: false, error: 'Retell API key not configured' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.berinagents.com'
  const webhookUrl = `${siteUrl}/api/webhooks/retell`

  try {
    const res = await fetch(`https://api.retellai.com/update-agent/${retellAgentId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ webhook_url: webhookUrl })
    })

    if (!res.ok) {
      const errorBody = await res.text()
      return { success: false, error: `Retell API error (${res.status}): ${errorBody}` }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getRetellAgentsAction(): Promise<{ success: boolean; agents: any[]; error?: string }> {
  try { await checkAdminAuth(); } catch { return { success: false, agents: [], error: 'Unauthorized' }; }

  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) return { success: false, agents: [], error: 'Retell API key not configured' }
  
  try {
    const retell = new Retell({ apiKey: retellApiKey })
    const res = await retell.agent.list()
    const rawAgents = res.items || (Array.isArray(res) ? res : [])
    
    // Deduplicate by agent_id, keeping the latest version
    const agentMap = new Map()
    for (const a of rawAgents as any[]) {
      const modTime = a.last_modification_timestamp || a.user_modified_timestamp || 0
      const existing = agentMap.get(a.agent_id)
      const existingModTime = existing ? (existing.last_modification_timestamp || existing.user_modified_timestamp || 0) : -1
      if (!existing || modTime > existingModTime) {
        agentMap.set(a.agent_id, a)
      }
    }
    const agents = Array.from(agentMap.values())

    return { success: true, agents }
  } catch (e: any) {
    return { success: false, agents: [], error: e.message }
  }
}

export async function getClientsListAction() {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !supabaseServiceKey) return { success: false, error: 'Config manquante' }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, company_name, email, status, billing_rate_per_min, monthly_retainer')
    .order('company_name', { ascending: true })

  if (error) return { success: false, error: error.message }
  return { success: true, clients: data || [] }
}

export async function getClientDashboardAction(clientId: string) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !supabaseServiceKey) return { success: false, error: 'Config manquante' }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  // Parallelize client and calls query for fast load
  const [clientRes, callsRes] = await Promise.all([
    supabaseAdmin.from('clients').select('*').eq('id', clientId).single(),
    supabaseAdmin.from('calls').select(`*, agents(agent_name)`).eq('client_id', clientId).order('created_at', { ascending: false }).limit(100)
  ])

  if (clientRes.error || !clientRes.data) {
    return { success: false, error: clientRes.error?.message || 'Client not found' }
  }

  if (callsRes.error) {
    return { success: false, error: callsRes.error.message }
  }

  return { success: true, client: clientRes.data, calls: callsRes.data || [] }
}

export async function getAirtableBookedLeadsAction() {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized', leads: [] }; }

  try {
    const res = await getAirtableBookedLeads()
    if (!res.success) {
      return { success: false, error: res.error, leads: [] }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: existingClients } = await supabaseAdmin
      .from('clients')
      .select('email, company_name')

    const existingEmails = new Set((existingClients || []).map(c => (c.email || '').toLowerCase()).filter(Boolean))
    const existingCompanies = new Set((existingClients || []).map(c => (c.company_name || '').toLowerCase()).filter(Boolean))

    const leads = (res.leads || []).map(lead => {
      const isRegistered = 
        (lead.email && existingEmails.has(lead.email.toLowerCase())) ||
        (lead.companyName && existingCompanies.has(lead.companyName.toLowerCase()))
      return {
        ...lead,
        isRegistered: Boolean(isRegistered)
      }
    })

    return { success: true, leads }
  } catch (err: any) {
    return { success: false, error: err.message, leads: [] }
  }
}
