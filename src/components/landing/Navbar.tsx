'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, ArrowRight } from 'lucide-react'

interface NavbarProps {
  onOpenDemo: () => void
}

export default function Navbar({ onOpenDemo }: NavbarProps) {
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
          ? 'bg-[#f6f4f0]/95 backdrop-blur-md border-b border-[#e6e2d6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
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

          {/* Clean Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-[#5c5852]">
            <a
              href="#why-us"
              className="hover:text-[#1a1918] transition-colors"
            >
              Why BerinAgents
            </a>
            <a
              href="#voice-demos"
              className="hover:text-[#1a1918] transition-colors flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#9e4733] animate-pulse" />
              Hear Live Calls
            </a>
            <a
              href="#calculator"
              className="hover:text-[#1a1918] transition-colors"
            >
              Cost &amp; ROI
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#1a1918] transition-colors"
            >
              How It Works
            </a>
          </nav>

          {/* Action Area: Simple Discrete Sign In + Request Demo */}
          <div className="hidden md:flex items-center gap-5">
            <Link
              href="/login"
              className="text-xs font-semibold tracking-wider uppercase text-[#66635e] hover:text-[#1a1918] transition-colors"
            >
              Sign In
            </Link>

            <button
              onClick={onOpenDemo}
              className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] text-xs font-semibold tracking-wider uppercase px-5 py-2.5 rounded-sm transition-all shadow-none flex items-center gap-2 group cursor-pointer"
            >
              <span>Request a Demo</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#9e4733]" />
            </button>
          </div>

          {/* Mobile Navigation Trigger */}
          <div className="flex md:hidden items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold tracking-wider uppercase text-[#66635e] px-2 py-1"
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
              href="#why-us"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm transition-colors"
            >
              Why BerinAgents
            </a>
            <a
              href="#voice-demos"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm transition-colors flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#9e4733]" />
              Hear Live Calls
            </a>
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm transition-colors"
            >
              Cost &amp; ROI
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-[#1a1918] hover:bg-[#f6f4f0] rounded-sm transition-colors"
            >
              How It Works
            </a>
          </div>

          <div className="pt-2 border-t border-[#e6e2d6] flex flex-col gap-2.5">
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                onOpenDemo()
              }}
              className="w-full text-center py-3 text-xs font-semibold tracking-wider uppercase bg-[#1a1918] text-[#f6f4f0] rounded-sm flex items-center justify-center gap-2"
            >
              <span>Request a Demo</span>
              <span className="text-[#9e4733]">•</span>
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
