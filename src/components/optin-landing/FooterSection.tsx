"use client";

import Link from "next/link";

export default function FooterSection() {
  return (
    <footer className="w-full border-t border-gray-200/60 py-12 bg-white text-center">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-xl tracking-tight text-gray-900">
            Berin<span className="text-blue-600">Agents</span>
          </span>
          <span className="text-xs text-gray-400 font-medium">| Enterprise Voice AI</span>
        </div>

        <p className="text-xs md:text-sm text-gray-500">
          © {new Date().getFullYear()} BerinIA. All rights reserved. 24/7 Intelligent Voice Receptionist Systems.
        </p>

        <div className="flex items-center gap-6 text-xs md:text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-blue-600 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-blue-600 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
