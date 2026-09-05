'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'

interface DeleteClientModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  clientName: string
  requireTyping?: boolean
}

export function DeleteClientModal({ open, onClose, onConfirm, clientName, requireTyping = false }: DeleteClientModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const [step, setStep] = useState<'warn' | 'confirm'>('warn')

  const handleClose = () => {
    setConfirmText('')
    setStep('warn')
    onClose()
  }

  const handleProceed = () => {
    if (requireTyping && step === 'warn') {
      setStep('confirm')
      return
    }
    onConfirm()
    handleClose()
  }

  const canProceed = step === 'confirm' ? confirmText === 'DELETE' : true

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_8px_40px_rgba(0,0,0,0.08)] sm:max-w-md p-0 overflow-hidden" showCloseButton={false}>
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#9e4733] to-[#c4664f]" />

        <div className="px-6 pt-5 pb-2">
          <DialogHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-sm bg-[#fdf2f0] border border-[#fad4cf] flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-[#9e4733]" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
                  <span>•</span> DANGER ZONE
                </div>
                <DialogTitle className="font-serif text-lg font-bold text-[#1a1918] mt-0.5">
                  {step === 'warn' ? 'Delete Client' : 'Confirm Deletion'}
                </DialogTitle>
              </div>
            </div>

            {step === 'warn' ? (
              <DialogDescription className="text-sm text-[#55524d] leading-relaxed mt-2">
                You are about to permanently delete <span className="font-semibold text-[#1a1918]">{clientName}</span>.
                This action will remove:
                <ul className="mt-2 space-y-1 text-[#73706b]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#9e4733] mt-0.5 text-xs">•</span>
                    All call records and analytics
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#9e4733] mt-0.5 text-xs">•</span>
                    All assigned voice agents
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#9e4733] mt-0.5 text-xs">•</span>
                    Their Stripe customer and subscription
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#9e4733] mt-0.5 text-xs">•</span>
                    Their authentication account
                  </li>
                </ul>
                <p className="mt-3 text-xs font-medium text-[#9e4733]">
                  This action cannot be undone.
                </p>
              </DialogDescription>
            ) : (
              <DialogDescription className="text-sm text-[#55524d] leading-relaxed mt-2">
                <p>To confirm the deletion of <span className="font-semibold text-[#1a1918]">{clientName}</span>, type <span className="font-mono font-bold text-[#9e4733] bg-[#fdf2f0] px-1.5 py-0.5 rounded-sm border border-[#fad4cf]">DELETE</span> below:</p>
                <div className="mt-3">
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm font-mono tracking-wider text-center"
                    autoFocus
                  />
                </div>
              </DialogDescription>
            )}
          </DialogHeader>
        </div>

        <DialogFooter className="bg-[#faf8f5] border-t border-[#e6e2d6] px-6 py-4 -mx-0 -mb-0 rounded-b-sm flex gap-3 sm:flex-row">
          <DialogClose
            render={
              <Button
                variant="outline"
                className="flex-1 border-[#e6e2d6] bg-white text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10"
              />
            }
          >
            Cancel
          </DialogClose>
          <Button
            onClick={handleProceed}
            disabled={!canProceed}
            className="flex-1 bg-[#9e4733] hover:bg-[#833827] text-white rounded-sm text-xs font-semibold tracking-wider uppercase h-10 shadow-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === 'warn' && requireTyping ? 'Continue' : 'Delete Permanently'}
            <span className="ml-1.5 text-white/60 text-sm">•</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
