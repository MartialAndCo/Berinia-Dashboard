'use client'

import { Zap, Database, HeartHandshake, PhoneForwarded, Globe2, ShieldCheck } from 'lucide-react'

const features = [
  {
    icon: Zap,
    tag: 'Ultra-Low Latency',
    title: 'Sub-450ms Turn Taking',
    description:
      'Human conversations flow in milliseconds. Our optimized voice pipeline eliminates awkward pauses, robotic silences, and clunky conversational collisions.',
  },
  {
    icon: Database,
    tag: 'Bi-Directional Sync',
    title: 'Live CRM & Tool Calling',
    description:
      'Agents query databases, verify customer identities, update CRM records, and book calendar slots in real time during the call.',
  },
  {
    icon: HeartHandshake,
    tag: 'Emotion Intelligence',
    title: 'Real-Time Sentiment Scoring',
    description:
      'Voice models dynamically assess caller inflection and frustration, automatically tailoring empathy and conversational tone on the fly.',
  },
  {
    icon: PhoneForwarded,
    tag: 'Failsafe Protocol',
    title: 'Zero-Interruption Warm Handoff',
    description:
      'When an issue requires human judgment, callers are seamlessly transferred with an instant synthesized briefing so customers never repeat themselves.',
  },
  {
    icon: Globe2,
    tag: 'Global Telephony',
    title: 'Multi-Lingual & Global SIP',
    description:
      'Connect your existing Twilio, Vonage, or private SIP trunks. Deploy native accents across English, Spanish, French, German, and 30+ languages.',
  },
  {
    icon: ShieldCheck,
    tag: 'Enterprise Guardrails',
    title: 'Zero Hallucination Architecture',
    description:
      'Strict deterministic boundaries ensure agents strictly adhere to compliance standards, approved knowledge bases, and regulatory guidelines.',
  },
]

export default function FeatureGrid() {
  return (
    <section id="solutions" className="py-20 md:py-28 bg-[#f6f4f0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
            <span>•</span> Engineered for Reliability
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1918]">
            Architected for Enterprise Voice Operations
          </h2>
          <p className="text-sm sm:text-base text-[#66635e]">
            Everything required to replace or augment your contact center with intelligent, compliant, and always-on autonomous telephony.
          </p>
        </div>

        {/* 3x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div
                key={idx}
                className="bg-[#ffffff] border border-[#e6e2d6] rounded-sm p-7 sm:p-8 space-y-4 hover:border-[#1a1918] transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-sm bg-[#faf9f7] border border-[#e2dfd8] flex items-center justify-center text-[#1a1918]">
                      <Icon className="w-5 h-5 text-[#1a1918]" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9e4733] bg-[#fdf2f0] px-2.5 py-1 rounded-xs">
                      {feature.tag}
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-[#1a1918]">
                    {feature.title}
                  </h3>

                  <p className="text-sm text-[#66635e] leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#f0ede6] flex items-center text-[11px] font-semibold uppercase tracking-wider text-[#85817a]">
                  <span>Production Ready</span>
                  <span className="ml-auto text-[#9e4733]">•</span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
