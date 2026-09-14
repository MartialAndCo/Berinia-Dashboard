'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Clock, 
  Search, 
  Volume2, 
  VolumeX, 
  Bell, 
  ExternalLink, 
  ArrowLeft,
  AlertCircle
} from 'lucide-react'
import { playSupportChime } from '@/lib/chime'
import { toast } from 'sonner'
import Link from 'next/link'

interface Message {
  id: string
  conversation_id: string
  sender: 'client' | 'admin'
  sender_name: string
  content: string
  created_at: string
}

interface Conversation {
  id: string
  client_id: string
  company_name: string
  client_email: string
  subject: string
  status: 'pending' | 'in_progress' | 'resolved'
  created_at: string
  updated_at: string
  last_message_preview: string
  last_sender: 'client' | 'admin'
  unread_admin: number
  unread_client: number
  messages?: Message[]
}

export default function AdminSupportPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notifPermission, setNotifPermission] = useState<string>('default')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevConvsRef = useRef<Conversation[]>([])
  const prevMsgCountRef = useRef<number>(0)

  // Notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission)
    }
  }, [])

  const requestNotifPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      setNotifPermission(perm)
      if (perm === 'granted') {
        toast.success('Desktop notifications enabled')
      }
    }
  }

  // Fetch all conversations
  const fetchConversations = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetch('/api/support/conversations')
      const data = await res.json()
      if (data.success && Array.isArray(data.conversations)) {
        const newConvs: Conversation[] = data.conversations

        // Check for new client messages to trigger sound & notification
        if (prevConvsRef.current.length > 0) {
          for (const conv of newConvs) {
            const old = prevConvsRef.current.find((c) => c.id === conv.id)
            const isNewer = !old || new Date(conv.updated_at).getTime() > new Date(old.updated_at).getTime()
            if (isNewer && conv.last_sender === 'client') {
              if (soundEnabled) {
                playSupportChime()
              }
              toast.info(`New message from ${conv.company_name}`, {
                description: conv.last_message_preview
              })
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification(`Support: ${conv.company_name}`, {
                  body: conv.last_message_preview || 'New support message received',
                  icon: '/icon-192.png'
                })
              }
              break
            }
          }
        }
        prevConvsRef.current = newConvs
        setConversations(newConvs)

        // Only auto-select on desktop
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
          setSelectedId((prev) => prev || (newConvs.length > 0 ? newConvs[0].id : null))
        }
      }
    } catch (err) {
      console.error('Error loading conversations:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Load conversation detail
  const fetchDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/support/conversations/${id}`)
      const data = await res.json()
      if (data.success && data.conversation) {
        const conv = data.conversation
        setSelectedConv(conv)
        const msgs = conv.messages || []
        prevMsgCountRef.current = msgs.length
      }
    } catch (err) {
      console.error('Error loading conversation detail:', err)
    }
  }

  useEffect(() => {
    fetchConversations(true)
  }, [])

  useEffect(() => {
    if (selectedId) {
      fetchDetail(selectedId)
    } else {
      setSelectedConv(null)
    }
  }, [selectedId])

  // Polling every 4s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(false)
      if (selectedId) {
        fetchDetail(selectedId)
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [selectedId, soundEnabled])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedConv?.messages])

  // 0ms Optimistic Reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId || !replyText.trim() || sending) return

    const text = replyText.trim()
    setReplyText('')
    setSending(true)

    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      conversation_id: selectedId,
      sender: 'admin',
      sender_name: 'You (Admin)',
      content: text,
      created_at: new Date().toISOString()
    }

    // Immediately update local detail and list to In Progress
    setSelectedConv((prev) =>
      prev ? { ...prev, status: 'in_progress', messages: [...(prev.messages || []), tempMsg] } : prev
    )
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? {
              ...c,
              status: 'in_progress',
              last_sender: 'admin',
              last_message_preview: text,
              unread_admin: 0,
              updated_at: new Date().toISOString()
            }
          : c
      )
    )

    try {
      const res = await fetch(`/api/support/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      })
      const data = await res.json()
      if (data.success && data.message) {
        setSelectedConv((prev) =>
          prev
            ? {
                ...prev,
                messages: (prev.messages || []).map((m) => (m.id === tempMsg.id ? data.message : m))
              }
            : prev
        )
      }
    } catch (err) {
      console.error('Error sending reply:', err)
      toast.error('Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  const handleUpdateStatus = async (newStatus: 'pending' | 'in_progress' | 'resolved') => {
    if (!selectedConv) return
    setSelectedConv({ ...selectedConv, status: newStatus })
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedConv.id ? { ...c, status: newStatus } : c))
    )
    try {
      await fetch(`/api/support/conversations/${selectedConv.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      toast.success(`Status updated to ${newStatus}`)
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const filteredConversations = conversations.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchComp = c.company_name.toLowerCase().includes(q)
      const matchEmail = c.client_email.toLowerCase().includes(q)
      const matchSub = c.subject.toLowerCase().includes(q)
      const matchMsg = c.last_message_preview?.toLowerCase().includes(q)
      if (!matchComp && !matchEmail && !matchSub && !matchMsg) return false
    }
    return true
  })

  const pendingCount = conversations.filter((c) => c.status === 'pending').length
  const inProgressCount = conversations.filter((c) => c.status === 'in_progress').length
  const resolvedCount = conversations.filter((c) => c.status === 'resolved').length

  return (
    <div className="p-3 sm:p-8 max-w-7xl mx-auto h-[calc(100dvh-5.5rem)] md:h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Header - Hidden on mobile when inside a conversation */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 md:pb-6 border-b border-stone-200/80 shrink-0 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1a1918]">Support & Ticketing</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest bg-[#1a1918] text-[#f6f4f0] uppercase">
              Admin
            </span>
          </div>
          <p className="text-xs text-[#73706b] mt-1">
            Real-time client conversations, support tickets, and direct inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {notifPermission !== 'granted' && (
            <button
              onClick={requestNotifPermission}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-200/80 hover:bg-stone-50 text-[#1a1918] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#9e4733]" />
              Enable Alerts
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-200/80 hover:bg-stone-50 text-[#1a1918] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer"
            title={soundEnabled ? 'Mute chime' : 'Unmute chime'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Sound On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">Muted</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main 2-column ticketing workspace */}
      <div className="flex-1 min-h-0 pt-3 md:pt-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* Left Column: Tickets Inbox */}
        <div className={`md:col-span-5 flex flex-col bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-sm ${selectedId ? 'hidden md:flex' : 'flex'}`}>
          {/* Status tabs & Search */}
          <div className="p-3 border-b border-stone-200/80 space-y-2.5 bg-stone-50/70">
            <div className="grid grid-cols-4 gap-1 bg-stone-200/60 p-1 rounded-xl text-[11px] font-semibold text-center">
              <button
                onClick={() => setFilter('all')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${filter === 'all' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-stone-600 hover:text-[#1a1918]'}`}
              >
                All ({conversations.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${filter === 'pending' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-stone-600 hover:text-[#1a1918]'}`}
              >
                <span>Pending</span>
                {pendingCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('in_progress')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${filter === 'in_progress' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-stone-600 hover:text-[#1a1918]'}`}
              >
                Active ({inProgressCount})
              </button>
              <button
                onClick={() => setFilter('resolved')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${filter === 'resolved' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-stone-600 hover:text-[#1a1918]'}`}
              >
                Done ({resolvedCount})
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search by client, email, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-base md:text-xs pl-9 pr-3 py-2 bg-white border border-stone-200/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-stone-500">Loading tickets...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No matching tickets.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedId
                const isPending = c.status === 'pending'
                const isResolved = c.status === 'resolved'
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3.5 transition-all cursor-pointer block active:bg-stone-100 ${
                      isSelected
                        ? 'bg-stone-100/80 md:border-l-4 md:border-[#9e4733]'
                        : 'hover:bg-stone-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-[#1a1918] truncate">{c.company_name}</span>
                          {c.unread_admin > 0 && (
                            <span className="w-2 h-2 rounded-full bg-[#9e4733] animate-ping" />
                          )}
                        </div>
                        <div className="text-[11px] font-medium text-stone-600 truncate">{c.subject}</div>
                      </div>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-500 truncate mt-1">
                      {c.last_sender === 'admin' ? 'You: ' : ''}
                      {c.last_message_preview || 'No messages yet'}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          isResolved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : isPending
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                        }`}
                      >
                        {isResolved ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : isPending ? (
                          <AlertCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {isResolved ? 'Resolved' : isPending ? 'Action Required' : 'In Progress'}
                      </span>

                      <span className="text-[10px] text-stone-400 truncate max-w-[150px]">
                        {c.client_email}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Thread & Operations */}
        <div className={`md:col-span-7 flex flex-col bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-sm ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
          {selectedConv ? (
            <>
              {/* Sticky Thread Header with Back Button on Mobile */}
              <div className="px-4 py-3 bg-white border-b border-stone-200/80 flex items-center justify-between shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 -ml-1 text-xs font-semibold text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Tickets</span>
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xs sm:text-sm font-bold text-[#1a1918] truncate">{selectedConv.company_name}</h2>
                      <Link
                        href={`/admin/client/${selectedConv.client_id}`}
                        target="_blank"
                        className="text-stone-400 hover:text-[#1a1918] p-0.5"
                        title="View client account"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5 truncate">
                      <span className="truncate">{selectedConv.client_email}</span>
                      <span>•</span>
                      <span className="font-medium text-[#1a1918] truncate">{selectedConv.subject}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={selectedConv.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as any)}
                    className="text-[11px] sm:text-xs px-2 py-1 bg-stone-100 border border-stone-200 rounded-lg font-semibold text-[#1a1918] cursor-pointer focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>

                  {selectedConv.status !== 'resolved' ? (
                    <button
                      onClick={() => handleUpdateStatus('resolved')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] sm:text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span className="hidden sm:inline">Resolve</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus('in_progress')}
                      className="px-2.5 py-1 text-[11px] sm:text-xs font-semibold border border-stone-200 text-[#1a1918] hover:bg-stone-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Timeline */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-stone-50/50">
                {(!selectedConv.messages || selectedConv.messages.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-stone-500">
                    No messages in this thread yet.
                  </div>
                ) : (
                  selectedConv.messages.map((m) => {
                    const isAdmin = m.sender === 'admin'
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="text-[10px] text-stone-400 mb-1 px-1 flex items-center gap-1.5">
                          <span className="font-semibold text-stone-600">
                            {isAdmin ? 'You (Admin)' : selectedConv.company_name}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className={`max-w-[85%] sm:max-w-[78%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-xs ${
                            isAdmin
                              ? 'bg-[#1a1918] text-[#f6f4f0] rounded-tr-xs'
                              : 'bg-white text-[#1a1918] border border-stone-200/80 rounded-tl-xs'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <form onSubmit={handleSendReply} className="p-2.5 sm:p-3 bg-white border-t border-stone-200/80 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  placeholder={`Reply to ${selectedConv.company_name}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={sending}
                  className="flex-1 text-base md:text-xs px-4 py-2.5 sm:py-3 bg-stone-100/70 rounded-xl border border-transparent focus:border-stone-300 focus:bg-white focus:outline-none transition-all placeholder:text-stone-400"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-[#1a1918] text-[#f6f4f0] hover:bg-[#33312e] active:scale-95 disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reply</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-stone-500">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <h3 className="text-sm font-bold text-[#1a1918]">Select a conversation</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm">
                Choose a ticket from the left column to view the history and reply to your client.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
