'use client'

import { useState } from 'react'
import Navbar from './Navbar'
import HeroSection from './HeroSection'
import AudioDemoSection from './AudioDemoSection'
import FeatureGrid from './FeatureGrid'
import DashboardTeaser from './DashboardTeaser'
import EnterpriseSecurity from './EnterpriseSecurity'
import Footer from './Footer'
import ConsultationModal from './ConsultationModal'

export default function LandingPage() {
  const [isConsultationOpen, setIsConsultationOpen] = useState(false)

  const handleOpenConsultation = () => {
    setIsConsultationOpen(true)
  }

  const handleCloseConsultation = () => {
    setIsConsultationOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#f6f4f0] text-[#1a1918] flex flex-col selection:bg-[#9e4733] selection:text-white">
      {/* Top Navbar */}
      <Navbar onOpenConsultation={handleOpenConsultation} />

      {/* Main Page Flow */}
      <main className="flex-1">
        <HeroSection onOpenConsultation={handleOpenConsultation} />
        <AudioDemoSection />
        <FeatureGrid />
        <DashboardTeaser />
        <EnterpriseSecurity onOpenConsultation={handleOpenConsultation} />
      </main>

      {/* Footer */}
      <Footer onOpenConsultation={handleOpenConsultation} />

      {/* Enterprise Consultation Request Modal */}
      <ConsultationModal
        isOpen={isConsultationOpen}
        onClose={handleCloseConsultation}
      />
    </div>
  )
}
