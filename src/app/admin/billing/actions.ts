'use server'

import { checkAdminAuth } from '@/utils/supabase/server'

const Stripe = require('stripe').default || require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function getBillingStatsAction() {
  try { await checkAdminAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  try {
    // Fetch last 100 invoices
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
        const email = (inv.customer_email || '').toLowerCase()
        const name = (inv.customer_name || '').toLowerCase()
        return email !== 'demo@berinagents.com' && !name.includes('demo')
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
