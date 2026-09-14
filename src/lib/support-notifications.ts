import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey && resendApiKey !== 're_dummy' ? new Resend(resendApiKey) : null
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.berinagents.com'

export async function notifyAdminNewMessage(params: {
  conversationId: string
  companyName: string
  clientEmail: string
  message: string
}) {
  if (!resend) return

  try {
    const adminEmails = ['yannrosemark@gmail.com', 'admin@berinia.com']
    const dashboardUrl = `${SITE_URL}/admin/support?id=${params.conversationId}`

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e6e2d6; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #1a1918; padding: 20px 24px; text-align: left;">
          <h2 style="color: #f6f4f0; margin: 0; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">BerinAgents Support</h2>
        </div>
        <div style="padding: 24px; color: #1a1918;">
          <p style="font-size: 14px; margin-top: 0; color: #73706b;">Nouveau message reçu de :</p>
          <div style="background-color: #f6f4f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
            <strong style="font-size: 15px; color: #1a1918;">${params.companyName}</strong><br/>
            <span style="font-size: 13px; color: #73706b;">${params.clientEmail}</span>
          </div>
          <div style="background-color: #ffffff; border-left: 3px solid #9e4733; padding: 12px 16px; margin-bottom: 24px; font-size: 14px; line-height: 1.5; color: #1a1918; white-space: pre-wrap;">
            ${params.message}
          </div>
          <div style="text-align: center; margin-top: 28px;">
            <a href="${dashboardUrl}" style="background-color: #1a1918; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: 600; border-radius: 8px; display: inline-block;">
              Répondre dans la Console Admin →
            </a>
          </div>
        </div>
      </div>
    `

    await resend.emails.send({
      from: 'BerinAgents Support <support@berinagents.com>',
      to: adminEmails,
      subject: `[Support BerinAgents] Nouveau message de ${params.companyName}`,
      html: htmlContent
    })
  } catch (err) {
    console.error('[Support Notification] Failed to notify admin via email:', err)
  }
}

export async function notifyClientNewReply(params: {
  conversationId: string
  clientEmail: string
  companyName: string
  replyText: string
}) {
  if (!resend || !params.clientEmail) return

  try {
    const portalUrl = `${SITE_URL}/dashboard/support?id=${params.conversationId}`

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e6e2d6; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #1a1918; padding: 20px 24px; text-align: left;">
          <h2 style="color: #f6f4f0; margin: 0; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">BerinAgents Support</h2>
        </div>
        <div style="padding: 24px; color: #1a1918;">
          <p style="font-size: 14px; margin-top: 0;">Bonjour,</p>
          <p style="font-size: 14px; color: #52504c;">Notre équipe technique vient de répondre à votre demande :</p>
          <div style="background-color: #f6f4f0; border-left: 3px solid #1a1918; padding: 14px 16px; margin: 20px 0; font-size: 14px; line-height: 1.5; color: #1a1918; border-radius: 4px; white-space: pre-wrap;">
            ${params.replyText}
          </div>
          <div style="text-align: center; margin-top: 28px;">
            <a href="${portalUrl}" style="background-color: #1a1918; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: 600; border-radius: 8px; display: inline-block;">
              Accéder à votre conversation →
            </a>
          </div>
        </div>
      </div>
    `

    await resend.emails.send({
      from: 'BerinAgents Support <support@berinagents.com>',
      to: [params.clientEmail],
      subject: `[BerinAgents] Nouvelle réponse de notre équipe support`,
      html: htmlContent
    })
  } catch (err) {
    console.error('[Support Notification] Failed to notify client via email:', err)
  }
}
