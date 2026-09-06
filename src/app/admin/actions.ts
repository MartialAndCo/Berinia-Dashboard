'use server'

import { checkAdminAuth } from '@/utils/supabase/server'

import { createClient } from '@supabase/supabase-js'

export async function deleteClientAction(clientId: string) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !supabaseServiceKey) return { success: false, error: 'Config manquante' }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  
  // 1. Get the user_id before deleting the client row
  const { data: clientData } = await supabaseAdmin.from('clients').select('user_id').eq('id', clientId).single()
  
  // 2. Delete the client row (cascades to agents + calls)
  const { error } = await supabaseAdmin.from('clients').delete().eq('id', clientId)
  if (error) return { success: false, error: error.message }
  
  // 3. Delete the auth user so the email can be re-used
  if (clientData?.user_id) {
    await supabaseAdmin.auth.admin.deleteUser(clientData.user_id)
  }
  
  return { success: true }
}

export async function addAgentAction(clientId: string, agentName: string, retellAgentId: string, forwardWebhookUrl?: string) {
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

  // 4. Backfill old calls from Retell
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
  if (!retellApiKey) return { success: false, error: 'Clé Retell non configurée' }

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
      return { success: false, error: `Erreur Retell (${res.status}): ${errorBody}` }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getRetellAgentsAction() {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) return { success: false, error: 'Clé Retell non configurée' }
  
  try {
    const res = await fetch('https://api.retellai.com/list-agents', {
      headers: {
        'Authorization': `Bearer ${retellApiKey}`
      }
    })
    if (!res.ok) {
      return { success: false, error: 'Erreur API Retell' }
    }
    const data = await res.json()
    let agents = Array.isArray(data) ? data : (data.agents || data)
    
    // Deduplicate by agent_id, keeping the latest version
    const agentMap = new Map()
    for (const a of agents) {
      if (!agentMap.has(a.agent_id) || a.last_modification_timestamp > agentMap.get(a.agent_id).last_modification_timestamp) {
        agentMap.set(a.agent_id, a)
      }
    }
    agents = Array.from(agentMap.values())

    return { success: true, agents }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
