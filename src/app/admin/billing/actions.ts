'use server'

import { checkAdminAuth } from '@/utils/supabase/server'
import { getServiceSupabase } from '@/lib/supabase'

const Stripe = require('stripe').default || require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function getBillingStatsAction() {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  try {
    const supabaseAdmin = getServiceSupabase()
    const { data: existingClients } = await supabaseAdmin
      .from('clients')
      .select('id, email, company_name, stripe_customer_id, status')

    // Filter out demo accounts from commercial billing ledger
    const eligibleClients = (existingClients || []).filter(c => {
      const email = (c.email || '').toLowerCase().trim()
      const name = (c.company_name || '').toLowerCase().trim()
      const status = (c.status || '').toLowerCase().trim()
      return status !== 'demo' && email !== 'demo@berinagents.com' && email !== 'account@test.com' && !name.includes('demo')
    })

    const allowedCustomerIds = new Set(eligibleClients.map(c => c.stripe_customer_id).filter(Boolean))
    const allowedEmails = new Set(eligibleClients.map(c => (c.email || '').toLowerCase().trim()).filter(Boolean))

    // Fetch last 100 invoices from Stripe
    const invoices = await stripe.invoices.list({ limit: 100 })
    
    let totalCollected = 0
    let totalSent = 0
    let totalUnpaid = 0

    const currentMonthStart = new Date()
    currentMonthStart.setDate(1)
    currentMonthStart.setHours(0, 0, 0, 0)
    const currentMonthUnix = Math.floor(currentMonthStart.getTime() / 1000)

    const formattedInvoices = (invoices.data || [])
      .filter((inv: any) => {
        // 1. NEVER display or count void invoices
        if (inv.status === 'void') return false

        // 2. Only show invoices belonging to existing clients (Active or Archived). Exclude deleted accounts and demo accounts.
        const custId = inv.customer
        const email = (inv.customer_email || '').toLowerCase().trim()
        const isEligible = (custId && allowedCustomerIds.has(custId)) || (email && allowedEmails.has(email))
        return isEligible
      })
      .map((inv: any) => {
      if (inv.created >= currentMonthUnix) {
        if (inv.status === 'paid') {
          totalCollected += inv.amount_paid
        } else if (inv.status === 'open') {
          totalUnpaid += inv.amount_remaining
        }
        if (inv.status !== 'draft' && inv.status !== 'void') {
           totalSent += inv.amount_due
        }
      }

      return {
        id: inv.id,
        number: inv.number,
        customer_email: inv.customer_email,
        customer_name: inv.customer_name,
        amount_due: inv.amount_due / 100,
        amount_paid: inv.amount_paid / 100,
        amount_remaining: inv.amount_remaining / 100,
        status: inv.status, 
        created: inv.created * 1000,
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf: inv.invoice_pdf
      }
    })

    return { 
      success: true, 
      invoices: formattedInvoices,
      stats: {
        totalCollected: totalCollected / 100,
        totalSent: totalSent / 100,
        totalUnpaid: totalUnpaid / 100
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
