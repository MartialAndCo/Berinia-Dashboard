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

const STORAGE_BUCKET = 'support-store'

let hasDbTableCache: boolean | null = null

async function checkDbTableExists(): Promise<boolean> {
  if (hasDbTableCache !== null) return hasDbTableCache
  const sb = getServiceSupabase()
  const { error } = await sb.from('support_conversations').select('id').limit(1)
  if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.code === '42P01')) {
    hasDbTableCache = false
  } else {
    hasDbTableCache = true
  }
  return hasDbTableCache
}

async function ensureStorageBucket() {
  const storage = getServiceSupabase().storage
  const { data } = await storage.getBucket(STORAGE_BUCKET)
  if (data) return
  await storage.createBucket(STORAGE_BUCKET, {
    public: false,
    fileSizeLimit: 1048576,
    allowedMimeTypes: ['application/json'],
  })
}

async function readStorageConv(id: string): Promise<SupportConversation | null> {
  try {
    const sb = getServiceSupabase()
    const { data, error } = await sb.storage.from(STORAGE_BUCKET).download(`conversations/${id}.json`)
    if (error || !data) return null
    const text = await data.text()
    return JSON.parse(text) as SupportConversation
  } catch {
    return null
  }
}

async function writeStorageConv(conv: SupportConversation): Promise<void> {
  await ensureStorageBucket()
  const sb = getServiceSupabase()
  await sb.storage.from(STORAGE_BUCKET).upload(
    `conversations/${conv.id}.json`,
    JSON.stringify(conv, null, 2),
    { contentType: 'application/json', upsert: true, cacheControl: '0' }
  )
}

async function listStorageConvs(): Promise<SupportConversation[]> {
  await ensureStorageBucket()
  const sb = getServiceSupabase()
  const { data, error } = await sb.storage.from(STORAGE_BUCKET).list('conversations', {
    limit: 100,
    sortBy: { column: 'name', order: 'desc' }
  })
  if (error || !data) return []

  const list = await Promise.all(
    data
      .filter((f) => f.name.endsWith('.json'))
      .map((f) => readStorageConv(f.name.replace('.json', '')))
  )
  return list.filter((c): c is SupportConversation => c !== null)
}

export async function listSupportConversations(
  clientId?: string | null,
  statusFilter?: string | null
): Promise<SupportConversation[]> {
  const useDb = await checkDbTableExists()
  const sb = getServiceSupabase()

  if (useDb) {
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
    if (!error && data) {
      return data as SupportConversation[]
    }
  }

  let items = await listStorageConvs()
  if (clientId) {
    items = items.filter((c) => c.client_id === clientId)
  }
  if (statusFilter && statusFilter !== 'all') {
    items = items.filter((c) => c.status === statusFilter)
  }
  return items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export async function getSupportConversation(
  conversationId: string,
  clientId?: string | null
): Promise<SupportConversation | null> {
  const useDb = await checkDbTableExists()
  const sb = getServiceSupabase()

  if (useDb) {
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

  const conv = await readStorageConv(conversationId)
  if (!conv) return null
  if (clientId && conv.client_id !== clientId) return null
  return conv
}

export async function createSupportConversation(params: {
  clientId: string
  companyName: string
  clientEmail: string
  subject: string
  initialMessage: string
  senderName: string
}): Promise<SupportConversation> {
  const useDb = await checkDbTableExists()
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

  if (useDb) {
    const { error: convErr } = await sb.from('support_conversations').insert({
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

    if (!convErr) {
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
  }

  await writeStorageConv(convRecord)
  return convRecord
}

export async function addSupportMessage(params: {
  conversationId: string
  sender: 'client' | 'admin'
  senderName: string
  content: string
  clientId?: string | null
}): Promise<SupportMessage> {
  const useDb = await checkDbTableExists()
  const sb = getServiceSupabase()
  const now = new Date().toISOString()
  const msgId = crypto.randomUUID()

  const conv = await getSupportConversation(params.conversationId, params.clientId)
  if (!conv) {
    throw new Error('Conversation non trouvée ou accès refusé')
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

  if (useDb) {
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

  const updatedMessages = [...(conv.messages || []), newMsg]
  const updatedConv: SupportConversation = {
    ...conv,
    status: newStatus,
    updated_at: now,
    last_message_preview: newMsg.content.slice(0, 100),
    last_sender: params.sender,
    unread_admin: newUnreadAdmin,
    unread_client: newUnreadClient,
    messages: updatedMessages
  }
  await writeStorageConv(updatedConv)
  return newMsg
}

export async function updateSupportStatus(
  conversationId: string,
  status: SupportStatus,
  clientId?: string | null
): Promise<boolean> {
  const useDb = await checkDbTableExists()
  const sb = getServiceSupabase()
  const now = new Date().toISOString()

  const conv = await getSupportConversation(conversationId, clientId)
  if (!conv) return false

  if (useDb) {
    const { error } = await sb
      .from('support_conversations')
      .update({ status, updated_at: now })
      .eq('id', conversationId)
    return !error
  }

  const updatedConv: SupportConversation = {
    ...conv,
    status,
    updated_at: now
  }
  await writeStorageConv(updatedConv)
  return true
}

export async function markSupportRead(
  conversationId: string,
  reader: 'client' | 'admin',
  clientId?: string | null
): Promise<boolean> {
  const useDb = await checkDbTableExists()
  const sb = getServiceSupabase()

  const conv = await getSupportConversation(conversationId, clientId)
  if (!conv) return false

  if (useDb) {
    const updateField = reader === 'admin' ? { unread_admin: 0 } : { unread_client: 0 }
    const { error } = await sb
      .from('support_conversations')
      .update(updateField)
      .eq('id', conversationId)
    return !error
  }

  const updatedConv: SupportConversation = {
    ...conv,
    unread_admin: reader === 'admin' ? 0 : conv.unread_admin,
    unread_client: reader === 'client' ? 0 : conv.unread_client
  }
  await writeStorageConv(updatedConv)
  return true
}
