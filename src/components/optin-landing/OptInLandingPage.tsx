"use client";

import HeroSection from "./HeroSection";
import LogoBar from "./LogoBar";
import TrackRecordSection from "./TrackRecordSection";
import ProblemSection from "./ProblemSection";
import SolutionSection from "./SolutionSection";
import ProcessSection from "./ProcessSection";
import TestimonialsSection from "./TestimonialsSection";
import FaqSection from "./FaqSection";
import FooterSection from "./FooterSection";

export default function OptInLandingPage() {
  return (
    <main className="min-h-screen w-full bg-white text-gray-900 selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* 1. Hero with light blue gradient stopping around the middle of the video player (~630px) */}
      <div
        className="w-full pb-6"
        style={{
          background:
            "linear-gradient(180deg, #bfdbfe 0%, #e0effe 300px, #ffffff 630px)",
        }}
      >
        <HeroSection />
        <LogoBar />
      </div>

      {/* 2. Our Track Record */}
      <TrackRecordSection />

      {/* 3. The Problem */}
      <ProblemSection />

      {/* 4. Our Solution */}
      <SolutionSection />

      {/* 5. Our Process */}
      <ProcessSection />

      {/* 6. Client Success Stories */}
      <TestimonialsSection />

      {/* 7. Frequently Asked Questions & Final CTA */}
      <FaqSection />

      {/* 8. Minimal Footer */}
      <FooterSection />
    </main>
  );
}
