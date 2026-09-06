'use client'

import { ArrowRight, PhoneCall, Settings, CalendarCheck, HelpCircle } from 'lucide-react'

interface HowItWorksProps {
  onOpenDemo: () => void
}

const faqs = [
  {
    q: 'Do I have to change my existing business phone number?',
    a: 'No! You keep your current phone number. You simply set up standard call forwarding to your BerinAgents line whenever you are busy, on another call, or closed for the day.',
  },
  {
    q: 'What happens if a caller asks something the AI doesn’t know?',
    a: 'Your agent will never make things up. If someone asks a question outside its guidelines, it politely takes down their details, notes their question, and sends you an urgent recap—or warm-transfers the call to you.',
  },
  {
    q: 'Can I test my agent before it goes live with real customers?',
    a: 'Yes, 100%. We provide you with a private direct test number so you and your team can call it, test different accents, ask tricky questions, and verify its behavior before pointing live customer calls to it.',
  },
  {
    q: 'What happens if 5 people call my business at the exact same time?',
    a: 'A human receptionist can only answer one call at a time, sending the rest to voicemail or hold. BerinAgents handles unlimited simultaneous calls—every single caller gets answered immediately on Ring 1.',
  },
]

export default function HowItWorks({ onOpenDemo }: HowItWorksProps) {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-[#f0ede6] border-t border-[#e6e2d6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase">
            <span>•</span> Fast, Effortless Onboarding
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1918]">
            Up &amp; Running in 3 Simple Steps
          </h2>
          <p className="text-sm sm:text-base text-[#66635e]">
            No complicated software to learn, no telecom contracts, and zero hardware to install.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-20">
          <div className="bg-[#ffffff] border border-[#e6e2d6] rounded-sm p-7 space-y-4 shadow-sm">
            <div className="w-10 h-10 rounded-sm bg-[#1a1918] text-white flex items-center justify-center font-serif text-lg font-bold">
              1
            </div>
            <h3 className="font-serif text-xl font-bold text-[#1a1918]">
              We Learn Your Business
            </h3>
            <p className="text-sm text-[#66635e] leading-relaxed">
              Tell us about your services, pricing guidelines, service area, and scheduling availability. We customize your agent’s voice and conversational script.
            </p>
          </div>

          <div className="bg-[#ffffff] border border-[#e6e2d6] rounded-sm p-7 space-y-4 shadow-sm">
            <div className="w-10 h-10 rounded-sm bg-[#1a1918] text-white flex items-center justify-center font-serif text-lg font-bold">
              2
            </div>
            <h3 className="font-serif text-xl font-bold text-[#1a1918]">
              Forward Your Calls
            </h3>
            <p className="text-sm text-[#66635e] leading-relaxed">
              Keep your existing business number. Set up simple call forwarding for when you are on jobs, after 5 PM, or when lines are busy. It takes 60 seconds.
            </p>
          </div>

          <div className="bg-[#ffffff] border border-[#e6e2d6] rounded-sm p-7 space-y-4 shadow-sm">
            <div className="w-10 h-10 rounded-sm bg-[#9e4733] text-white flex items-center justify-center font-serif text-lg font-bold">
              3
            </div>
            <h3 className="font-serif text-xl font-bold text-[#1a1918]">
              Never Miss a Customer
            </h3>
            <p className="text-sm text-[#66635e] leading-relaxed">
              Your agent answers on Ring 1, books appointments directly onto your calendar, and sends you instant text and email summaries after every call.
            </p>
          </div>
        </div>

        {/* Common Questions / FAQs */}
        <div className="max-w-4xl mx-auto bg-[#ffffff] border border-[#e6e2d6] rounded-sm p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.02)] mb-14">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#9e4733]">
              Frequently Asked Questions
            </span>
            <h3 className="font-serif text-2xl font-bold text-[#1a1918]">
              Everything Business Owners Ask Us
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {faqs.map((faq, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="font-semibold text-sm text-[#1a1918] flex items-start gap-2">
                  <span className="text-[#9e4733] font-serif font-bold">Q.</span>
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-[#66635e] leading-relaxed pl-5">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA Box */}
        <div className="max-w-4xl mx-auto bg-[#1a1918] text-[#f6f4f0] rounded-sm p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="font-serif text-2xl font-bold text-white">
              Ready to stop losing paying jobs to voicemail?
            </h3>
            <p className="text-xs text-[#a8a49c]">
              Schedule a 15-minute live demo. We will show you how an agent handles calls for your specific industry.
            </p>
          </div>

          <button
            onClick={onOpenDemo}
            className="bg-[#ffffff] hover:bg-[#eae6dc] text-[#1a1918] text-xs font-semibold tracking-wider uppercase px-7 py-3.5 rounded-sm transition-all shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <span>Request Your Demo</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#9e4733]" />
          </button>
        </div>

      </div>
    </section>
  )
}
