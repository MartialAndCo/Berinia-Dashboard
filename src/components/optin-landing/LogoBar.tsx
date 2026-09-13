"use client";

import { ChevronDown } from "lucide-react";

export default function LogoBar({
  label = "Trusted by 100+ Fast-Growing Businesses & Brands:",
}: {
  label?: string;
}) {
  const brands = [
    { name: "Apex Health", font: "font-serif tracking-wider font-semibold" },
    { name: "MEDMARKET", font: "font-mono font-bold tracking-widest" },
    { name: "HYDRAGUN", font: "font-sans font-extrabold tracking-tight" },
    { name: "NuStrips", font: "font-serif italic font-medium" },
    { name: "VERTEK", font: "font-sans font-black tracking-widest text-sm" },
    { name: "ovrload", font: "font-sans font-bold tracking-tighter" },
  ];

  return (
    <div className="w-full py-12 flex flex-col items-center justify-center text-center">
      <p className="text-gray-900 font-bold text-base md:text-lg mb-8">
        {label}
      </p>

      {/* Brand Logos */}
      <div className="flex items-center justify-center gap-8 md:gap-14 flex-wrap max-w-4xl mx-auto opacity-70 hover:opacity-100 transition-opacity">
        {brands.map((b) => (
          <span
            key={b.name}
            className={`text-gray-800 text-lg md:text-xl select-none ${b.font}`}
          >
            {b.name}
          </span>
        ))}
      </div>

      {/* Down chevron arrow */}
      <div className="mt-10 text-blue-500 animate-bounce">
        <ChevronDown className="w-6 h-6 stroke-[2.5]" />
      </div>
    </div>
  );
}
