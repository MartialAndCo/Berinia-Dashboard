import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy')

export async function POST(req: Request) {
  try {
    const { email, company_name, billing_rate, monthly_retainer } = await req.json()

    if (!email || !company_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = getServiceSupabase()

    // 1. Generate an invite link for the user
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
    })

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    // 2. Create the client record in the database
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({
        user_id: inviteData.user.id,
        company_name,
        billing_rate_per_min: billing_rate || 0,
        monthly_retainer: monthly_retainer || 0,
      })
      .select()
      .single()

    if (clientError) {
      // Rollback user if client creation fails
      await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id)
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }

    // 3. Send the custom invite email via Resend
    const inviteUrl = inviteData.properties.action_link // The URL the user clicks to set password
    
    // Customize this HTML email to fit the Zen/Minimalist brand
    const htmlEmail = `
      <div style="font-family: sans-serif; max-w-md mx-auto p-6 bg-[#fafafa] text-[#333]">
        <h1 style="color: #444; font-weight: 300;">Bienvenue chez Voice AI</h1>
        <p>Bonjour ${company_name},</p>
        <p>Votre espace client a été créé avec succès. Vous pouvez y accéder pour suivre vos appels, vos coûts et paramétrer vos informations de paiement.</p>
        <br/>
        <a href="${inviteUrl}" style="background-color: #555; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Configurer mon mot de passe</a>
        <br/><br/>
        <p style="color: #777; font-size: 12px;">Si le bouton ne fonctionne pas, copiez ce lien : ${inviteUrl}</p>
      </div>
    `

    const { error: resendError } = await resend.emails.send({
      from: 'Voice AI <onboarding@resend.dev>', // resend.dev is the default test domain
      to: [email],
      subject: 'Accès à votre tableau de bord Voice AI',
      html: htmlEmail,
    })

    if (resendError) {
      console.error('Resend error:', resendError)
      // We don't rollback because the user is created, we can just return a warning
      return NextResponse.json({ success: true, warning: 'User created but email failed to send', inviteUrl })
    }

    return NextResponse.json({ success: true, clientId: clientData.id })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
