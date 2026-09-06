'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, ArrowUpRight } from 'lucide-react'

interface NavbarProps {
  onOpenConsultation: () => void
}

export default function Navbar({ onOpenConsultation }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-[#f6f4f0]/92 backdrop-blur-md border-b border-[#e6e2d6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
          : 'bg-transparent border-b border-[#e6e2d6]/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo-horizontal-black.png"
              alt="BerinAgents"
              width={180}
              height={36}
              priority
              className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:opacity-90"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-[#5c5852]">
            <a
              href="#solutions"
              className="hover:text-[#1a1918] transition-colors"
            >
              Capabilities
            </a>
            <a
              href="#voice-demo"
              className="hover:text-[#1a1918] transition-colors flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#9e4733] animate-pulse" />
              Live Demos
            </a>
            <a
              href="#portal-preview"
              className="hover:text-[#1a1918] transition-colors"
            >
              Client Portal
            </a>
            <a
              href="#security"
              className="hover:text-[#1a1918] transition-colors"
            >
              Enterprise Security
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold tracking-wider uppercase text-[#1a1918] hover:text-[#9e4733] px-3 py-2 transition-colors flex items-center gap-1"
            >
              Client Sign In
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
            </Link>

            <button
              onClick={onOpenConsultation}
              className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] text-xs font-semibold tracking-wider uppercase px-5 py-2.5 rounded-sm transition-all shadow-none flex items-center gap-2 group cursor-pointer"
            >
              <span>Book Consultation</span>
              <span className="text-[#9e4733] group-hover:translate-x-0.5 transition-transform">•</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/login"
              className="text-xs font-semibold tracking-wider uppercase text-[#1a1918] px-2.5 py-1.5"
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#1a1918] hover:bg-[#eae6dc] rounded-sm transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#e6e2d6] bg-[#ffffff] px-4 pt-3 pb-6 space-y-4 shadow-lg">
          <div className="flex flex-col space-y-3 text-sm font-medium text-[#5c5852]">
            <a
              href="#solutions"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm transition-colors"
            >
              Capabilities
            </a>
            <a
              href="#voice-demo"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm transition-colors flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#9e4733]" />
              Live Demos
            </a>
            <a
              href="#portal-preview"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm transition-colors"
            >
              Client Portal
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm transition-colors"
            >
              Enterprise Security
            </a>
          </div>

          <div className="pt-2 border-t border-[#e6e2d6] flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-xs font-semibold tracking-wider uppercase border border-[#e2dfd8] rounded-sm text-[#1a1918] bg-[#f6f4f0]"
            >
              Client Portal Sign In
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                onOpenConsultation()
              }}
              className="w-full text-center py-2.5 text-xs font-semibold tracking-wider uppercase bg-[#1a1918] text-[#f6f4f0] rounded-sm"
            >
              Book Consultation
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
