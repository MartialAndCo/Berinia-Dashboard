'use server'

import { checkAdminAuth, isAdminUser, countActiveAdmins } from '@/utils/supabase/server'

import { getServiceSupabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { suspendClientAgent, reactivateClientAgent } from '@/lib/agent-activation'
import { markAirtableSubscriptionEnded } from '@/lib/airtable'

const supabaseAdmin = getServiceSupabase()

async function syncStripeSubscription(clientId: string, newBillingRate?: number, newRetainer?: number, companyName?: string) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey || stripeKey === 'dummy_key') return

  try {
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('company_name, stripe_subscription_id, billing_rate_per_min, monthly_retainer')
      .eq('id', clientId)
      .single()

    if (!client?.stripe_subscription_id) return

    const Stripe = require('stripe').default || require('stripe')
    const stripe = new Stripe(stripeKey)

    const sub = await stripe.subscriptions.retrieve(client.stripe_subscription_id)
    if (!sub || sub.status === 'canceled') return

    const resolvedCompanyName = companyName || client.company_name || 'Client'
    const meteredItem = sub.items.data.find((item: any) => item.price.recurring?.usage_type === 'metered')
    const retainerItem = sub.items.data.find((item: any) => item.price.recurring?.usage_type !== 'metered')

    // 1. Sync metered item (usage rate per minute / 60)
    if (typeof newBillingRate === 'number' && !isNaN(newBillingRate)) {
      if (meteredItem) {
        const currentPerSec = parseFloat(meteredItem.price.unit_amount_decimal || '0')
        const targetPerSec = parseFloat(((newBillingRate * 100) / 60).toFixed(12))

        if (Math.abs(currentPerSec - targetPerSec) > 0.000001) {
          if (newBillingRate > 0) {
            // Check if the current metered item already has usage in this current period
            let hasCurrentUsage = false
            try {
              const summaries = await stripe.subscriptionItems.listUsageRecordSummaries(meteredItem.id, { limit: 1 })
              if (summaries?.data?.[0]?.total_usage > 0) {
                hasCurrentUsage = true
              }
            } catch {
              // fallback: if we cannot check, keep existing item to be safe
              hasCurrentUsage = true
            }

            const productId = typeof meteredItem.price.product === 'string'
              ? meteredItem.price.product
              : meteredItem.price.product.id

            const newPriceUsage = await stripe.prices.create({
              product: productId,
              currency: 'usd',
              unit_amount_decimal: ((newBillingRate * 100) / 60).toFixed(12),
              recurring: { interval: 'month', usage_type: 'metered' }
            })

            if (hasCurrentUsage) {
              // Keep old item with its recorded usage so Stripe bills past calls at the old rate.
              // Add a new subscription item for the new rate. Subsequent calls will be logged to this item.
              await stripe.subscriptionItems.create({
                subscription: client.stripe_subscription_id,
                price: newPriceUsage.id,
                proration_behavior: 'none'
              })
            } else {
              // No usage yet in this period: update price directly on existing item
              await stripe.subscriptionItems.update(meteredItem.id, {
                price: newPriceUsage.id,
                proration_behavior: 'none'
              })
            }
          } else {
            await stripe.subscriptionItems.del(meteredItem.id, { proration_behavior: 'none' })
          }
        }
      } else if (newBillingRate > 0) {
        const productUsage = await stripe.products.create({ name: `Usage Calls (Seconds) - ${resolvedCompanyName}` })
        const priceUsage = await stripe.prices.create({
          product: productUsage.id,
          currency: 'usd',
          unit_amount_decimal: ((newBillingRate * 100) / 60).toFixed(12),
          recurring: { interval: 'month', usage_type: 'metered' }
        })
        await stripe.subscriptionItems.create({
          subscription: client.stripe_subscription_id,
          price: priceUsage.id,
          proration_behavior: 'none'
        })
      }
    }

    // 2. Sync monthly retainer item
    if (typeof newRetainer === 'number' && !isNaN(newRetainer)) {
      if (retainerItem) {
        const currentRetainerCents = retainerItem.price.unit_amount || 0
        const targetRetainerCents = Math.round(newRetainer * 100)

        if (currentRetainerCents !== targetRetainerCents) {
          if (newRetainer > 0) {
            const productId = typeof retainerItem.price.product === 'string'
              ? retainerItem.price.product
              : retainerItem.price.product.id

            const newPriceRetainer = await stripe.prices.create({
              product: productId,
              currency: 'usd',
              unit_amount: targetRetainerCents,
              recurring: { interval: 'month' }
            })

            await stripe.subscriptionItems.update(retainerItem.id, {
              price: newPriceRetainer.id,
              proration_behavior: 'none'
            })
          } else {
            await stripe.subscriptionItems.del(retainerItem.id, { proration_behavior: 'none' })
          }
        }
      } else if (newRetainer > 0) {
        const productRetainer = await stripe.products.create({ name: `Monthly Subscription - ${resolvedCompanyName}` })
        const priceRetainer = await stripe.prices.create({
          product: productRetainer.id,
          unit_amount: Math.round(newRetainer * 100),
          currency: 'usd',
          recurring: { interval: 'month' }
        })
        await stripe.subscriptionItems.create({
          subscription: client.stripe_subscription_id,
          price: priceRetainer.id,
          proration_behavior: 'none'
        })
      }
    }
  } catch (stripeErr) {
    console.error('Failed to sync Stripe subscription prices:', stripeErr)
  }
}

export async function updateClientConfigAction(clientId: string, data: any) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  try {
    const { error } = await supabaseAdmin
      .from('clients')
      .update({
        company_name: data.company_name,
        billing_rate_per_min: data.billing_rate_per_min,
        monthly_retainer: data.monthly_retainer,
      })
      .eq('id', clientId)

    if (error) throw error

    // Sync changes to Stripe subscription if client has one
    await syncStripeSubscription(clientId, data.billing_rate_per_min, data.monthly_retainer, data.company_name)

    revalidatePath(`/admin/client/${clientId}`)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function recalculateClientCallsCostAction(clientId: string, rate: number) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  try {
    if (typeof rate !== 'number' || isNaN(rate) || rate < 0) {
      return { success: false, error: 'Tarif invalide' }
    }

    // 1. Update client's billing rate in clients table
    await supabaseAdmin
      .from('clients')
      .update({ billing_rate_per_min: rate })
      .eq('id', clientId)

    // Sync new rate to Stripe subscription
    await syncStripeSubscription(clientId, rate, undefined)

    // 2. Fetch all calls for this client
    const { data: calls, error: fetchError } = await supabaseAdmin
      .from('calls')
      .select('id, client_id, agent_id, retell_call_id, duration_secs')
      .eq('client_id', clientId)

    if (fetchError) throw fetchError
    if (!calls || calls.length === 0) {
      revalidatePath(`/admin/client/${clientId}`)
      revalidatePath('/admin')
      revalidatePath('/dashboard')
      return { success: true, count: 0 }
    }

    // 3. Batch update calls in chunks of 50
    const chunkSize = 50
    for (let i = 0; i < calls.length; i += chunkSize) {
      const chunk = calls.slice(i, i + chunkSize).map(call => {
        const minutes = call.duration_secs / 60
        const newCost = Math.round(minutes * rate * 100) / 100
        return {
          ...call,
          cost: newCost
        }
      })

      const { error: updateError } = await supabaseAdmin
        .from('calls')
        .upsert(chunk, { onConflict: 'id' })

      if (updateError) throw updateError
    }

    revalidatePath(`/admin/client/${clientId}`)
    revalidatePath('/admin')
    revalidatePath('/dashboard')

    return { success: true, count: calls.length }
  } catch (err: any) {
    console.error('Error recalculating calls cost:', err)
    return { success: false, error: err.message }
  }
}

export async function resetClientPasswordAction(email: string) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.berinagents.com'
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${origin}/reset-password`,
      },
    })

    if (error) throw error

    // Generate custom email here if wanted, or we just return the link and the frontend will toast or trigger the email route.
    // Actually we can just trigger the existing /api/forgot-password route to keep the email template.
    // Instead of doing it here, we'll fetch /api/forgot-password from the client side.
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function forceUpdateClientEmailAction(userId: string, clientId: string, newEmail: string) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  try {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true 
    })
    if (authError) throw authError

    const { error: dbError } = await supabaseAdmin.from('clients').update({ email: newEmail }).eq('id', clientId)
    if (dbError) throw dbError

    revalidatePath(`/admin/client/${clientId}`)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteClientAction(clientId: string) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  try {
    const { data: client, error: fetchError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (fetchError || !client) {
      return { success: false, error: fetchError?.message || 'Client not found' }
    }

    // Safety check: Is this client linked to an admin user?
    if (client.user_id) {
      const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(client.user_id)
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

    // 1. Delete Stripe customer (cascades to subscriptions)
    if (client.stripe_customer_id) {
      const stripeKey = process.env.STRIPE_SECRET_KEY
      if (stripeKey && stripeKey !== 'dummy_key') {
        try {
          const Stripe = require('stripe').default || require('stripe')
          const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any })
          await stripe.customers.del(client.stripe_customer_id)
        } catch (e: any) {
          console.error("Failed to delete Stripe customer:", e)
        }
      }
    }

    // 2. Delete Supabase user from auth.users ONLY if it is not an administrator
    if (client.user_id) {
      const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(client.user_id)
      if (authUserData?.user && isAdminUser(authUserData.user)) {
        console.log(`[deleteClientAction] Preserved admin auth user ${client.user_id} (${client.email})`)
      } else {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(client.user_id)
        if (authError) {
          console.error("Failed to delete auth user:", authError)
        }
      }
    }

    // 3. Mark Airtable subscription ended and status as 'Lost Client'
    if (client.email || client.company_name) {
      await markAirtableSubscriptionEnded({
        email: client.email,
        companyName: client.company_name,
        endDate: new Date().toISOString().slice(0, 10)
      }).catch(e => console.error('[deleteClientAction] Airtable markAirtableSubscriptionEnded error:', e))
    }

    // 4. Delete from clients explicitly
    await supabaseAdmin.from('clients').delete().eq('id', clientId)

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function toggleClientAgentStatusAction(clientId: string, targetStatus: 'Active' | 'Suspended') {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  try {
    const { data: client } = await supabaseAdmin.from('clients').select('company_name, email').eq('id', clientId).single()
    if (client?.email === 'demo@berinagents.com' || client?.company_name?.toLowerCase().includes('demo')) {
      return { success: false, error: 'Demo clients and outbound demo agents cannot be suspended.' }
    }

    if (targetStatus === 'Suspended') {
      await suspendClientAgent(clientId, 'Manual admin suspension')
    } else {
      await reactivateClientAgent(clientId)
    }
    revalidatePath(`/admin/client/${clientId}`)
    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getClientOnboardingDataAction(userId?: string | null) {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }
  if (!userId) return { success: false }

  try {
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId)
    const onboardingData = user?.user?.user_metadata?.onboarding_data || null
    const onboardingCompleted = Boolean(user?.user?.user_metadata?.onboarding_completed)
    const airtableFormId = user?.user?.user_metadata?.airtable_form_id || null

    return {
      success: true,
      onboardingData,
      onboardingCompleted,
      airtableFormId
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
