'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

interface FooterProps {
  onOpenDemo: () => void
}

export default function Footer({ onOpenDemo }: FooterProps) {
  return (
    <footer className="bg-[#1a1918] text-[#f6f4f0] pt-16 pb-12 border-t border-[#2d2d2d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Simple Call to Action Banner */}
        <div className="border-b border-[#33312e] pb-12 mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#ffffff]">
              Stop letting missed calls go to your competitors.
            </h3>
            <p className="text-sm text-[#a8a49c]">
              Answer 100% of your customer calls, 24/7/365, without hiring expensive staff.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenDemo}
              className="bg-[#ffffff] hover:bg-[#eae6dc] text-[#1a1918] text-xs font-semibold tracking-wider uppercase px-6 py-3 rounded-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Request a Demo</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#9e4733]" />
            </button>
            <Link
              href="/login"
              className="border border-[#474440] hover:border-[#ffffff] text-[#ffffff] text-xs font-semibold tracking-wider uppercase px-6 py-3 rounded-sm transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* 3-Column Clean Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 text-xs">
          {/* Brand Info */}
          <div className="space-y-3">
            <Image
              src="/logo-horizontal-white.png"
              alt="BerinAgents"
              width={170}
              height={34}
              className="h-7 w-auto object-contain opacity-95"
            />
            <p className="text-[#a8a49c] leading-relaxed text-xs max-w-xs">
              24/7 Voice AI agents that answer every call, book jobs on your calendar, and capture every customer for your business.
            </p>
          </div>

          {/* Column: Navigation */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#9e4733]">
              Navigation
            </h4>
            <ul className="space-y-2 text-[#b0aba2]">
              <li>
                <a href="#why-us" className="hover:text-white transition-colors">
                  Why BerinAgents
                </a>
              </li>
              <li>
                <a href="#voice-demos" className="hover:text-white transition-colors">
                  Hear Real Call Audio
                </a>
              </li>
              <li>
                <a href="#comparison" className="hover:text-white transition-colors">
                  Cost Comparison &amp; ROI
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
            </ul>
          </div>

          {/* Column: Access */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#9e4733]">
              Account
            </h4>
            <ul className="space-y-2 text-[#b0aba2]">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign In to Dashboard
                </Link>
              </li>
              <li>
                <Link href="/forgot-password" className="hover:text-white transition-colors">
                  Reset Password
                </Link>
              </li>
              <li>
                <button
                  onClick={onOpenDemo}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Schedule an Onboarding Call
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal Copyright */}
        <div className="pt-8 border-t border-[#33312e] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#807c74]">
          <div>
            &copy; {new Date().getFullYear()} BerinAgents Inc. All rights reserved.
          </div>
          <div className="flex items-center space-x-6">
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer">Terms of Service</span>
            <Link href="/login" className="hover:text-white">Sign In</Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
