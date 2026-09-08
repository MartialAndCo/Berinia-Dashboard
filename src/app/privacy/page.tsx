import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy | BerinAgents',
  description: 'Privacy Policy and data protection terms for BerinAgents AI Voice Platform.'
}

export default function PrivacyPage() {
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
            <span>•</span> Legal &amp; Data Protection
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1918]">
            Privacy Policy
          </h1>
          <p className="text-xs text-[#73706b]">
            Last updated: September 8, 2026
          </p>
        </div>

        <section className="space-y-4 text-sm text-[#474440] leading-relaxed">
          <h2 className="font-serif text-xl font-bold text-[#1a1918]">1. Introduction</h2>
          <p>
            BerinAgents (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides AI voice receptionist and customer communication services. We are committed to protecting your personal data and ensuring transparent communication about how your information is collected, used, and secured.
          </p>

          <h2 className="font-serif text-xl font-bold text-[#1a1918] pt-4">2. Information We Collect</h2>
          <p>
            When you request a demo, create an account, or interact with our voice receptionists, we may collect:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Contact Information:</strong> Full name, business email address, phone number, and company name.</li>
            <li><strong>Voice Call Data:</strong> Transcripts, audio recordings, call duration, timestamp, and AI call summaries generated during inbound or outbound phone interactions.</li>
            <li><strong>Technical Information:</strong> IP address, browser type, device information, and usage analytics when interacting with our client portal.</li>
          </ul>

          <h2 className="font-serif text-xl font-bold text-[#1a1918] pt-4">3. How We Use Your Information</h2>
          <p>
            We process collected information to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Deliver real-time phone receptionist and appointment scheduling services.</li>
            <li>Trigger demonstration calls upon your explicit request.</li>
            <li>Provide real-time analytics, call recordings, and billing information in your client portal.</li>
            <li>Ensure service quality, prevent fraudulent abuse, and improve natural conversational speech accuracy.</li>
          </ul>

          <h2 className="font-serif text-xl font-bold text-[#1a1918] pt-4">4. Data Confidentiality &amp; Security</h2>
          <p>
            We strictly enforce enterprise data privacy standards. Your data and client phone calls are <strong>100% confidential</strong>:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>We do not sell, rent, or monetize your contact or business data to third parties.</li>
            <li>Call recordings and transcripts are encrypted in transit (TLS 1.3) and at rest (AES-256).</li>
            <li>Subprocessors (telephony providers, LLM infrastructure, payment processors) are bound by strict Data Processing Agreements complying with GDPR and international data standards.</li>
          </ul>

          <h2 className="font-serif text-xl font-bold text-[#1a1918] pt-4">5. Your Rights</h2>
          <p>
            You have the right to access, rectify, export, or request the permanent deletion of your personal data and recorded call logs at any time. To exercise your rights, contact our data protection team at <a href="mailto:contact@berinagents.com" className="underline font-medium text-[#1a1918]">contact@berinagents.com</a>.
          </p>

          <h2 className="font-serif text-xl font-bold text-[#1a1918] pt-4">6. Contact Us</h2>
          <p>
            For any questions or concerns regarding this Privacy Policy, please contact:
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
