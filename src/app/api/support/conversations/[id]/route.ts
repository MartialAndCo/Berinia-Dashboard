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

    // Auto-mark read for the current viewer
    await markSupportRead(id, isUserAdmin ? 'admin' : 'client', clientId)

    return NextResponse.json({ success: true, conversation, isAdmin: isUserAdmin })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
