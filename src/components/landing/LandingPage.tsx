'use client'

import { useState } from 'react'
import Navbar from './Navbar'
import HeroSection from './HeroSection'
import AudioDemoSection from './AudioDemoSection'
import BreakEvenCalculator from './BreakEvenCalculator'
import FeatureGrid from './FeatureGrid'
import CostComparison from './CostComparison'
import HowItWorks from './HowItWorks'
import dynamic from 'next/dynamic'
import Footer from './Footer'

const ConsultationModal = dynamic(() => import('./ConsultationModal'), { ssr: false })

export default function LandingPage() {
  const [isDemoOpen, setIsDemoOpen] = useState(false)
  const [demoInitialTab, setDemoInitialTab] = useState<'instant' | 'schedule'>('instant')

  const handleOpenDemo = (tab?: 'instant' | 'schedule') => {
    setDemoInitialTab(tab || 'instant')
    setIsDemoOpen(true)
  }

  const handleCloseDemo = () => {
    setIsDemoOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#f6f4f0] text-[#1a1918] flex flex-col selection:bg-[#9e4733] selection:text-white">
      {/* Top Navbar with Discrete Sign In */}
      <Navbar onOpenDemo={() => handleOpenDemo('instant')} />

      {/* Main High-Converting Page Sections */}
      <main className="flex-1">
        <HeroSection onOpenDemo={() => handleOpenDemo('instant')} />
        <AudioDemoSection />
        {/* Placed immediately below AudioDemoSection as requested */}
        <BreakEvenCalculator onOpenDemo={() => handleOpenDemo('instant')} />
        <FeatureGrid />
        <CostComparison onOpenDemo={() => handleOpenDemo('schedule')} />
        <HowItWorks onOpenDemo={() => handleOpenDemo('schedule')} />
      </main>

      {/* Footer */}
      <Footer onOpenDemo={() => handleOpenDemo('schedule')} />

      {/* Live Demo Request Modal */}
      {isDemoOpen && (
        <ConsultationModal
          isOpen={isDemoOpen}
          onClose={handleCloseDemo}
          initialTab={demoInitialTab}
        />
      )}
    </div>
  )
}
