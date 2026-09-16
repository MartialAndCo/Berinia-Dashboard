'use client'

import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CheckoutCanceledPage() {
  return (
    <div className="min-h-screen bg-[#f6f4f0] text-[#1a1918] flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <header className="max-w-xl mx-auto w-full flex items-center justify-between py-4 border-b border-[#e6e2d6]">
        <img
          src="/logo-horizontal-black.png"
          alt="BerinAgents"
          className="h-5 w-auto object-contain"
        />
        <div className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest text-[#73706b] uppercase">
          PAIEMENT NON FINALISÉ
        </div>
      </header>

      {/* Main Card */}
      <main className="max-w-xl mx-auto w-full my-auto py-8">
        <div className="bg-white border border-[#e6e2d6] rounded-sm shadow-[0_4px_32px_rgba(0,0,0,0.03)] p-6 sm:p-10 space-y-6 text-center">
          
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
              <AlertCircle className="w-9 h-9" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1918]">
              Paiement Interrompu
            </h1>
            <p className="text-sm text-[#73706b] max-w-md mx-auto leading-relaxed">
              La transaction n'a pas été débitée. Si vous êtes en appel avec votre conseiller, vous pouvez lui demander de vous renvoyer le lien ou poser vos questions directement.
            </p>
          </div>

          <div className="pt-2">
            <p className="text-xs text-[#73706b]">
              Vous pouvez fermer cette fenêtre pour retourner sur votre appel.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full text-center py-4 text-xs text-[#73706b] border-t border-[#e6e2d6]">
        &copy; {new Date().getFullYear()} BerinAgents &middot; Plateforme d'Agents Vocaux IA pour Entreprises
      </footer>
    </div>
  )
}
