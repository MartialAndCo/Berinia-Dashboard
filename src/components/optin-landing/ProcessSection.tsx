"use client";

import Link from "next/link";
import { Target, Rocket, Phone, Zap } from "lucide-react";

export default function ProcessSection() {
  const steps = [
    {
      icon: <Target className="w-6 h-6 text-blue-500 stroke-[2]" />,
      title: "1. Audit & Action Plan",
      text: "We pinpoint where you lose calls and craft the exact booking flow to turn everyday callers into paying clients.",
    },
    {
      icon: <Rocket className="w-6 h-6 text-blue-500 stroke-[2]" />,
      title: "2. Turnkey Setup",
      text: "We connect everything to your calendar in 7 days. You don't have to manage any tech or change your phone number.",
    },
    {
      icon: <Phone className="w-6 h-6 text-blue-500 stroke-[2]" />,
      title: "3. Calendar Fills Up",
      text: "Calls are answered on ring one 24/7 with weekly reports showing every captured booking and dollar earned.",
    },
    {
      icon: <Zap className="w-6 h-6 text-blue-500 stroke-[2]" />,
      title: "4. Ongoing Dedicated Scaling",
      text: "We manage and fine-tune your system continuously every month, keeping your calendar full and your phones covered.",
    },
  ];

  return (
    <section className="w-full py-14">
      <div className="max-w-5xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-blue-600 font-semibold text-sm tracking-wide">
            Our Process
          </span>
          <h2 className="text-gray-900 text-3xl md:text-4xl font-extrabold tracking-tight mt-2 leading-tight">
            How Our Dedicated Call-Answering Service Works
          </h2>
        </div>

        {/* 4 Process Steps (2x2 Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 max-w-4xl mx-auto mt-12">
          {steps.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                {step.icon}
              </div>
              <h3 className="text-gray-900 font-bold text-lg mb-1.5">
                {step.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed max-w-sm">
                {step.text}
              </p>
            </div>
          ))}
        </div>

        {/* Centered CTA Button */}
        <div className="mt-12 text-center">
          <Link
            href="/opt-in/book"
            className="inline-block bg-[#0066ff] hover:bg-blue-600 text-white font-bold text-lg md:text-xl px-12 py-4 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 active:scale-[0.99]"
          >
            Get Started Now!
          </Link>
        </div>
      </div>
    </section>
  );
}
