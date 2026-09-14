"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LocalVslPlayer from "./LocalVslPlayer";

export default function HeroSection({ initialSrc }: { initialSrc?: string }) {
  const [videoSrc, setVideoSrc] = useState(
    initialSrc || "/videos/New_Video_1789071155558.mp4"
  );

  useEffect(() => {
    fetch("/api/admin/funnel-content")
      .then((res) => res.json())
      .then((data) => {
        if (data?.salesVideo) {
          setVideoSrc(data.salesVideo);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="w-full pt-8 md:pt-14 pb-12">
      <div className="max-w-4xl mx-auto px-4 flex flex-col items-center text-center">
        {/* Eyebrow Tag */}
        <p className="text-[#2a6ced] font-bold text-sm md:text-base tracking-wide mb-3">
          Small Business Owners 👇
        </p>

        {/* Main Headline: High-ticket revenue & growth driven */}
        <h1 className="text-gray-900 text-3xl sm:text-4xl md:text-5xl lg:text-[48px] font-black tracking-tight leading-[1.15] max-w-3xl">
          We'll Answer 100% Of Your Inbound Calls And Put{" "}
          <span className="underline decoration-4 underline-offset-8">
            Money In Your Pocket
          </span>
          .
        </h1>

        {/* Subheadline: Positioned as an elite 24/7 revenue engine capturing high-value deals */}
        <p className="text-gray-800 text-base sm:text-lg md:text-xl font-medium mt-4 max-w-2xl leading-relaxed">
          Never lose another high-value customer to voicemail. Capture every high-intent
          inquiry 24/7, eliminate dropped calls, and fill your calendar on autopilot.
        </p>

        {/* Container: Button placed ABOVE the video player */}
        <div className="w-full mt-8 flex flex-col items-center">
          {/* Switched: Get Started Now Button placed ABOVE the video */}
          <Link
            href="/opt-in/book"
            className="animate-jiggle w-full mb-6 bg-[#2a6ced] hover:bg-[#2059c7] text-white font-extrabold text-xl md:text-2xl py-4 md:py-5 rounded-xl md:rounded-2xl text-center shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 active:scale-[0.98] select-none"
          >
            Get Started Now!
          </Link>

          {/* Blue & White Video Player below the button */}
          <LocalVslPlayer src={videoSrc} />
        </div>
      </div>
    </section>
  );
}
