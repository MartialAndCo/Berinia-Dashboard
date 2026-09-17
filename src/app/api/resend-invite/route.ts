import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { checkAdminAuth } from '@/utils/supabase/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    try {
      await checkAdminAuth()
    } catch {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 })
    }

    const ip = getClientIp(req)
    const limitResult = rateLimit({ key: `resend-inv:${ip}`, limit: 10, windowMs: 15 * 60 * 1000 })
    if (!limitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key'
    
    if (supabaseUrl === 'https://dummy.supabase.co') {
      return NextResponse.json({ success: true, warning: 'Build step dummy' })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const origin = req.headers.get('origin') || 'https://www.berinagents.com'

    // We generate a recovery link for existing users so they can set their password
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${origin}/update-password`
      }
    })

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy')
    
    const htmlEmail = `
      <div style="font-family: sans-serif; max-w-md; margin: auto; padding: 20px;">
        <h2 style="color: #333;">Reminder: Your Voice AI Access</h2>
        <p>Hello,</p>
        <p>Here is a new link to access your client portal and configure your password.</p>
        <div style="margin: 30px 0;">
          <a href="${linkData.properties?.action_link}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Set my password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
      </div>
    `

    const { error: resendError } = await resend.emails.send({
      from: 'Voice AI <onboarding@berinagents.com>',
      to: [email],
      subject: 'Reminder: Access your Voice AI Dashboard',
      html: htmlEmail,
    })

    if (resendError) {
      return NextResponse.json({ success: true, warning: 'Link generated but Resend error: ' + resendError.message, link: linkData.properties?.action_link })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
