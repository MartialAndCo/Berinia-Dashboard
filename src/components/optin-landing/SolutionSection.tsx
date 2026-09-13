"use client";

import { Check, ThumbsUp, DollarSign } from "lucide-react";

export default function SolutionSection() {
  const solutions = [
    {
      icon: (
        <div className="w-12 h-12 rounded-full bg-[#10b981] text-white flex items-center justify-center mb-5 shadow-sm">
          <Check className="w-7 h-7 stroke-[3]" />
        </div>
      ),
      title: "100% Done-For-You In 7 Days",
      text: "Zero software to learn. We handle the entire setup from A to Z so your phone starts booking paying clients within 7 days.",
    },
    {
      icon: (
        <div className="w-12 h-12 rounded-full bg-[#10b981] text-white flex items-center justify-center mb-5 shadow-sm">
          <ThumbsUp className="w-6 h-6 fill-white" />
        </div>
      ),
      title: "Closes Real Bookings 24/7",
      text: "Acts like your top front-desk staff. Answers on ring one at 9 PM on Sunday just like 2 PM on Tuesday. Never calls in sick.",
    },
    {
      icon: (
        <div className="w-12 h-12 rounded-full bg-[#10b981] text-white flex items-center justify-center mb-5 shadow-sm">
          <DollarSign className="w-7 h-7 stroke-[3]" />
        </div>
      ),
      title: "Infinite Scale & Zero Lost Deals",
      text: "Handles unlimited calls simultaneously with zero busy lines. Every high-ticket opportunity is captured and scheduled immediately.",
    },
  ];

  return (
    <section className="w-full py-14">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-[#10b981] font-semibold text-sm tracking-wide">
            Our Solution
          </span>
          <h2 className="text-gray-900 text-3xl md:text-4xl font-extrabold tracking-tight mt-2 leading-tight">
            3 Reasons You Should Get Started{" "}
            <span className="underline decoration-2 underline-offset-4">
              Now
            </span>
          </h2>
          <p className="text-gray-600 text-base mt-2">
            Never let another high-ticket deal slip through your fingers.
          </p>
        </div>

        {/* 3 Solution Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {solutions.map((s, idx) => (
            <div
              key={idx}
              className="bg-[#f8f9fa] rounded-2xl p-6 md:p-7 border border-gray-200/70 shadow-sm flex flex-col justify-start hover:shadow-md transition-shadow"
            >
              {s.icon}
              <h3 className="text-gray-900 font-bold text-lg md:text-xl leading-snug mb-2">
                {s.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
