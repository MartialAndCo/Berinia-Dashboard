'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getClientsListAction } from '@/app/admin/actions'
import { Users, ChevronDown, ChevronsUpDown, Search, Shield, ArrowRight, X } from 'lucide-react'

interface ClientItem {
  id: string
  company_name: string
  email?: string
  status?: string
}

interface SwitchAccountDropdownProps {
  currentClientId?: string | null
  isAdminConsole?: boolean
  inBanner?: boolean
}

export default function SwitchAccountDropdown({
  currentClientId,
  isAdminConsole = false,
  inBanner = false,
}: SwitchAccountDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [clients, setClients] = useState<ClientItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const fetchClients = async () => {
    setLoading(true)
    try {
      const res = await getClientsListAction()
      if (res.success && res.clients) {
        setClients(res.clients)
      }
    } catch (e) {
      console.error('Failed to load clients list:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectClient = (clientId: string) => {
    setIsOpen(false)
    setSearch('')
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('admin_selected_client_id', clientId)
    }
    router.push(`/dashboard?clientId=${clientId}`)
  }

  const handleSelectAdmin = () => {
    setIsOpen(false)
    setSearch('')
    router.push('/admin')
  }

  const currentClient = clients.find(c => c.id === currentClientId)
  const filteredClients = clients.filter(c => 
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={`relative ${inBanner ? 'inline-block' : 'w-full'}`} ref={dropdownRef}>
      {/* Trigger Button */}
      {inBanner ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium tracking-wide bg-[#2d2a26] text-[#f6f4f0] hover:bg-[#3d3934] border border-[#47433c] transition-all cursor-pointer"
        >
          <Users className="h-3.5 w-3.5 text-[#9e4733]" />
          <span className="truncate max-w-[160px]">
            {currentClient ? currentClient.company_name : 'Switch Client'}
          </span>
          <ChevronDown className={`h-3 w-3 text-[#a09c93] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-semibold tracking-wider uppercase text-[#1a1918] bg-[#faf8f5] hover:bg-[#f0ede6] border border-[#e6e2d6] transition-all cursor-pointer group shadow-none"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Users className="h-4 w-4 text-[#9e4733] shrink-0" />
            <div className="flex flex-col text-left truncate">
              <span className="text-[11px] leading-tight text-[#1a1918] truncate font-semibold">
                {isAdminConsole 
                  ? 'Switch Account' 
                  : (currentClient ? currentClient.company_name : 'Switch Account')}
              </span>
              <span className="text-[9px] tracking-widest text-[#73706b] uppercase">
                {isAdminConsole ? 'Admin Console' : 'Client Mode'}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-[#73706b] group-hover:text-[#1a1918] shrink-0 ml-1" />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={`absolute z-50 bg-[#ffffff] border border-[#e6e2d6] rounded-sm shadow-[0_12px_32px_rgba(0,0,0,0.12)] overflow-hidden animate-in fade-in duration-150 ${
            inBanner 
              ? 'top-full mt-1.5 right-0 w-72' 
              : 'bottom-full mb-2 left-0 w-full min-w-[260px]'
          }`}
        >
          {/* Header */}
          <div className="p-2.5 bg-[#faf8f5] border-b border-[#e6e2d6] space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold tracking-[0.18em] text-[#9e4733] uppercase flex items-center gap-1">
                <span>•</span> Switch Account
              </span>
              <span className="text-[10px] text-[#73706b] font-mono">
                {clients.length} client{clients.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#73706b]" />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#ffffff] border border-[#e2dfd8] rounded-sm text-[#1a1918] placeholder:text-[#a09d96] focus:outline-none focus:border-[#1a1918]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#73706b] hover:text-[#1a1918] cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options Container */}
          <div className="max-h-64 overflow-y-auto divide-y divide-[#f0ece4] py-1">
            {/* Admin Console Option */}
            <button
              type="button"
              onClick={handleSelectAdmin}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                isAdminConsole 
                  ? 'bg-[#f0ede6] text-[#1a1918] font-semibold border-l-2 border-[#9e4733]' 
                  : 'hover:bg-[#faf8f5] text-[#1a1918]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-sm bg-[#1a1918] text-[#f6f4f0] flex items-center justify-center shrink-0">
                  <Shield className="h-3.5 w-3.5 text-[#9e4733]" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide leading-none">
                    Admin Console
                  </div>
                  <div className="text-[10px] text-[#73706b] mt-1">
                    Agency overview & settings
                  </div>
                </div>
              </div>
              {isAdminConsole && (
                <span className="text-[#9e4733] text-xs font-bold leading-none">•</span>
              )}
            </button>

            {/* Clients List */}
            <div className="py-1">
              <div className="px-3.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[#73706b] bg-[#faf8f5]/60">
                Client Accounts
              </div>

              {loading ? (
                <div className="px-3.5 py-4 text-center text-xs text-[#73706b]">
                  Loading clients...
                </div>
              ) : filteredClients.length > 0 ? (
                filteredClients.map(client => {
                  const isSelected = !isAdminConsole && client.id === currentClientId
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleSelectClient(client.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-left transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-[#f0ede6] text-[#1a1918] font-semibold border-l-2 border-[#9e4733]' 
                          : 'hover:bg-[#faf8f5] text-[#1a1918]'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-semibold text-[#1a1918] truncate">
                          {client.company_name}
                        </div>
                        <div className="text-[10px] text-[#73706b] truncate font-mono">
                          {client.email || 'No email'}
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="text-[#9e4733] text-xs font-bold shrink-0">• Active</span>
                      ) : (
                        <ArrowRight className="h-3 w-3 text-[#a09d96] opacity-0 group-hover:opacity-100 shrink-0" />
                      )}
                    </button>
                  )
                })
              ) : (
                <div className="px-3.5 py-4 text-center text-xs text-[#73706b]">
                  No clients found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
