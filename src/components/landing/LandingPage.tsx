'use client'

import { useState } from 'react'
import Navbar from './Navbar'
import HeroSection from './HeroSection'
import FeatureGrid from './FeatureGrid'
import AudioDemoSection from './AudioDemoSection'
import CostComparison from './CostComparison'
import HowItWorks from './HowItWorks'
import Footer from './Footer'
import ConsultationModal from './ConsultationModal'

export default function LandingPage() {
  const [isDemoOpen, setIsDemoOpen] = useState(false)

  const handleOpenDemo = () => {
    setIsDemoOpen(true)
  }

  const handleCloseDemo = () => {
    setIsDemoOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#f6f4f0] text-[#1a1918] flex flex-col selection:bg-[#9e4733] selection:text-white">
      {/* Top Navbar with Discrete Sign In */}
      <Navbar onOpenDemo={handleOpenDemo} />

      {/* Main High-Converting Page Sections */}
      <main className="flex-1">
        <HeroSection onOpenDemo={handleOpenDemo} />
        <AudioDemoSection />
        <FeatureGrid />
        <CostComparison onOpenDemo={handleOpenDemo} />
        <HowItWorks onOpenDemo={handleOpenDemo} />
      </main>

      {/* Footer */}
      <Footer onOpenDemo={handleOpenDemo} />

      {/* Live Demo Request Modal */}
      <ConsultationModal
        isOpen={isDemoOpen}
        onClose={handleCloseDemo}
      />
    </div>
  )
}
