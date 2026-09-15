import { NextRequest, NextResponse } from 'next/server'
import { checkUserAuth, isAdminUser } from '@/utils/supabase/server'
import { getServiceSupabase } from '@/lib/supabase'
import { addSupportMessage, getSupportConversation } from '@/lib/support-store'
import { notifyAdminNewMessage, notifyClientNewReply } from '@/lib/support-notifications'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkUserAuth()
    const isUserAdmin = isAdminUser(user)
    const sbAdmin = getServiceSupabase()
    const { id } = await context.params
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }

    let clientId: string | null = null
    let senderName = 'Support'

    if (!isUserAdmin) {
      const { data: client, error } = await sbAdmin
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (error || !client) {
        return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
      }
      clientId = client.id
      const clientMeta = user.user_metadata || {}
      const clientName = body.senderName?.trim() || clientMeta.full_name?.trim() || clientMeta.name?.trim()
      senderName = clientName || client.company_name || user.email?.split('@')[0] || 'Client'
    } else {
      const explicit = body.senderName?.trim()
      const adminMeta = user.user_metadata || {}
      const metaName = adminMeta.full_name?.trim() || adminMeta.name?.trim() || adminMeta.first_name?.trim()

      if (explicit) {
        senderName = explicit
      } else if (metaName) {
        senderName = metaName
      } else if (user.email?.toLowerCase().includes('yann')) {
        senderName = 'Yann'
      } else if (user.email) {
        const prefix = user.email.split('@')[0]
        senderName = prefix.charAt(0).toUpperCase() + prefix.slice(1)
      } else {
        senderName = 'Yann'
      }
    }

    // Get conversation to read client email/company name for notification
    const existingConv = await getSupportConversation(id, isUserAdmin ? null : clientId)
    if (!existingConv) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 })
    }

    const newMessage = await addSupportMessage({
      conversationId: id,
      sender: isUserAdmin ? 'admin' : 'client',
      senderName,
      content: content.trim(),
      clientId: isUserAdmin ? null : clientId
    })

    // Trigger email alert
    if (isUserAdmin) {
      notifyClientNewReply({
        conversationId: id,
        clientEmail: existingConv.client_email,
        companyName: existingConv.company_name,
        replyText: content.trim(),
        senderName
      }).catch(() => {})
    } else {
      notifyAdminNewMessage({
        conversationId: id,
        companyName: existingConv.company_name,
        clientEmail: existingConv.client_email,
        message: content.trim()
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, message: newMessage })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
