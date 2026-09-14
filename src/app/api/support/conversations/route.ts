import { NextRequest, NextResponse } from 'next/server'
import { checkUserAuth, isAdminUser } from '@/utils/supabase/server'
import { getServiceSupabase } from '@/lib/supabase'
import { listSupportConversations, createSupportConversation } from '@/lib/support-store'
import { notifyAdminNewMessage } from '@/lib/support-notifications'

export async function GET(request: NextRequest) {
  try {
    const user = await checkUserAuth()
    const isUserAdmin = isAdminUser(user)
    const sbAdmin = getServiceSupabase()
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    if (isUserAdmin) {
      const targetClientId = searchParams.get('clientId')
      const conversations = await listSupportConversations(targetClientId, statusFilter)
      return NextResponse.json({ success: true, conversations, isAdmin: true })
    }

    // Client mode: strictly isolated to user's client record
    const { data: client, error } = await sbAdmin
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !client) {
      return NextResponse.json({ success: true, conversations: [], isAdmin: false })
    }

    const conversations = await listSupportConversations(client.id, statusFilter)
    return NextResponse.json({ success: true, conversations, isAdmin: false, clientId: client.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await checkUserAuth()
    const isUserAdmin = isAdminUser(user)
    const sbAdmin = getServiceSupabase()
    const body = await request.json()
    const { subject, message, senderName, targetClientId } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    let clientRecord = null
    if (isUserAdmin && targetClientId) {
      const { data } = await sbAdmin.from('clients').select('*').eq('id', targetClientId).single()
      clientRecord = data
    } else {
      const { data } = await sbAdmin.from('clients').select('*').eq('user_id', user.id).single()
      clientRecord = data
    }

    if (!clientRecord) {
      return NextResponse.json({ error: 'Compte client non trouvé' }, { status: 404 })
    }

    const conversation = await createSupportConversation({
      clientId: clientRecord.id,
      companyName: clientRecord.company_name || 'Client BerinAgents',
      clientEmail: clientRecord.email || user.email || '',
      subject: (subject && subject.trim()) ? subject.trim() : 'Assistance BerinAgents',
      initialMessage: message.trim(),
      senderName: senderName || clientRecord.company_name || 'Client'
    })

    // Send immediate email alert to Admin
    notifyAdminNewMessage({
      conversationId: conversation.id,
      companyName: clientRecord.company_name || 'Client BerinAgents',
      clientEmail: clientRecord.email || user.email || '',
      message: message.trim()
    }).catch(() => {})

    return NextResponse.json({ success: true, conversation })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
