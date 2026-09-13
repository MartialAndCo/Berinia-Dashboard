"use client";

import { X, ThumbsDown, HeartCrack } from "lucide-react";

export default function ProblemSection() {
  const problems = [
    {
      icon: (
        <div className="w-12 h-12 rounded-xl bg-[#ef4444] text-white flex items-center justify-center mb-5 shadow-sm">
          <X className="w-7 h-7 stroke-[3]" />
        </div>
      ),
      title: "Missing Calls & Losing Money",
      text: "Callers don't leave voicemails. If nobody picks up, they hang up in seconds and call your competitors on Google. Every missed call is pure profit lost.",
    },
    {
      icon: (
        <div className="w-12 h-12 rounded-full bg-[#ef4444] text-white flex items-center justify-center mb-5 shadow-sm">
          <ThumbsDown className="w-6 h-6 fill-white" />
        </div>
      ),
      title: "Phones Constantly Interrupting Work",
      text: "Ringing phones distract your team from serving clients. Hold times explode, staff burns out, and high-ticket buyers get rushed off the line.",
    },
    {
      icon: (
        <div className="w-12 h-12 rounded-full bg-[#ef4444] text-white flex items-center justify-center mb-5 shadow-sm">
          <HeartCrack className="w-6 h-6 fill-white" />
        </div>
      ),
      title: "Front Desks Miss High-Value Inquiries",
      text: "A human can only answer one call at a time. During peak hours, lunches, and weekends, high-paying clients hit voicemail and immediately hire someone else.",
    },
  ];

  return (
    <section className="w-full py-14">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-[#ef4444] font-semibold text-sm tracking-wide">
            The Problem
          </span>
          <h2 className="text-gray-900 text-3xl md:text-4xl font-extrabold tracking-tight mt-2 leading-tight">
            You Could Be Making A Lot More{" "}
            <span className="underline decoration-2 underline-offset-4">
              Money
            </span>
          </h2>
          <p className="text-gray-600 text-base mt-2">
            Stop me if one of these bottlenecks sounds like your business:
          </p>
        </div>

        {/* 3 Problem Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {problems.map((p, idx) => (
            <div
              key={idx}
              className="bg-[#f8f9fa] rounded-2xl p-6 md:p-7 border border-gray-200/70 shadow-sm flex flex-col justify-start hover:shadow-md transition-shadow"
            >
              {p.icon}
              <h3 className="text-gray-900 font-bold text-lg md:text-xl leading-snug mb-2">
                {p.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {p.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
