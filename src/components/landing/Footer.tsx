'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'

interface FooterProps {
  onOpenConsultation: () => void
}

export default function Footer({ onOpenConsultation }: FooterProps) {
  return (
    <footer className="bg-[#1a1918] text-[#f6f4f0] pt-16 pb-12 border-t border-[#2d2d2d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Pre-Footer Call to Action Banner */}
        <div className="border-b border-[#33312e] pb-14 mb-14 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h3 className="font-serif text-3xl font-bold text-[#ffffff]">
              Ready to automate your telephone operations?
            </h3>
            <p className="text-sm text-[#a8a49c]">
              Deploy latency-free voice AI agents customized to your exact enterprise knowledge base.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenConsultation}
              className="bg-[#ffffff] hover:bg-[#eae6dc] text-[#1a1918] text-xs font-semibold tracking-wider uppercase px-6 py-3 rounded-sm transition-all cursor-pointer"
            >
              Book Consultation
            </button>
            <Link
              href="/login"
              className="border border-[#474440] hover:border-[#ffffff] text-[#ffffff] text-xs font-semibold tracking-wider uppercase px-6 py-3 rounded-sm transition-all flex items-center gap-1.5"
            >
              <span>Client Portal</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
            </Link>
          </div>
        </div>

        {/* 4-Column Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-14 text-xs">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Image
              src="/logo-horizontal-white.png"
              alt="BerinAgents"
              width={180}
              height={36}
              className="h-8 w-auto object-contain opacity-95"
            />
            <p className="text-[#a8a49c] leading-relaxed text-xs">
              Enterprise voice AI agents, automated calling, and real-time intelligence analytics.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#9e4733]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[#a8a49c]">SIP Trunks: All Systems Operational</span>
            </div>
          </div>

          {/* Column: Platform */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#9e4733]">
              Platform
            </h4>
            <ul className="space-y-2 text-[#b0aba2]">
              <li>
                <a href="#solutions" className="hover:text-white transition-colors">
                  Autonomous Capabilities
                </a>
              </li>
              <li>
                <a href="#voice-demo" className="hover:text-white transition-colors">
                  Interactive Audio Showcase
                </a>
              </li>
              <li>
                <a href="#portal-preview" className="hover:text-white transition-colors">
                  Client Intelligence Suite
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-white transition-colors">
                  Telephony SLA & Latency
                </a>
              </li>
            </ul>
          </div>

          {/* Column: Client Access */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#9e4733]">
              Client Access
            </h4>
            <ul className="space-y-2 text-[#b0aba2]">
              <li>
                <Link href="/login" className="hover:text-white transition-colors flex items-center gap-1">
                  <span>Sign In to Dashboard</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/forgot-password" className="hover:text-white transition-colors">
                  Reset Account Password
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">
                  Admin Console
                </Link>
              </li>
              <li>
                <button
                  onClick={onOpenConsultation}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Request Telephony Provisioning
                </button>
              </li>
            </ul>
          </div>

          {/* Column: Trust & Compliance */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#9e4733]">
              Compliance & Security
            </h4>
            <ul className="space-y-2 text-[#b0aba2]">
              <li>
                <span className="text-[#a8a49c]">SOC2 Type II Standard</span>
              </li>
              <li>
                <span className="text-[#a8a49c]">HIPAA Compliant Data Handling</span>
              </li>
              <li>
                <span className="text-[#a8a49c]">End-to-End Encryption (AES-256)</span>
              </li>
              <li>
                <span className="text-[#a8a49c]">Strict Zero-Hallucination Guardrails</span>
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
            <span className="hover:text-white cursor-pointer">Carrier Compliance</span>
          </div>
        </div>

      </div>
    </footer>
  )
}
