'use client'

import { useState, useEffect } from 'react'
import { Share, PlusSquare, Smartphone, X } from 'lucide-react'

export default function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already in standalone PWA
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true

    if (isStandalone) {
      setInstalled(true)
      return
    }

    // Check if dismissed recently (24h)
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed')
    if (dismissedAt) {
      const hours = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60)
      if (hours < 24) return
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    if (isIosDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    // Android / Desktop Chrome prompt handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString())
  }

  if (!showPrompt || installed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-[#ffffff]/95 backdrop-blur-xl border border-[#e6e2d6] shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl p-4 text-[#1a1918]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1a1918] flex items-center justify-center shrink-0 shadow-sm">
              <img src="/apple-touch-icon.png" alt="BerinAgents" className="w-7 h-7 rounded-lg object-contain" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-tight text-[#1a1918]">Installer BerinAgents</div>
              <div className="text-[11px] text-[#73706b] leading-tight">Accès direct plein écran & alertes en direct</div>
            </div>
          </div>
          <button 
            onClick={handleDismiss}
            className="p-1 text-[#a8a49c] hover:text-[#1a1918] rounded-full transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="mt-3 pt-3 border-t border-[#f0ede6] space-y-1.5 text-[11px] text-[#52504c]">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#f0ede6] text-[9px] font-bold text-[#1a1918]">1</span>
              <span>Appuyez sur <Share className="w-3.5 h-3.5 inline text-[#2a6ced] mx-0.5" /> dans Safari</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#f0ede6] text-[9px] font-bold text-[#1a1918]">2</span>
              <span>Puis choisissez <PlusSquare className="w-3.5 h-3.5 inline text-[#1a1918] mx-0.5" /> <strong>Sur l'écran d'accueil</strong></span>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-[#f0ede6] flex items-center justify-end gap-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-[11px] text-[#73706b] hover:text-[#1a1918] font-medium transition-colors cursor-pointer"
            >
              Plus tard
            </button>
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 text-[11px] font-semibold bg-[#1a1918] text-[#f6f4f0] hover:bg-[#33312e] rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Installer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
