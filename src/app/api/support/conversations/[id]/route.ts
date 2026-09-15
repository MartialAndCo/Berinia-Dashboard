import { NextRequest, NextResponse } from 'next/server'
import { checkUserAuth, isAdminUser } from '@/utils/supabase/server'
import { getServiceSupabase } from '@/lib/supabase'
import { getSupportConversation, markSupportRead } from '@/lib/support-store'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkUserAuth()
    const isUserAdmin = isAdminUser(user)
    const sbAdmin = getServiceSupabase()
    const { id } = await context.params

    let clientId: string | null = null
    if (!isUserAdmin) {
      const { data: client, error } = await sbAdmin
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (error || !client) {
        return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
      }
      clientId = client.id
    }

    const conversation = await getSupportConversation(id, clientId)
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvée ou accès refusé' }, { status: 404 })
    }

    // Only mark read if there are unread messages for this viewer
    if (isUserAdmin && conversation.unread_admin > 0) {
      await markSupportRead(id, 'admin', clientId)
      conversation.unread_admin = 0
    } else if (!isUserAdmin && conversation.unread_client > 0) {
      await markSupportRead(id, 'client', clientId)
      conversation.unread_client = 0
    }

    return NextResponse.json({ success: true, conversation, isAdmin: isUserAdmin })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
