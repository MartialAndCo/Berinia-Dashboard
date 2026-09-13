"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Settings,
  Subtitles,
  List,
} from "lucide-react";

interface LocalVslPlayerProps {
  src?: string;
  poster?: string;
  onEnded?: () => void;
}

export default function LocalVslPlayer({
  src = "/videos/New_Video_1789071155558.mp4",
  poster,
  onEnded,
}: LocalVslPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isEnded, setIsEnded] = useState(false);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsEnded(false);
        })
        .catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const video = videoRef.current;
    if (!video || !duration) return;
    const newTime = ratio * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
    setProgressPercent(ratio * 100);
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

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full bg-[#2a6ced] rounded-2xl md:rounded-3xl p-2 md:p-3.5 shadow-2xl shadow-blue-500/20 select-none group"
    >
      {/* Video Viewport Container */}
      <div className="relative w-full aspect-video rounded-xl md:rounded-2xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          playsInline
          preload="metadata"
          onClick={togglePlay}
          onTimeUpdate={() => {
            const video = videoRef.current;
            if (!video) return;
            setCurrentTime(video.currentTime);
            if (video.duration) {
              setProgressPercent((video.currentTime / video.duration) * 100);
            }
          }}
          onLoadedMetadata={() => {
            const video = videoRef.current;
            if (!video) return;
            setDuration(video.duration);
          }}
          onEnded={() => {
            setIsPlaying(false);
            setIsEnded(true);
            setShowControls(true);
            onEnded?.();
          }}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Top-Right Audio Pill */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute" : "Mute"}
          className="absolute top-3.5 right-3.5 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-sm transition-all z-20 shadow-md"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-5 h-5 text-red-400" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>

        {/* Center Play Button Overlay */}
        {(!isPlaying || isEnded) && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isEnded ? "Replay video" : "Play video"}
            className="absolute inset-0 m-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-white text-[#2a6ced] flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-2xl z-10"
          >
            {isEnded ? (
              <RotateCcw className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1 fill-current" />
            )}
          </button>
        )}
      </div>

      {/* Bottom Blue/White Controls Bar matching the screenshot */}
      <div className="w-full pt-3 pb-1 px-2 flex flex-col gap-2 text-white">
        {/* Scrub Bar with white track and progress */}
        <div
          onClick={handleSeek}
          className="relative w-full h-1.5 hover:h-2.5 bg-white/30 rounded-full cursor-pointer transition-all duration-150 group/scrub"
        >
          <div
            className="absolute left-0 top-0 bottom-0 bg-white rounded-full transition-all duration-75 relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md" />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-xs md:text-sm pt-0.5">
          {/* Left: Play/Pause and Time */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="text-white hover:text-white/80 transition-colors p-1"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>

            <span className="font-mono text-white text-xs md:text-sm tracking-wide">
              {formatTime(currentTime)} / {formatTime(duration || 0)}
            </span>
          </div>

          {/* Right: CC, Volume, Settings, Chapters, Fullscreen */}
          <div className="flex items-center gap-3 md:gap-4 text-white">
            <button
              type="button"
              onClick={toggleMute}
              aria-label="Volume"
              className="hover:text-white/80 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              aria-label="Closed captions"
              className="hover:text-white/80 transition-colors"
            >
              <Subtitles className="w-4 h-4" />
            </button>

            <button
              type="button"
              aria-label="Settings"
              className="hover:text-white/80 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              aria-label="Chapters"
              className="hover:text-white/80 transition-colors hidden sm:block"
            >
              <List className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label="Toggle Fullscreen"
              className="hover:text-white/80 transition-colors p-0.5"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
