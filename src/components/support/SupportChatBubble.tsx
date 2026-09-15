'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, X, Send, CheckCircle, Clock, Volume2, VolumeX, ExternalLink, Plus } from 'lucide-react'
import { playSupportChime } from '@/lib/chime'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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
  updated_at: string
  unread_client: number
  messages?: Message[]
}

export default function SupportChatBubble() {
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [clientUserName, setClientUserName] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevMsgCountRef = useRef<number>(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta = user.user_metadata || {}
        setClientUserName(meta.full_name || meta.name || '')
      }
    })
  }, [])

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/support/conversations')
      const data = await res.json()
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations)
        const totalUnread = data.conversations.reduce(
          (acc: number, c: Conversation) => acc + (c.unread_client || 0),
          0
        )
        setUnreadCount(totalUnread)

        if (!activeConv && data.conversations.length > 0) {
          const firstOpen = data.conversations.find((c: Conversation) => c.status !== 'resolved') || data.conversations[0]
          loadConversation(firstOpen.id)
        } else if (data.conversations.length === 0) {
          setIsCreatingNew(true)
        }
      }
    } catch (err) {
      console.warn('Error fetching support conversations:', err)
    }
  }

  // Load single conversation details
  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/support/conversations/${id}`)
      const data = await res.json()
      if (data.success && data.conversation) {
        const conv = data.conversation
        setActiveConv(conv)
        setIsCreatingNew(false)
        const msgs = conv.messages || []
        
        if (
          soundEnabled &&
          msgs.length > prevMsgCountRef.current &&
          prevMsgCountRef.current > 0
        ) {
          const last = msgs[msgs.length - 1]
          if (last && last.sender === 'admin') {
            playSupportChime()
          }
        }
        prevMsgCountRef.current = msgs.length
        setMessages(msgs)
      }
    } catch (err) {
      console.warn('Error loading conversation:', err)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeConv) {
        loadConversation(activeConv.id)
      } else {
        fetchConversations()
      }
    }, 6000)
    return () => clearInterval(interval)
  }, [activeConv, soundEnabled])

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || loading) return

    const text = inputMessage.trim()
    setInputMessage('')

    if (isCreatingNew || !activeConv) {
      setLoading(true)
      try {
        const res = await fetch('/api/support/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: newSubject.trim() || 'General Inquiry',
            message: text,
            senderName: clientUserName || undefined
          })
        })
        const data = await res.json()
        if (data.success && data.conversation) {
          setNewSubject('')
          setIsCreatingNew(false)
          await fetchConversations()
          loadConversation(data.conversation.id)
        }
      } catch (err) {
        console.error('Error creating conversation:', err)
      } finally {
        setLoading(false)
      }
    } else {
      const tempMsg: Message = {
        id: 'temp-' + Date.now(),
        conversation_id: activeConv.id,
        sender: 'client',
        sender_name: clientUserName || 'You',
        content: text,
        created_at: new Date().toISOString()
      }
      // 0ms optimistic append
      setMessages((prev) => [...prev, tempMsg])
      prevMsgCountRef.current += 1

      try {
        const res = await fetch(`/api/support/conversations/${activeConv.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text, senderName: clientUserName || undefined })
        })
        const data = await res.json()
        if (data.success && data.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempMsg.id ? data.message : m))
          )
        }
      } catch (err) {
        console.error('Error sending message:', err)
      }
    }
  }

  const handleToggleResolve = async () => {
    if (!activeConv) return
    const newStatus = activeConv.status === 'resolved' ? 'pending' : 'resolved'
    setActiveConv({ ...activeConv, status: newStatus })
    try {
      await fetch(`/api/support/conversations/${activeConv.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      fetchConversations()
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  return (
    <>
      {/* Floating Trigger Bubble - hidden on mobile screens */}
      <div className="fixed bottom-6 right-6 z-40 select-none hidden md:block">
        {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true)
              if (activeConv) loadConversation(activeConv.id)
            }}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-[#1a1918] text-[#f6f4f0] rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-[#33312e]"
            aria-label="Open support chat"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-[#f6f4f0]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#9e4733] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold tracking-wide">Support</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          </button>
        )}
      </div>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 w-[92vw] sm:w-[380px] h-[520px] max-h-[85vh] bg-[#ffffff]/95 backdrop-blur-2xl border border-stone-200 shadow-[0_24px_70px_rgba(0,0,0,0.2)] rounded-3xl flex flex-col overflow-hidden text-[#1a1918] animate-in zoom-in-95 slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#1a1918] text-[#f6f4f0] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#33312e] border border-[#4d4a46] flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-[#f6f4f0]" />
              </div>
              <div>
                <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                  BerinAgents Support
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-[10px] text-stone-400">
                  {activeConv
                    ? activeConv.status === 'resolved'
                      ? 'Ticket Closed'
                      : 'Team Online'
                    : 'New Ticket'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsCreatingNew(true)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="New Ticket"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subheader Status */}
          <div className="px-3 py-1.5 bg-stone-100/70 border-b border-stone-200 flex items-center justify-between text-[11px]">
            {activeConv && !isCreatingNew ? (
              <>
                <div className="flex items-center gap-1.5 font-medium truncate max-w-[210px] text-stone-700">
                  {activeConv.status === 'resolved' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      <CheckCircle className="w-3 h-3" /> Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                  <span className="truncate">{activeConv.subject}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleToggleResolve}
                    className="text-[10px] text-stone-500 hover:text-[#1a1918] font-semibold underline cursor-pointer"
                  >
                    {activeConv.status === 'resolved' ? 'Reopen' : 'Resolve'}
                  </button>
                  <Link
                    href="/dashboard/support"
                    className="p-1 text-stone-500 hover:text-[#1a1918]"
                    title="View full portal"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-[11px] text-stone-600">New Support Inquiry</div>
            )}
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/60">
            {isCreatingNew ? (
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold text-[#1a1918]">What is your request about?</div>
                <input
                  type="text"
                  placeholder="e.g. Prompt tuning, phone number, billing..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
                />
                <div className="text-[11px] text-stone-500">Quick suggestions:</div>
                <div className="flex flex-wrap gap-1.5">
                  {['Voice Agent', 'Billing', 'Phone Number', 'General'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewSubject(tag)}
                      className="px-2.5 py-1 text-[10px] bg-white border border-stone-200 hover:border-[#1a1918] rounded-lg transition-colors cursor-pointer text-stone-700"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-stone-500 pt-1">
                  Your message will be sent directly to your dedicated technical account manager.
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <div className="text-xs font-semibold text-[#1a1918]">No messages yet</div>
                <div className="text-[11px] mt-1">Ask your question below.</div>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender === 'client'
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[9px] text-stone-400 mb-1 px-1">
                      {isMe ? 'You' : (msg.sender_name || 'BerinAgents Support')} •{' '}
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div
                      className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                        isMe
                          ? 'bg-[#1a1918] text-[#f6f4f0] rounded-tr-xs shadow-xs'
                          : 'bg-white text-[#1a1918] border border-stone-200 rounded-tl-xs shadow-xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Composer */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder={isCreatingNew ? "Describe your question..." : "Type your message..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={loading}
              className="flex-1 text-xs px-3.5 py-2.5 bg-stone-100 rounded-full border border-transparent focus:border-stone-300 focus:bg-white focus:outline-none transition-all placeholder:text-stone-400"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="w-9 h-9 rounded-full bg-[#1a1918] text-[#f6f4f0] flex items-center justify-center hover:bg-[#33312e] active:scale-95 disabled:opacity-40 transition-transform shrink-0 cursor-pointer shadow-xs"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
