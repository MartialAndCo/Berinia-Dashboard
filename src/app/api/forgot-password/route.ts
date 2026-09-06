import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { Resend } from 'resend'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const supabaseAdmin = getServiceSupabase()
    const origin = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || 'https://www.berinagents.com'

    // 1. Generate the recovery link via Supabase Admin (does NOT send Supabase's default email)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: `${origin}/reset-password`,
      },
    })

    if (linkError) {
      console.error('Supabase generateLink error:', linkError)
      const isNotFound = linkError.message.toLowerCase().includes('not found')
      const errorMessage = isNotFound
        ? "No account is associated with this email address."
        : linkError.message
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const resetUrl = linkData.properties?.action_link
    if (!resetUrl) {
      return NextResponse.json({ error: 'Unable to generate reset link.' }, { status: 500 })
    }

    // 2. Send custom email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy')
    
    const { getEmailTemplate } = require('@/lib/email-template')

    const contentHtml = `
      <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #9e4733; margin-bottom: 12px;">
        <span style="color: #9e4733; margin-right: 4px;">&#8226;</span> BERINAGENTS
      </div>
      <h1 style="font-family: 'Georgia', serif; font-size: 32px; font-weight: bold; color: #202020; margin: 0 0 24px 0; letter-spacing: -0.5px;">Password Reset</h1>
      <div style="border-bottom: 1px solid #e2dfd8; margin-bottom: 32px;"></div>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">Hello,</p>
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6;">We received a request to reset your password. This link will expire in 24 hours.</p>
      
      <div>
        <a href="${resetUrl}" style="background-color: #1a1918; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 1px; display: inline-block; text-transform: uppercase;">
          <span style="color: #9e4733; margin-right: 8px; font-size: 14px;">&#8226;</span> Reset my password
        </a>
      </div>
      
      <p style="color: #737373; font-size: 13px; margin-top: 32px; line-height: 1.5;">
        If you did not request this, you can safely ignore this email.<br/><br/>
        If the button does not work, copy this link: <br/>
        <a href="${resetUrl}" style="color: #202020; text-decoration: underline; word-break: break-all;">${resetUrl}</a>
      </p>
    `

    const htmlEmail = getEmailTemplate('Password Reset - BerinAgents', contentHtml)

    const { error: resendError } = await resend.emails.send({
      from: 'BerinAgents <security@berinagents.com>',
      to: [normalizedEmail],
      subject: 'Reset your password - BerinAgents',
      html: htmlEmail,
    })

    if (resendError) {
      console.error('Resend error:', resendError)
      return NextResponse.json({ error: "Error sending email via Resend: " + resendError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 })
  }
}
