import 'server-only'
import { getServiceSupabase } from '@/lib/supabase'

export type SupportStatus = 'pending' | 'in_progress' | 'resolved'

export interface SupportMessage {
  id: string
  conversation_id: string
  sender: 'client' | 'admin'
  sender_name: string
  content: string
  created_at: string
}

export interface SupportConversation {
  id: string
  client_id: string
  company_name: string
  client_email: string
  subject: string
  status: SupportStatus
  created_at: string
  updated_at: string
  last_message_preview: string
  last_sender: 'client' | 'admin'
  unread_admin: number
  unread_client: number
  messages?: SupportMessage[]
}

export async function listSupportConversations(
  clientId?: string | null,
  statusFilter?: string | null
): Promise<SupportConversation[]> {
  const sb = getServiceSupabase()

  let query = sb
    .from('support_conversations')
    .select('*')
    .order('updated_at', { ascending: false })

  if (clientId) {
    query = query.eq('client_id', clientId)
  }
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as SupportConversation[]
}

export async function getSupportConversation(
  conversationId: string,
  clientId?: string | null
): Promise<SupportConversation | null> {
  const sb = getServiceSupabase()

  let query = sb
    .from('support_conversations')
    .select('*')
    .eq('id', conversationId)

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data: convData, error: convError } = await query.single()
  if (convError || !convData) return null

  const { data: messagesData } = await sb
    .from('support_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  return {
    ...(convData as SupportConversation),
    messages: (messagesData as SupportMessage[]) || []
  }
}

export async function createSupportConversation(params: {
  clientId: string
  companyName: string
  clientEmail: string
  subject: string
  initialMessage: string
  senderName: string
}): Promise<SupportConversation> {
  const sb = getServiceSupabase()
  const now = new Date().toISOString()
  const convId = crypto.randomUUID()
  const msgId = crypto.randomUUID()

  const initialMsg: SupportMessage = {
    id: msgId,
    conversation_id: convId,
    sender: 'client',
    sender_name: params.senderName || params.companyName || 'Client',
    content: params.initialMessage.trim(),
    created_at: now
  }

  const convRecord: SupportConversation = {
    id: convId,
    client_id: params.clientId,
    company_name: params.companyName,
    client_email: params.clientEmail,
    subject: params.subject.trim() || 'Demande de support',
    status: 'pending',
    created_at: now,
    updated_at: now,
    last_message_preview: params.initialMessage.trim().slice(0, 100),
    last_sender: 'client',
    unread_admin: 1,
    unread_client: 0,
    messages: [initialMsg]
  }

  await sb.from('support_conversations').insert({
    id: convId,
    client_id: params.clientId,
    company_name: params.companyName,
    client_email: params.clientEmail,
    subject: convRecord.subject,
    status: 'pending',
    created_at: now,
    updated_at: now,
    last_message_preview: convRecord.last_message_preview,
    last_sender: 'client',
    unread_admin: 1,
    unread_client: 0
  })

  await sb.from('support_messages').insert({
    id: msgId,
    conversation_id: convId,
    sender: 'client',
    sender_name: initialMsg.sender_name,
    content: initialMsg.content,
    created_at: now
  })

  return convRecord
}

export async function addSupportMessage(params: {
  conversationId: string
  sender: 'client' | 'admin'
  senderName: string
  content: string
  clientId?: string | null
  existingConv?: SupportConversation | null
}): Promise<SupportMessage> {
  const sb = getServiceSupabase()
  const now = new Date().toISOString()
  const msgId = crypto.randomUUID()

  let conv = params.existingConv
  if (!conv) {
    const { data, error } = await sb
      .from('support_conversations')
      .select('id, client_id, unread_admin, unread_client')
      .eq('id', params.conversationId)
      .single()

    if (error || !data || (params.clientId && data.client_id !== params.clientId)) {
      throw new Error('Conversation non trouvée ou accès refusé')
    }
    conv = data as unknown as SupportConversation
  }

  const newMsg: SupportMessage = {
    id: msgId,
    conversation_id: params.conversationId,
    sender: params.sender,
    sender_name: params.senderName,
    content: params.content.trim(),
    created_at: now
  }

  const newStatus: SupportStatus = params.sender === 'client' ? 'pending' : 'in_progress'
  const newUnreadAdmin = params.sender === 'client' ? (conv.unread_admin || 0) + 1 : 0
  const newUnreadClient = params.sender === 'admin' ? (conv.unread_client || 0) + 1 : 0

  await sb.from('support_messages').insert({
    id: msgId,
    conversation_id: params.conversationId,
    sender: params.sender,
    sender_name: params.senderName,
    content: newMsg.content,
    created_at: now
  })

  await sb.from('support_conversations').update({
    status: newStatus,
    updated_at: now,
    last_message_preview: newMsg.content.slice(0, 100),
    last_sender: params.sender,
    unread_admin: newUnreadAdmin,
    unread_client: newUnreadClient
  }).eq('id', params.conversationId)

  return newMsg
}

export async function updateSupportStatus(
  conversationId: string,
  status: SupportStatus,
  clientId?: string | null
): Promise<boolean> {
  const sb = getServiceSupabase()
  const now = new Date().toISOString()

  // Verify conversation exists and access is allowed
  let query = sb
    .from('support_conversations')
    .select('id')
    .eq('id', conversationId)

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error: checkErr } = await query.single()
  if (checkErr || !data) return false

  const { error } = await sb
    .from('support_conversations')
    .update({ status, updated_at: now })
    .eq('id', conversationId)
  return !error
}

export async function markSupportRead(
  conversationId: string,
  reader: 'client' | 'admin',
  clientId?: string | null
): Promise<boolean> {
  const sb = getServiceSupabase()

  const updateField = reader === 'admin' ? { unread_admin: 0 } : { unread_client: 0 }

  let query = sb
    .from('support_conversations')
    .update(updateField)
    .eq('id', conversationId)

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { error } = await query
  return !error
}
