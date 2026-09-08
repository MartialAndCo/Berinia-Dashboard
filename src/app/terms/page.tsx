import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service | BerinAgents',
  description: 'Terms of Service and platform usage terms for BerinAgents AI Voice Platform.'
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f6f4f0] text-[#1a1918]">
      <header className="border-b border-[#e6e2d6] bg-[#f6f4f0]/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#73706b] hover:text-[#1a1918] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <Link href="/">
            <Image
              src="/logo-horizontal-black.png"
              alt="BerinAgents"
              width={140}
              height={28}
              className="h-7 w-auto object-contain"
            />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">
        <div className="space-y-2 border-b border-[#e6e2d6] pb-6">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
            <span>•</span> Legal &amp; Governance
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1918]">
            Terms of Service
          </h1>
          <p className="text-xs text-[#73706b]">
            Last updated: September 8, 2026
          </p>
        </div>

        <section className="space-y-4 text-sm text-[#474440] leading-relaxed">
          <h2 className="font-serif text-xl font-bold text-[#1a1918]">1. Acceptance of Terms</h2>
          <p>
            By accessing the BerinAgents platform, requesting an AI demonstration, or subscribing to our AI voice receptionist services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
          </p>

          <h2 className="font-serif text-xl font-bold text-[#1a1918] pt-4">2. Description of Services</h2>
          <p>
            BerinAgents provides multi-turn conversational AI agents capable of answering phone calls, qualifying customer leads, answering business questions, and booking appointments into connected calendars.
          </p>

          <h2 className="font-serif text-xl font-bold text-[#1a1918] pt-4">3. Customer Responsibilities &amp; Compliance</h2>
          <p>
            You agree to use our voice services in compliance with all applicable local, national, and international laws, including telecommunications regulations (e.g., TCPA, TSR, and applicable call recording disclosure requirements in your jurisdiction). You must obtain any necessary consents before recording customer conversations if required by law.
          </p>

          <h2 className="font-serif text-xl font-bold text-[#1a1918] pt-4">4. Subscriptions, Billing &amp; Usage</h2>
          <p>
            Service fees consist of monthly recurring subscriptions and metered telephony/AI usage fees per minute, as agreed in your service plan. All fees are processed automatically via Stripe. Subscriptions renew on a monthly basis unless cancelled prior to the renewal date.
          </p>

          <h2 className="font-serif text-xl font-bold text-[#1a1918] pt-4">5. Service Availability &amp; Escalation</h2>
          <p>
            While we strive for 99.9% uptime and low-latency voice responses, AI phone systems depend on external telecommunications networks and third-party infrastructure. BerinAgents provides configurable call forwarding and fallback rules to transfer calls to human staff whenever an inquiry falls outside the AI model&apos;s configured knowledge base.
          </p>

          <h2 className="font-serif text-xl font-bold text-[#1a1918] pt-4">6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, BerinAgents shall not be liable for indirect, incidental, punitive, or consequential damages resulting from missed calls, telecommunication outages, or scheduling discrepancies.
          </p>

          <h2 className="font-serif text-xl font-bold text-[#1a1918] pt-4">7. Contact &amp; Inquiries</h2>
          <p>
            If you have questions regarding these terms, contact us at:
            <br />
            <strong>BerinAgents Inc.</strong>
            <br />
            Email: <a href="mailto:contact@berinagents.com" className="underline font-medium text-[#1a1918]">contact@berinagents.com</a>
          </p>
        </section>
      </main>
    </div>
  )
}
