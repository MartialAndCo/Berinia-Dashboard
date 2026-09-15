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
  const scrubBarRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  const formatTime = (seconds: number) => {
    if (typeof seconds !== "number" || isNaN(seconds) || seconds < 0 || !isFinite(seconds)) {
      return "0:00";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Synchronize duration from the underlying HTMLVideoElement
  const syncDuration = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const d = video.duration;
    if (typeof d === "number" && !isNaN(d) && isFinite(d) && d > 0) {
      setDuration(d);
    }
  }, []);

  // Update playback state on src change or mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime || 0);
    setIsPlaying(!video.paused);
    setIsEnded(video.ended);
    syncDuration();
  }, [src, syncDuration]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      if (video.ended) {
        video.currentTime = 0;
      }
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsEnded(false);
        })
        .catch(() => {
          // Autoplay policy fallback: mute and play
          video.muted = true;
          setIsMuted(true);
          video
            .play()
            .then(() => {
              setIsPlaying(true);
              setIsEnded(false);
            })
            .catch(() => {});
        });
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

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const cur = video.currentTime;
    setCurrentTime(cur);

    // Ensure duration is synchronized whenever available
    const d = video.duration;
    const effectiveDuration =
      typeof d === "number" && !isNaN(d) && isFinite(d) && d > 0
        ? d
        : duration;

    if (effectiveDuration > 0) {
      if (duration !== effectiveDuration) {
        setDuration(effectiveDuration);
      }
      if (!isScrubbingRef.current) {
        setProgressPercent((cur / effectiveDuration) * 100);
      }
    }
  };

  // Seek logic based on mouse/touch clientX
  const seekToClientX = useCallback(
    (clientX: number) => {
      const bar = scrubBarRef.current;
      const video = videoRef.current;
      if (!bar || !video) return;

      const rect = bar.getBoundingClientRect();
      if (rect.width <= 0) return;

      const clickX = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));

      const d = video.duration;
      const effectiveDuration =
        typeof d === "number" && !isNaN(d) && isFinite(d) && d > 0
          ? d
          : duration;

      if (effectiveDuration > 0) {
        const newTime = ratio * effectiveDuration;
        video.currentTime = newTime;
        setCurrentTime(newTime);
        setProgressPercent(ratio * 100);
      }
    },
    [duration]
  );

  const handleScrubStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    isScrubbingRef.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    seekToClientX(clientX);

    const handleScrubMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isScrubbingRef.current) return;
      const moveClientX =
        "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      seekToClientX(moveClientX);
    };

    const handleScrubEnd = () => {
      isScrubbingRef.current = false;
      window.removeEventListener("mousemove", handleScrubMove);
      window.removeEventListener("mouseup", handleScrubEnd);
      window.removeEventListener("touchmove", handleScrubMove);
      window.removeEventListener("touchend", handleScrubEnd);
    };

    window.addEventListener("mousemove", handleScrubMove);
    window.addEventListener("mouseup", handleScrubEnd);
    window.addEventListener("touchmove", handleScrubMove);
    window.addEventListener("touchend", handleScrubEnd);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const doc = document as any;
    const isFs =
      document.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    if (!isFs) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((video as any)?.webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  };

  useEffect(() => {
    const handleFsChange = () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const doc = document as any;
      const isFs = !!(
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      /* eslint-enable @typescript-eslint/no-explicit-any */
      setIsFullscreen(isFs);
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-[#2a6ced] select-none group transition-all duration-200 ${
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col justify-between bg-black p-4 md:p-6 rounded-none"
          : "rounded-2xl md:rounded-3xl p-2 md:p-3.5 shadow-2xl shadow-blue-500/20"
      }`}
    >
      {/* Video Viewport Container */}
      <div
        className={`relative w-full overflow-hidden bg-black flex items-center justify-center ${
          isFullscreen
            ? "flex-1 max-h-[calc(100vh-80px)] rounded-xl"
            : "aspect-video rounded-xl md:rounded-2xl"
        }`}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          playsInline
          preload="auto"
          onClick={togglePlay}
          onPlay={() => {
            setIsPlaying(true);
            setIsEnded(false);
          }}
          onPause={() => {
            setIsPlaying(false);
          }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={syncDuration}
          onDurationChange={syncDuration}
          onLoadedData={syncDuration}
          onCanPlay={syncDuration}
          onEnded={() => {
            setIsPlaying(false);
            setIsEnded(true);
            onEnded?.();
          }}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Center Play Button Overlay */}
        {(!isPlaying || isEnded) && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isEnded ? "Replay video" : "Play video"}
            className="absolute inset-0 m-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-white text-[#2a6ced] flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-2xl z-10 cursor-pointer"
          >
            {isEnded ? (
              <RotateCcw className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1 fill-current" />
            )}
          </button>
        )}
      </div>

      {/* Bottom Blue/White Controls Bar */}
      <div className="w-full pt-2.5 pb-1 px-2 flex flex-col gap-1.5 text-white">
        {/* Scrub Bar with generous hit area and smooth seeking */}
        <div
          ref={scrubBarRef}
          onMouseDown={handleScrubStart}
          onTouchStart={handleScrubStart}
          className="relative w-full py-2 cursor-pointer group/scrub"
        >
          <div className="relative w-full h-1.5 group-hover/scrub:h-2 bg-white/30 rounded-full transition-all duration-150">
            <div
              className="absolute left-0 top-0 bottom-0 bg-white rounded-full"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-90 group-hover/scrub:scale-110 transition-transform" />
            </div>
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
              className="text-white hover:text-white/80 transition-colors p-1 cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>

            <span className="font-mono text-white text-xs md:text-sm tracking-wide select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right: Sound and Fullscreen only */}
          <div className="flex items-center gap-3 md:gap-4 text-white">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Activer le son" : "Couper le son"}
              className="hover:text-white/80 transition-colors p-1 cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-red-300" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
              className="hover:text-white/80 transition-colors p-1 cursor-pointer"
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
