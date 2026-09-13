"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does this make my business more profitable?",
      a: "Most businesses lose thousands every month because high-intent callers don't leave voicemails—they hang up and call your competitor immediately. By answering 100% of calls instantly on ring one, answering client questions, and booking appointments directly into your calendar 24/7, we turn lost calls into paying clients.",
    },
    {
      q: "Will callers know or hang up thinking it's an annoying phone menu?",
      a: "No. There are zero robotic 'press 1 for sales' menus. It speaks with the natural tone, friendly inflection, and warmth of your best staff member. It understands normal human conversation, handles interruptions gracefully, and books clients immediately without hold times.",
    },
    {
      q: "Do I or my staff have to do any technical setup or maintenance?",
      a: "Zero. We handle 100% of the build, testing, calendar integration, and continuous monthly management. You don't have to learn new software, manage servers, or hire an IT person. We hand you a turnkey booking department ready to take calls in 7 days.",
    },
    {
      q: "Do I have to change my business phone number?",
      a: "No! You keep your exact existing business phone number. You simply set up automatic call forwarding from your current provider (AT&T, Verizon, RingCentral, Grasshopper, etc.) to your dedicated line. It takes 5 minutes to set up and your clients won't notice any change.",
    },
    {
      q: "What kind of return on investment (ROI) should I expect?",
      a: "Our clients typically see an immediate 5x to 10x ROI on their monthly investment. Because we answer every call on ring one 24/7, high-intent buyers who would have otherwise called a competitor are captured and booked directly onto your calendar.",
    },
  ];

  return (
    <section className="w-full py-16">
      <div className="max-w-4xl mx-auto px-4">
        {/* Pre-FAQ CTA Button */}
        <div className="text-center mb-16">
          <Link
            href="/opt-in/book"
            className="inline-block bg-[#0066ff] hover:bg-blue-600 text-white font-bold text-lg md:text-xl px-12 py-4 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 active:scale-[0.99]"
          >
            Get Started Now!
          </Link>
        </div>

        {/* Social Proof Mini Bar */}
        <div className="text-center mb-16">
          <p className="text-gray-900 font-bold text-base md:text-lg mb-6">
            Trusted by 100+ Fast-Growing Businesses & Brands:
          </p>
          <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap opacity-75">
            <span className="font-serif font-bold text-lg text-gray-800">
              Apex Health
            </span>
            <span className="font-mono font-bold text-lg text-gray-800">
              MEDMARKET
            </span>
            <span className="font-sans font-extrabold text-lg text-gray-800">
              HYDRAGUN
            </span>
            <span className="font-serif italic font-semibold text-lg text-gray-800">
              NuStrips
            </span>
            <span className="font-sans font-bold text-lg text-gray-800">
              ovrload
            </span>
          </div>
        </div>

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-blue-600 font-semibold text-sm md:text-base tracking-wide">
            Got Questions?
          </span>
          <h2 className="text-gray-900 text-3xl md:text-4xl lg:text-[40px] font-extrabold tracking-tight mt-3 leading-tight">
            Frequently Asked Questions
          </h2>
        </div>

        {/* Accordion List */}
        <div className="mt-12 space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-[#f8f9fa] rounded-2xl border border-gray-200/70 overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full py-5 px-6 md:px-8 text-left flex items-center justify-between gap-4 font-bold text-gray-900 text-base md:text-lg cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 md:px-8 pb-6 text-gray-600 text-sm md:text-base leading-relaxed border-t border-gray-200/40 pt-4 animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
