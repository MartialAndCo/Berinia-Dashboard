'use client'

import { useState, useEffect } from 'react'
import { Share, PlusSquare, Smartphone, X, Sparkles, CheckCircle2 } from 'lucide-react'

export default function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true

    if (isStandalone) {
      setInstalled(true)
      return
    }

    // Check if dismissed within the last 48 hours
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed')
    if (dismissedAt) {
      const hours = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60)
      if (hours < 48) return
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    if (isIosDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 2500)
      return () => clearTimeout(timer)
    }

    // Android / Desktop Chrome install handler
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
    <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-[420px] z-50 animate-in fade-in slide-in-from-bottom-6 duration-300">
      <div className="bg-white/95 backdrop-blur-2xl border border-stone-200/90 shadow-[0_20px_60px_rgba(0,0,0,0.18)] rounded-3xl p-5 text-[#1a1918]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#1a1918] p-2 flex items-center justify-center shrink-0 shadow-md">
              <img src="/apple-touch-icon.png" alt="BerinAgents App" className="w-8 h-8 rounded-xl object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold tracking-tight text-[#1a1918]">Install BerinAgents App</h3>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                  <Sparkles className="w-2.5 h-2.5" /> PWA
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Full-screen app experience & instant live alerts
              </p>
            </div>
          </div>

          <button 
            onClick={handleDismiss}
            className="p-1.5 -mr-1 text-stone-400 hover:text-stone-800 rounded-full transition-colors cursor-pointer"
            aria-label="Close install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Benefits bullets */}
        <div className="mt-3.5 py-2 px-3 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between text-[11px] text-stone-600">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> Real-time sound
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> Full-screen UI
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> 1-Tap launch
          </span>
        </div>

        {/* iOS Step-by-Step Instructions */}
        {isIOS ? (
          <div className="mt-3.5 pt-3 border-t border-stone-100 space-y-2 text-xs text-stone-700">
            <div className="flex items-center gap-2.5 bg-stone-50/80 p-2 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-[#1a1918] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                1
              </div>
              <div className="flex items-center gap-1.5">
                <span>Tap the</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-semibold border border-blue-200/60 text-[11px]">
                  <Share className="w-3.5 h-3.5 text-blue-600" /> Share
                </span>
                <span>button in Safari</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-stone-50/80 p-2 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-[#1a1918] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                2
              </div>
              <div className="flex items-center gap-1.5">
                <span>Scroll down and select</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-200/80 text-stone-800 font-semibold text-[11px]">
                  <PlusSquare className="w-3.5 h-3.5 text-stone-800" /> Add to Home Screen
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleDismiss}
                className="text-xs text-stone-500 hover:text-stone-900 font-medium cursor-pointer"
              >
                Got it, dismiss
              </button>
            </div>
          </div>
        ) : (
          /* Chrome / Android one-click install */
          <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-xs text-stone-500 hover:text-stone-900 font-medium transition-colors cursor-pointer"
            >
              Maybe Later
            </button>
            <button
              onClick={handleInstallClick}
              className="px-4 py-2.5 text-xs font-semibold bg-[#1a1918] text-white hover:bg-[#33312e] active:scale-95 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              Install App
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
