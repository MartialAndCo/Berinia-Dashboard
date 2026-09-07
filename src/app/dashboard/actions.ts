'use server'

import { checkUserAuth } from '@/utils/supabase/server'
import { markAirtableSubscriptionActive } from '@/lib/airtable'

const Stripe = require('stripe').default || require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function getSubscriptionStatusAction(subscriptionId: string | null) {
  try { await checkUserAuth(); } catch { return { success: false, error: 'Unauthorized' }; }

  if (!subscriptionId) {
    return { needsPaymentMethod: false, payUrl: null, cardInfo: null }
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: [
        'latest_invoice', 
        'default_payment_method', 
        'customer', 
        'customer.invoice_settings.default_payment_method'
      ]
    })

    const status = subscription.status
    const latestInvoice = subscription.latest_invoice

    let needsPaymentMethod = false
    let payUrl = null

    if (status === 'incomplete' || status === 'past_due' || status === 'unpaid') {
      if (latestInvoice && typeof latestInvoice !== 'string' && latestInvoice.hosted_invoice_url) {
        needsPaymentMethod = true
        payUrl = latestInvoice.hosted_invoice_url
      }
    }

    let cardInfo = null
    let pm = subscription.default_payment_method
    if (!pm && subscription.customer?.invoice_settings?.default_payment_method) {
      pm = subscription.customer.invoice_settings.default_payment_method
    }
    
    // If STILL no default, check if they simply have a payment method attached but not set as default
    if (!pm && typeof subscription.customer !== 'string' && subscription.customer?.id) {
      const pms = await stripe.paymentMethods.list({
        customer: subscription.customer.id,
        limit: 1,
      })
      if (pms.data.length > 0) {
        pm = pms.data[0]
        
        // Auto-fix: Make it the default so future invoices charge automatically!
        try {
          await stripe.customers.update(subscription.customer.id, {
            invoice_settings: { default_payment_method: pm.id }
          })
        } catch (e) {
          console.error("Could not auto-set default PM", e)
        }
      }
    }

    if (pm && typeof pm !== 'string') {
      if (pm.card) {
        cardInfo = { brand: pm.card.brand, last4: pm.card.last4 }
      } else if (pm.link) {
        cardInfo = { brand: 'Link', last4: pm.link.email || 'Account' }
      } else if (pm.sepa_debit) {
        cardInfo = { brand: 'SEPA', last4: pm.sepa_debit.last4 }
      } else {
        cardInfo = { brand: pm.type, last4: '***' }
      }
    }

    if (pm && !needsPaymentMethod) {
      try {
        const customer = subscription.customer
        const customerEmail = typeof customer !== 'string' ? customer?.email : null
        const customerName = typeof customer !== 'string' ? customer?.name : null
        if (customerEmail) {
          markAirtableSubscriptionActive({
            email: customerEmail,
            companyName: customerName
          }).catch(() => {})
        }
      } catch {}
    }

    return { needsPaymentMethod, payUrl, cardInfo }
  } catch (err: any) {
    console.error('Error fetching subscription status:', err)
    return { needsPaymentMethod: false, payUrl: null, cardInfo: null }
  }
}
