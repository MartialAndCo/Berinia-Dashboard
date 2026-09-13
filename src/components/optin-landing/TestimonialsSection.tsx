"use client";

import { Star, Play, Volume2 } from "lucide-react";

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "Nate Banks",
      role: "CEO of Apex Health Group",
      quote:
        "“I can't say enough good things about them. A pleasure to work with, very professional, straight to the point, and delivers you with results. I would highly recommend them to anybody looking to eliminate missed calls and capture lost patients.”",
      videoDuration: "1:24",
    },
    {
      name: "Jake Ellis",
      role: "Founder of Cadena Practice",
      quote:
        "“I don't normally do testimonials, but this team is absolute killing it. From the get-go it's been capturing high-intent callers that used to go straight to voicemail, turning every ring into confirmed appointments.”",
      videoDuration: "2:05",
    },
  ];

  return (
    <section
      className="w-full py-20"
      style={{
        background:
          "linear-gradient(180deg, #bfdbfe 0%, #e0effe 180px, #ffffff 400px)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-blue-600 font-semibold text-sm md:text-base tracking-wide">
            Client Success Stories
          </span>
          <h2 className="text-gray-900 text-3xl md:text-4xl lg:text-[40px] font-extrabold tracking-tight mt-3 leading-tight">
            Hear What Our Clients Are Saying
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-14">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="bg-[#f8f9fa] rounded-2xl p-7 md:p-8 border border-gray-200/70 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              {/* Header: Avatar, Stars, Name, Role */}
              <div className="flex flex-col items-center text-center">
                {/* Avatar Initials Placeholder */}
                <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-sm mb-3">
                  {t.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>

                {/* 5 Stars */}
                <div className="flex items-center gap-1 text-amber-400 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current stroke-none" />
                  ))}
                </div>

                <h3 className="text-gray-900 font-bold text-lg">{t.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{t.role}</p>

                {/* Quote */}
                <p className="text-gray-600 text-sm md:text-[15px] italic leading-relaxed mb-6">
                  {t.quote}
                </p>
              </div>

              {/* Video Testimonial Snippet Box */}
              <div className="relative w-full aspect-video rounded-xl bg-gray-900 overflow-hidden shadow-inner flex items-center justify-center group cursor-pointer border border-gray-800">
                {/* Background ambient gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* Play Button Overlay */}
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg border border-white/30 z-10">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>

                {/* Speaker icon in bottom right */}
                <div className="absolute bottom-3 right-3 text-white/80 z-10 bg-black/50 p-1.5 rounded-full">
                  <Volume2 className="w-4 h-4" />
                </div>

                {/* Duration Tag */}
                <div className="absolute bottom-3 left-3 text-white/90 text-xs font-mono z-10 bg-black/50 px-2 py-0.5 rounded">
                  {t.videoDuration}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
