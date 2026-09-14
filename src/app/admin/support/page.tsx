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
        toast.success('Notifications de bureau activées avec succès')
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

        // Check for new client messages across all conversations to trigger sound & notification
        if (prevConvsRef.current.length > 0) {
          for (const conv of newConvs) {
            const old = prevConvsRef.current.find((c) => c.id === conv.id)
            const isNewer = !old || new Date(conv.updated_at).getTime() > new Date(old.updated_at).getTime()
            if (isNewer && conv.last_sender === 'client') {
              if (soundEnabled) {
                playSupportChime()
              }
              toast.info(`Nouveau message de ${conv.company_name}`, {
                description: conv.last_message_preview
              })
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification(`Support: ${conv.company_name}`, {
                  body: conv.last_message_preview || 'Nouveau message reçu',
                  icon: '/icon-192.png'
                })
              }
              break
            }
          }
        }
        prevConvsRef.current = newConvs
        setConversations(newConvs)

        if (!selectedId && newConvs.length > 0) {
          setSelectedId(newConvs[0].id)
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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId || !replyText.trim() || sending) return

    const text = replyText.trim()
    setReplyText('')
    setSending(true)

    try {
      const res = await fetch(`/api/support/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      })
      const data = await res.json()
      if (data.success) {
        await fetchDetail(selectedId)
        fetchConversations(false)
        toast.success('Message envoyé au client')
      }
    } catch (err) {
      console.error('Error sending reply:', err)
      toast.error("Erreur lors de l'envoi du message")
    } finally {
      setSending(false)
    }
  }

  const handleUpdateStatus = async (newStatus: 'pending' | 'in_progress' | 'resolved') => {
    if (!selectedConv) return
    try {
      await fetch(`/api/support/conversations/${selectedConv.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      setSelectedConv({ ...selectedConv, status: newStatus })
      fetchConversations(false)
      toast.success(`Statut mis à jour : ${newStatus}`)
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] md:h-full flex flex-col">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e6e2d6] shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#1a1918]">Support & Ticketing Console</h1>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-widest bg-[#1a1918] text-[#f6f4f0] uppercase">
              Admin
            </span>
          </div>
          <p className="text-xs text-[#73706b] mt-1">
            Gérez en direct les questions, incidents et demandes d'assistance de vos clients.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {notifPermission !== 'granted' && (
            <button
              onClick={requestNotifPermission}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#e6e2d6] hover:bg-[#faf8f5] text-[#1a1918] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#9e4733]" />
              Activer les alertes
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#e6e2d6] hover:bg-[#faf8f5] text-[#1a1918] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer"
            title={soundEnabled ? 'Désactiver le carillon' : 'Activer le carillon'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Son actif</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-[#73706b]" />
                <span>Son coupé</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main 2-column ticketing workspace */}
      <div className="flex-1 min-h-0 pt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Tickets Inbox */}
        <div className={`md:col-span-5 flex flex-col bg-white border border-[#e6e2d6] rounded-2xl overflow-hidden shadow-xs ${selectedId ? 'hidden md:flex' : 'flex'}`}>
          {/* Status tabs & Search */}
          <div className="p-3 border-b border-[#e6e2d6] space-y-2 bg-[#faf8f5]">
            <div className="grid grid-cols-4 gap-1 bg-[#f0ede6] p-0.5 rounded-lg text-[11px] font-semibold text-center">
              <button
                onClick={() => setFilter('all')}
                className={`py-1.5 rounded-md transition-colors cursor-pointer ${filter === 'all' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#73706b] hover:text-[#1a1918]'}`}
              >
                Tous ({conversations.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`py-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 ${filter === 'pending' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#73706b] hover:text-[#1a1918]'}`}
              >
                <span>Attente</span>
                {pendingCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('in_progress')}
                className={`py-1.5 rounded-md transition-colors cursor-pointer ${filter === 'in_progress' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#73706b] hover:text-[#1a1918]'}`}
              >
                En cours ({inProgressCount})
              </button>
              <button
                onClick={() => setFilter('resolved')}
                className={`py-1.5 rounded-md transition-colors cursor-pointer ${filter === 'resolved' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#73706b] hover:text-[#1a1918]'}`}
              >
                Résolus ({resolvedCount})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a49c]" />
              <input
                type="text"
                placeholder="Rechercher par client, email, sujet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-[#e6e2d6] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f0ede6]">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#73706b]">Chargement des tickets...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#73706b]">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Aucun ticket correspondant.
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
                    className={`w-full text-left p-3.5 transition-all cursor-pointer block ${
                      isSelected
                        ? 'bg-[#f0ede6] border-l-4 border-[#9e4733]'
                        : 'hover:bg-[#faf8f5]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#1a1918] truncate">{c.company_name}</span>
                          {c.unread_admin > 0 && (
                            <span className="w-2 h-2 rounded-full bg-[#9e4733] animate-ping" />
                          )}
                        </div>
                        <div className="text-[11px] font-medium text-[#52504c] truncate">{c.subject}</div>
                      </div>
                      <span className="text-[10px] text-[#a8a49c] shrink-0">
                        {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#73706b] truncate mt-1">
                      {c.last_sender === 'admin' ? 'Vous : ' : ''}
                      {c.last_message_preview || 'Aucun message'}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                          isResolved
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPending
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isResolved ? (
                          <CheckCircle className="w-2.5 h-2.5" />
                        ) : isPending ? (
                          <AlertCircle className="w-2.5 h-2.5" />
                        ) : (
                          <Clock className="w-2.5 h-2.5" />
                        )}
                        {isResolved ? 'Résolu' : isPending ? 'Action requise' : 'En cours'}
                      </span>

                      <span className="text-[10px] text-[#a8a49c] truncate max-w-[150px]">
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
        <div className={`md:col-span-7 flex flex-col bg-white border border-[#e6e2d6] rounded-2xl overflow-hidden shadow-xs ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
          {selectedConv ? (
            <>
              {/* Thread Header */}
              <div className="px-5 py-3.5 bg-[#ffffff] border-b border-[#e6e2d6] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden p-1.5 -ml-1 text-[#73706b] hover:text-[#1a1918] cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-[#1a1918]">{selectedConv.company_name}</h2>
                      <Link
                        href={`/admin/client/${selectedConv.client_id}`}
                        target="_blank"
                        className="text-[#73706b] hover:text-[#1a1918] p-0.5"
                        title="Voir la fiche client"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                    <div className="text-[11px] text-[#73706b] flex items-center gap-2 mt-0.5">
                      <span>{selectedConv.client_email}</span>
                      <span>•</span>
                      <span className="font-medium text-[#1a1918]">{selectedConv.subject}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedConv.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as any)}
                    className="text-xs px-2.5 py-1.5 bg-[#f6f4f0] border border-[#e6e2d6] rounded-lg font-semibold text-[#1a1918] cursor-pointer focus:outline-none"
                  >
                    <option value="pending">En attente</option>
                    <option value="in_progress">En cours</option>
                    <option value="resolved">Résolu</option>
                  </select>

                  {selectedConv.status !== 'resolved' ? (
                    <button
                      onClick={() => handleUpdateStatus('resolved')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Résoudre
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus('in_progress')}
                      className="px-3 py-1.5 text-xs font-semibold border border-[#e6e2d6] text-[#1a1918] hover:bg-[#faf8f5] rounded-lg transition-colors cursor-pointer"
                    >
                      Rouvrir
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Timeline */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#faf8f5]/50">
                {(!selectedConv.messages || selectedConv.messages.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#73706b]">
                    Aucun message dans ce fil.
                  </div>
                ) : (
                  selectedConv.messages.map((m) => {
                    const isAdmin = m.sender === 'admin'
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="text-[10px] text-[#a8a49c] mb-1 px-1 flex items-center gap-1.5">
                          <span className="font-semibold text-[#73706b]">
                            {isAdmin ? 'Vous (Admin)' : selectedConv.company_name}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className={`max-w-[78%] px-4 py-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-xs ${
                            isAdmin
                              ? 'bg-[#1a1918] text-[#f6f4f0] rounded-tr-xs'
                              : 'bg-[#ffffff] text-[#1a1918] border border-[#e6e2d6] rounded-tl-xs'
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
              <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-[#e6e2d6] flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  placeholder={`Répondre à ${selectedConv.company_name}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={sending}
                  className="flex-1 text-xs px-4 py-3 bg-[#f6f4f0] rounded-xl border border-transparent focus:border-[#e6e2d6] focus:bg-white focus:outline-none transition-all placeholder:text-[#a8a49c]"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="px-4 py-3 rounded-xl bg-[#1a1918] text-[#f6f4f0] hover:bg-[#33312e] disabled:opacity-40 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  Répondre
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#73706b]">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <h3 className="text-sm font-bold text-[#1a1918]">Sélectionnez une conversation</h3>
              <p className="text-xs text-[#73706b] mt-1 max-w-sm">
                Choisissez un ticket dans la colonne de gauche pour afficher l'historique et répondre au client.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
