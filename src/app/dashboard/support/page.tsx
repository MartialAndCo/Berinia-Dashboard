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

export default function ClientSupportPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
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
    if (showLoading) setLoading(true)
    try {
      const res = await fetch('/api/support/conversations')
      const data = await res.json()
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations)
        if (!selectedId && data.conversations.length > 0) {
          setSelectedId(data.conversations[0].id)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      if (showLoading) setLoading(false)
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId || !newMessageText.trim() || sending) return

    const text = newMessageText.trim()
    setNewMessageText('')
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
        fetchList(false)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!selectedConv) return
    const newStatus = selectedConv.status === 'resolved' ? 'pending' : 'resolved'
    try {
      await fetch(`/api/support/conversations/${selectedConv.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      setSelectedConv({ ...selectedConv, status: newStatus })
      fetchList(false)
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] md:h-full flex flex-col">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e6e2d6] shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#1a1918]">Support & Assistance Dédiée</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-3 h-3" /> Privé & Isolé
            </span>
          </div>
          <p className="text-xs text-[#73706b] mt-1">
            Échangez directement avec votre chargé de compte technique BerinAgents en toute confidentialité.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a1918] text-[#f6f4f0] hover:bg-[#33312e] rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouveau Ticket
        </button>
      </div>

      {/* Main 2-column layout */}
      <div className="flex-1 min-h-0 pt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Tickets list */}
        <div className={`md:col-span-4 flex flex-col bg-white border border-[#e6e2d6] rounded-2xl overflow-hidden shadow-xs ${selectedId ? 'hidden md:flex' : 'flex'}`}>
          {/* Filter tabs & Search */}
          <div className="p-3 border-b border-[#e6e2d6] space-y-2 bg-[#faf8f5]">
            <div className="flex items-center gap-1 bg-[#f0ede6] p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer ${filter === 'all' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#73706b] hover:text-[#1a1918]'}`}
              >
                Tous ({conversations.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer ${filter === 'pending' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#73706b] hover:text-[#1a1918]'}`}
              >
                En cours ({conversations.filter(c => c.status !== 'resolved').length})
              </button>
              <button
                onClick={() => setFilter('resolved')}
                className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer ${filter === 'resolved' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#73706b] hover:text-[#1a1918]'}`}
              >
                Résolus ({conversations.filter(c => c.status === 'resolved').length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a49c]" />
              <input
                type="text"
                placeholder="Rechercher une demande..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-[#e6e2d6] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f0ede6]">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#73706b]">Chargement de vos tickets...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#73706b]">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Aucun ticket trouvé.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedId
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
                      <span className="text-xs font-bold text-[#1a1918] truncate">{c.subject}</span>
                      <span className="text-[10px] text-[#a8a49c] shrink-0">
                        {new Date(c.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#73706b] truncate mt-1">
                      {c.last_message_preview || 'Aucun message'}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                          isResolved
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isResolved ? <CheckCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                        {isResolved ? 'Résolu' : 'En attente'}
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

        {/* Right Column: Chat thread */}
        <div className={`md:col-span-8 flex flex-col bg-white border border-[#e6e2d6] rounded-2xl overflow-hidden shadow-xs ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
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
                    <h2 className="text-sm font-bold text-[#1a1918]">{selectedConv.subject}</h2>
                    <div className="text-[11px] text-[#73706b] flex items-center gap-2 mt-0.5">
                      <span>Créé le {new Date(selectedConv.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          selectedConv.status === 'resolved' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {selectedConv.status === 'resolved' ? 'Ticket clôturé' : 'En cours de traitement'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleToggleStatus}
                  className="px-3 py-1.5 text-xs font-semibold border rounded-lg transition-colors cursor-pointer text-[#1a1918] hover:bg-[#faf8f5]"
                >
                  {selectedConv.status === 'resolved' ? 'Rouvrir le ticket' : 'Marquer comme résolu'}
                </button>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#faf8f5]/50">
                {(!selectedConv.messages || selectedConv.messages.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#73706b]">
                    Aucun message dans ce fil.
                  </div>
                ) : (
                  selectedConv.messages.map((m) => {
                    const isMe = m.sender === 'client'
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="text-[10px] text-[#a8a49c] mb-1 px-1 flex items-center gap-1.5">
                          <span className="font-semibold text-[#73706b]">
                            {isMe ? 'Vous' : 'Équipe Support BerinAgents'}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className={`max-w-[75%] px-4 py-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-xs ${
                            isMe
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
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-[#e6e2d6] flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  placeholder="Écrivez votre réponse ici..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  disabled={sending}
                  className="flex-1 text-xs px-4 py-3 bg-[#f6f4f0] rounded-xl border border-transparent focus:border-[#e6e2d6] focus:bg-white focus:outline-none transition-all placeholder:text-[#a8a49c]"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim() || sending}
                  className="px-4 py-3 rounded-xl bg-[#1a1918] text-[#f6f4f0] hover:bg-[#33312e] disabled:opacity-40 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  Envoyer
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#73706b]">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <h3 className="text-sm font-bold text-[#1a1918]">Sélectionnez une conversation</h3>
              <p className="text-xs text-[#73706b] mt-1 max-w-sm">
                Choisissez un ticket à gauche pour lire les réponses ou ouvrez un nouveau ticket.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-[#1a1918] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                + Nouveau ticket
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1a1918]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#e6e2d6] rounded-2xl max-w-lg w-full p-6 shadow-2xl text-[#1a1918] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold">Ouvrir un nouveau ticket de support</h3>
                <p className="text-xs text-[#73706b] mt-0.5">
                  Votre demande est directement assignée à votre interlocuteur technique.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#a8a49c] hover:text-[#1a1918] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1a1918] mb-1">
                  Sujet de la demande
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ajustement du script d'appel, Facturation..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#f6f4f0] border border-[#e6e2d6] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1a1918] mb-1">
                  Description détaillée
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Expliquez en détail ce que vous souhaitez modifier ou le problème rencontré..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#f6f4f0] border border-[#e6e2d6] rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1918]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#73706b] hover:text-[#1a1918] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingTicket || !newSubject.trim() || !newInitialMsg.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-[#1a1918] text-white hover:bg-[#33312e] rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  {creatingTicket ? 'Création en cours...' : 'Envoyer la demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
