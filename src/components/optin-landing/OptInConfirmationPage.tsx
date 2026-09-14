"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Calendar,
  ExternalLink,
  Mail,
  ShieldCheck,
} from "lucide-react";
import FooterSection from "./FooterSection";

// --- SVG 3D Calendar Icon with Green Checkmark (Pixel-faithful to screenshot) ---
function CalendarCheckBadge() {
  return (
    <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 drop-shadow-lg transition-transform hover:scale-105 duration-300">
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Binder Rings */}
        <rect x="25" y="6" width="6" height="16" rx="3" fill="#94a3b8" />
        <rect x="69" y="6" width="6" height="16" rx="3" fill="#94a3b8" />
        <rect x="26.5" y="8" width="3" height="8" rx="1.5" fill="#cbd5e1" />
        <rect x="70.5" y="8" width="3" height="8" rx="1.5" fill="#cbd5e1" />

        {/* Calendar Body */}
        <rect
          x="10"
          y="15"
          width="80"
          height="76"
          rx="16"
          fill="#f8fafc"
          stroke="#e2e8f0"
          strokeWidth="1.5"
        />

        {/* Calendar Green Header */}
        <path
          d="M10 27C10 20.3726 15.3726 15 22 15H78C84.6274 15 90 20.3726 90 27V36H10V27Z"
          fill="url(#green_header_grad)"
        />

        {/* Subtle shadow line under header */}
        <rect x="10" y="35" width="80" height="2" fill="#15803d" opacity="0.2" />

        {/* Calendar Binder Ring Holes */}
        <circle cx="28" cy="24" r="3.5" fill="#14532d" opacity="0.3" />
        <circle cx="72" cy="24" r="3.5" fill="#14532d" opacity="0.3" />

        {/* Center Green Checkmark with 3D gradient */}
        <path
          d="M32 57L44 69L68 43"
          stroke="url(#check_grad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Gradients */}
        <defs>
          <linearGradient
            id="green_header_grad"
            x1="10"
            y1="15"
            x2="90"
            y2="36"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#4ade80" />
            <stop offset="1" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient
            id="check_grad"
            x1="32"
            y1="43"
            x2="68"
            y2="69"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#22c55e" />
            <stop offset="1" stopColor="#16a34a" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// --- High Conversion Video Player for Confirmation Page ---
interface ConfirmationVideoPlayerProps {
  src?: string;
  poster?: string;
}

function ConfirmationVideoPlayer({
  src = "/videos/New_Video_1789071155558.mp4",
  poster,
}: ConfirmationVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      v.play()
        .then(() => {
          setIsPlaying(true);
          setIsEnded(false);
        })
        .catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = ratio * duration;
    setCurrentTime(v.currentTime);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden bg-black shadow-2xl border border-gray-200/40 group"
    >
      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          playsInline
          preload="metadata"
          onClick={togglePlay}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setIsEnded(true);
          }}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Center Play Overlay */}
        {(!isPlaying || isEnded) && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isEnded ? "Replay Video" : "Play Video"}
            className="absolute inset-0 m-auto w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-white/95 hover:bg-white text-[#2a6ced] flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-2xl z-20 cursor-pointer"
          >
            {isEnded ? (
              <RotateCcw className="w-8 h-8" />
            ) : (
              <Play className="w-9 h-9 ml-1 fill-current" />
            )}
          </button>
        )}

        {/* Floating audio badge top-right */}
        <button
          type="button"
          onClick={toggleMute}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-all z-20"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Bottom On-Video Control Bar (Matching the screenshot style) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-6 pb-2.5 px-3.5 flex flex-col gap-1.5 text-white z-20 transition-opacity duration-200">
          {/* Scrubber Bar */}
          <div
            onClick={handleSeek}
            className="relative w-full h-1.5 hover:h-2.5 bg-white/30 rounded-full cursor-pointer transition-all duration-150 group/scrub"
          >
            <div
              className="absolute left-0 top-0 bottom-0 bg-[#2a6ced] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-0.5">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={togglePlay}
                className="hover:text-blue-400 transition-colors p-0.5"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
              </button>
              <span className="font-mono text-[11px] text-gray-200">
                {formatTime(currentTime)} / {formatTime(duration || 0)}
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-gray-200">
              <button
                type="button"
                onClick={toggleMute}
                className="hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="hover:text-white transition-colors"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- FAQ Video Card with Clean Interactive Mini-Player ---
export interface FaqVideoItem {
  id: number;
  question: string;
  src?: string;
}

function FaqVideoCard({ item }: { item: FaqVideoItem }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleToggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden p-3.5 sm:p-4">
      {/* Video Container */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black group">
        <video
          ref={videoRef}
          src={item.src || "/videos/New_Video_1789071155558.mp4"}
          playsInline
          preload="metadata"
          onClick={handleToggle}
          onEnded={() => setIsPlaying(false)}
          className="w-full h-full object-cover cursor-pointer"
        />

        {/* Center Pill Play Overlay */}
        {!isPlaying && (
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Play FAQ video"
            className="absolute inset-0 m-auto w-16 h-11 sm:w-18 sm:h-12 rounded-xl bg-black/75 hover:bg-black/90 text-white flex items-center justify-center transition-all duration-150 hover:scale-105 shadow-xl backdrop-blur-xs cursor-pointer z-10"
          >
            <Play className="w-5 h-5 ml-0.5 fill-white text-white" />
          </button>
        )}
      </div>

      {/* Question Title (Bold black text under the video) */}
      <div className="mt-3.5 flex flex-col flex-1 justify-center">
        <h3
          onClick={handleToggle}
          className="text-gray-900 font-bold text-sm sm:text-base leading-snug hover:text-[#2a6ced] transition-colors cursor-pointer"
        >
          {item.question}
        </h3>
      </div>
    </div>
  );
}

const DEFAULT_FAQ_VIDEOS: FaqVideoItem[] = [
  {
    id: 1,
    question: "What if I'm already running Google ads? Is this call worth my time?",
    src: "/videos/New_Video_1789071155558.mp4",
  },
  {
    id: 2,
    question: "What is the realistic timeframe that I'll start seeing results within?",
    src: "/videos/New_Video_1789071155558.mp4",
  },
  {
    id: 3,
    question: "How does the AI receptionist integrate with our existing phone lines & software?",
    src: "/videos/New_Video_1789071155558.mp4",
  },
  {
    id: 4,
    question: "What happens if I already have a receptionist or front-desk team?",
    src: "/videos/New_Video_1789071155558.mp4",
  },
];

interface OptInConfirmationPageProps {
  initialConfirmationVideo?: string;
  initialFaqVideos?: FaqVideoItem[];
}

// --- Main Confirmation Page Component ---
export default function OptInConfirmationPage({
  initialConfirmationVideo,
  initialFaqVideos,
}: OptInConfirmationPageProps) {
  const [confirmationVideo, setConfirmationVideo] = useState(
    initialConfirmationVideo || "/videos/New_Video_1789071155558.mp4"
  );
  const [faqVideos, setFaqVideos] = useState<FaqVideoItem[]>(
    initialFaqVideos || DEFAULT_FAQ_VIDEOS
  );

  useEffect(() => {
    // Dynamically load live video config if available
    fetch("/api/admin/funnel-content")
      .then((res) => res.json())
      .then((data) => {
        if (data?.confirmationVideo) {
          setConfirmationVideo(data.confirmationVideo);
        }
        if (Array.isArray(data?.faqVideos) && data.faqVideos.length > 0) {
          setFaqVideos(data.faqVideos);
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenGoogleCalendar = () => {
    // Open Google Calendar directly in new tab
    window.open("https://calendar.google.com/calendar/u/0/r", "_blank", "noopener,noreferrer");
  };

  return (
    <main className="min-h-screen w-full bg-white text-gray-900 selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* 1. Header Gradient Section */}
      <div
        className="w-full pb-12 pt-10 sm:pt-14 border-b border-gray-100"
        style={{
          background:
            "linear-gradient(180deg, #bfdbfe 0%, #e0effe 280px, #f8fafc 600px, #ffffff 100%)",
        }}
      >
        <div className="max-w-3xl md:max-w-4xl mx-auto px-4 flex flex-col items-center text-center">
          {/* Calendar 3D Icon with checkmark */}
          <CalendarCheckBadge />

          {/* Eyebrow */}
          <p className="text-[#2563eb] font-extrabold text-sm sm:text-base tracking-wide mb-2.5">
            Congratulations! Your Strategy Call is Booked!
          </p>

          {/* Main Headline */}
          <h1 className="text-gray-900 text-3xl sm:text-4xl md:text-[42px] lg:text-[46px] font-bold tracking-tight leading-[1.18] max-w-3xl mb-8">
            Almost Done: Watch The Video Below to Confirm Your Call Event!
          </h1>

          {/* Main Video Player Container */}
          <div className="w-full flex flex-col items-center">
            <ConfirmationVideoPlayer src={confirmationVideo} />

            {/* Core CTA: Confirm Meeting On Google Calendar! (Full width matching video) */}
            <div className="w-full mt-4 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleOpenGoogleCalendar}
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-extrabold text-lg sm:text-xl md:text-2xl py-4 sm:py-5 rounded-xl md:rounded-2xl shadow-xl shadow-blue-600/25 hover:shadow-2xl hover:shadow-blue-600/35 active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-3 select-none"
              >
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
                <span>Confirm Meeting On Google Calendar!</span>
              </button>

              {/* Secondary Alternatives & Reassurance */}
              <div className="w-full flex flex-col items-center gap-2 pt-2">
                <div className="flex items-center gap-3 flex-wrap justify-center text-xs sm:text-sm font-medium text-gray-500">
                  <span>Don't use Google Calendar?</span>
                  <a
                    href="https://outlook.live.com/calendar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2563eb] hover:underline font-semibold flex items-center gap-1"
                  >
                    Open Outlook <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-gray-300">•</span>
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2563eb] hover:underline font-semibold flex items-center gap-1"
                  >
                    Open Gmail <Mail className="w-3 h-3" />
                  </a>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    A confirmation email has also been sent to your inbox.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FAQ Section: 2-Column Video Grid (Matching Screenshot 2) */}
      <section className="w-full py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          {/* Eyebrow & Title */}
          <div className="text-center mb-12">
            <p className="text-[#2563eb] font-extrabold text-xs sm:text-sm tracking-widest uppercase mb-2">
              FAQ's
            </p>
            <h2 className="text-gray-900 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              Frequently Asked Questions About Our Free Trial
            </h2>
            <p className="text-gray-500 text-sm sm:text-base mt-2 max-w-xl mx-auto">
              Watch these quick answers to prepare for your 1-on-1 strategy session.
            </p>
          </div>

          {/* 2-Column Responsive Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {faqVideos.map((faq) => (
              <FaqVideoCard key={faq.id} item={faq} />
            ))}
          </div>

          {/* Bottom Callout & Secondary Action */}
          <div className="mt-14 p-6 sm:p-8 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-100/80 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div>
              <h3 className="text-gray-900 font-extrabold text-lg sm:text-xl">
                Ready for your AI Voice demonstration?
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">
                Make sure to join from a quiet place with working audio.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenGoogleCalendar}
              className="shrink-0 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm sm:text-base px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Verify On Calendar
            </button>
          </div>
        </div>
      </section>

      {/* 3. Footer */}
      <FooterSection />
    </main>
  );
}
