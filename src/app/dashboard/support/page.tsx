'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Plus, CheckCircle, Clock, Send, ShieldCheck, Search, ArrowLeft } from 'lucide-react'
import { playSupportChime } from '@/lib/chime'

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
  subject: string
  status: 'pending' | 'in_progress' | 'resolved'
  created_at: string
  updated_at: string
  last_message_preview: string
  last_sender: 'client' | 'admin'
  unread_client: number
  messages?: Message[]
}

// Module-level cache for instant 0ms tab switching
let cachedConversations: Conversation[] | null = null

export default function ClientSupportPage() {
  const [conversations, setConversations] = useState<Conversation[]>(() => cachedConversations || [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(() => !cachedConversations)
  const [newMessageText, setNewMessageText] = useState('')
  const [sending, setSending] = useState(false)

  // New ticket modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newInitialMsg, setNewInitialMsg] = useState('')
  const [creatingTicket, setCreatingTicket] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevMsgCountRef = useRef<number>(0)

  // Fetch list
  const fetchList = async (showLoading = false) => {
    if (showLoading && !cachedConversations) setLoading(true)
    try {
      const res = await fetch('/api/support/conversations')
      const data = await res.json()
      if (data.success && Array.isArray(data.conversations)) {
        cachedConversations = data.conversations
        setConversations(data.conversations)
        // Auto-select first only on desktop screens
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
          setSelectedId((prev) => prev || (data.conversations.length > 0 ? data.conversations[0].id : null))
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Fetch conversation detail
  const fetchDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/support/conversations/${id}`)
      const data = await res.json()
      if (data.success && data.conversation) {
        const conv = data.conversation
        setSelectedConv(conv)
        const msgs = conv.messages || []
        if (msgs.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
          const last = msgs[msgs.length - 1]
          if (last && last.sender === 'admin') {
            playSupportChime()
          }
        }
        prevMsgCountRef.current = msgs.length
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchList(true)
  }, [])

  useEffect(() => {
    if (selectedId) {
      fetchDetail(selectedId)
    } else {
      setSelectedConv(null)
    }
  }, [selectedId])

  // Polling every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchList(false)
      if (selectedId) {
        fetchDetail(selectedId)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [selectedId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedConv?.messages])

  // 0ms Optimistic Send
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId || !newMessageText.trim() || sending) return

    const text = newMessageText.trim()
    setNewMessageText('')
    setSending(true)

    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      conversation_id: selectedId,
      sender: 'client',
      sender_name: 'You',
      content: text,
      created_at: new Date().toISOString()
    }

    // 0ms Optimistic UI update
    setSelectedConv((prev) =>
      prev ? { ...prev, status: 'pending', messages: [...(prev.messages || []), tempMsg] } : prev
    )
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? { ...c, status: 'pending', last_message_preview: text, updated_at: new Date().toISOString() }
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
    } catch (e) {
      console.error('Error sending message:', e)
    } finally {
      setSending(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!selectedConv) return
    const newStatus = selectedConv.status === 'resolved' ? 'pending' : 'resolved'
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
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubject.trim() || !newInitialMsg.trim() || creatingTicket) return
    setCreatingTicket(true)
    try {
      const res = await fetch('/api/support/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newSubject.trim(),
          message: newInitialMsg.trim()
        })
      })
      const data = await res.json()
      if (data.success && data.conversation) {
        setIsModalOpen(false)
        setNewSubject('')
        setNewInitialMsg('')
        await fetchList(false)
        setSelectedId(data.conversation.id)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCreatingTicket(false)
    }
  }

  const filteredConversations = conversations.filter((c) => {
    if (filter === 'pending' && c.status === 'resolved') return false
    if (filter === 'resolved' && c.status !== 'resolved') return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchSub = c.subject.toLowerCase().includes(q)
      const matchMsg = c.last_message_preview?.toLowerCase().includes(q)
      if (!matchSub && !matchMsg) return false
    }
    return true
  })

  return (
    <div className="p-3 sm:p-8 max-w-7xl mx-auto h-full pb-20 md:pb-0 flex flex-col">
      {/* Top Header - Hidden on mobile when inside a conversation */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 md:pb-6 border-b border-stone-200/80 shrink-0 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1a1918]">Dedicated Support</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3 h-3" /> Private Channel
            </span>
          </div>
          <p className="text-xs text-[#73706b] mt-1">
            Connect directly with your dedicated BerinAgents account manager in complete confidentiality.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a1918] text-[#f6f4f0] hover:bg-[#33312e] active:scale-95 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* Main Responsive Layout */}
      <div className="flex-1 min-h-0 pt-3 md:pt-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* Left Column: Tickets list (Visible on mobile only if no ticket selected) */}
        <div className={`md:col-span-4 flex flex-col bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-sm ${selectedId ? 'hidden md:flex' : 'flex'}`}>
          {/* Filter tabs & Search */}
          <div className="p-3 border-b border-stone-200/80 space-y-2.5 bg-stone-50/70">
            <div className="flex items-center gap-1 bg-stone-200/60 p-1 rounded-xl text-[11px] font-semibold">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${filter === 'all' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#73706b] hover:text-[#1a1918]'}`}
              >
                All ({conversations.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${filter === 'pending' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#73706b] hover:text-[#1a1918]'}`}
              >
                Active ({conversations.filter(c => c.status !== 'resolved').length})
              </button>
              <button
                onClick={() => setFilter('resolved')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${filter === 'resolved' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#73706b] hover:text-[#1a1918]'}`}
              >
                Resolved ({conversations.filter(c => c.status === 'resolved').length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-base md:text-xs pl-9 pr-3 py-2 bg-white border border-stone-200/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-stone-500">Loading your tickets...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No tickets found.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedId
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
                      <span className="text-xs sm:text-sm font-bold text-[#1a1918] truncate">{c.subject}</span>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        {new Date(c.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-600 truncate mt-1">
                      {c.last_message_preview || 'No messages yet'}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          isResolved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        }`}
                      >
                        {isResolved ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {isResolved ? 'Resolved' : 'Pending'}
                      </span>

                      {c.unread_client > 0 && (
                        <span className="w-4 h-4 rounded-full bg-[#9e4733] text-white text-[9px] font-bold flex items-center justify-center">
                          {c.unread_client}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat thread (Fullscreen on mobile when ticket is selected) */}
        <div className={`md:col-span-8 flex flex-col bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-sm ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
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
                    <h2 className="text-xs sm:text-sm font-bold text-[#1a1918] truncate">{selectedConv.subject}</h2>
                    <div className="text-[10px] sm:text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5 truncate">
                      <span>Created {new Date(selectedConv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span>•</span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          selectedConv.status === 'resolved' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {selectedConv.status === 'resolved' ? 'Closed' : 'In Progress'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleToggleStatus}
                  className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold border border-stone-200 rounded-lg transition-colors cursor-pointer text-[#1a1918] hover:bg-stone-50 shrink-0"
                >
                  {selectedConv.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                </button>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-stone-50/50">
                {(!selectedConv.messages || selectedConv.messages.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-stone-500">
                    No messages in this thread yet.
                  </div>
                ) : (
                  selectedConv.messages.map((m) => {
                    const isMe = m.sender === 'client'
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="text-[10px] text-stone-400 mb-1 px-1 flex items-center gap-1.5">
                          <span className="font-semibold text-stone-600">
                            {isMe ? 'You' : 'BerinAgents Support'}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-xs ${
                            isMe
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

              {/* Message Composer */}
              <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 bg-white border-t border-stone-200/80 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  placeholder="Type your message here..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  disabled={sending}
                  className="flex-1 text-base md:text-xs px-4 py-2.5 sm:py-3 bg-stone-100/70 rounded-xl border border-transparent focus:border-stone-300 focus:bg-white focus:outline-none transition-all placeholder:text-stone-400"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim() || sending}
                  className="px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-[#1a1918] text-[#f6f4f0] hover:bg-[#33312e] active:scale-95 disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-stone-500">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <h3 className="text-sm font-bold text-[#1a1918]">Select a ticket</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm">
                Choose a conversation from the left to view messages or open a new support request.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-[#1a1918] text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-transform"
              >
                + New Ticket
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-stone-200/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-[#1a1918] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold">Open a Support Ticket</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Your request is directly routed to your dedicated account manager.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-800 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1a1918] mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call script update, prompt adjustment, line setup..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full text-base md:text-xs px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1a1918] mb-1">
                  Detailed Message
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your request or issue with as much detail as possible..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full text-base md:text-xs px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTicket || !newSubject.trim() || !newInitialMsg.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-[#1a1918] text-white hover:bg-[#33312e] rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  {creatingTicket ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
