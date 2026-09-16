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
import {
  sendVslTelemetry,
  type VslVariant,
  type VslEvent,
} from "@/lib/vsl-analytics";

interface LocalVslPlayerProps {
  src?: string;
  poster?: string;
  onEnded?: () => void;
  sessionId?: string;
  visitorId?: string;
  variant?: VslVariant;
}

export default function LocalVslPlayer({
  src = "/videos/New_Video_1789071155558.mp4",
  poster,
  onEnded,
  sessionId,
  visitorId,
  variant = "A",
}: LocalVslPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubBarRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);

  // Telemetry refs for checkpoints & heartbeat
  const maxWatchedRef = useRef(0);
  const hasPlayedRef = useRef(false);
  const hook3sRef = useRef(false);
  const hook10sRef = useRef(false);
  const hook30sRef = useRef(false);
  const hook45sRef = useRef(false);
  const reached25Ref = useRef(false);
  const reached50Ref = useRef(false);
  const reached75Ref = useRef(false);
  const reachedMidpointRef = useRef(false);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  // Central telemetry dispatcher
  const dispatchTelemetry = useCallback(
    (event: VslEvent, useBeacon = false) => {
      if (!sessionId || !visitorId) return;
      const video = videoRef.current;
      const cur = video?.currentTime || 0;
      const dur = video?.duration || duration || 0;
      const maxSec = Math.max(maxWatchedRef.current, cur);
      maxWatchedRef.current = maxSec;
      const maxPct =
        dur > 0 ? Math.min(100, Math.round((maxSec / dur) * 100)) : 0;

      sendVslTelemetry(
        {
          sessionId,
          visitorId,
          variant: variant || "A",
          event,
          currentTime: Number(cur.toFixed(1)),
          duration: Math.round(dur),
          maxSecondsWatched: Math.round(maxSec),
          maxPercentWatched: maxPct,
          hasPlayed: hasPlayedRef.current,
          hook3s: hook3sRef.current,
          hook10s: hook10sRef.current,
          hook30s: hook30sRef.current,
          hook45s: hook45sRef.current,
          reached25: reached25Ref.current,
          reached50: reached50Ref.current,
          reached75: reached75Ref.current,
          reachedMidpoint: reachedMidpointRef.current,
          completed: event === "ended",
          pagePath: "/opt-in",
          videoSrc: src,
        },
        useBeacon
      );
    },
    [sessionId, visitorId, variant, duration, src]
  );

  // Visibility and unload beacon listener
  useEffect(() => {
    const handleVisibilityOrUnload = () => {
      if (hasPlayedRef.current) {
        dispatchTelemetry("heartbeat", true);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        handleVisibilityOrUnload();
      }
    };

    window.addEventListener("beforeunload", handleVisibilityOrUnload);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", handleVisibilityOrUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
    };
  }, [dispatchTelemetry]);

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
          if (!hasPlayedRef.current) {
            hasPlayedRef.current = true;
            dispatchTelemetry("play");
          }
          if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = setInterval(() => {
            dispatchTelemetry("heartbeat");
          }, 10000);
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
              if (!hasPlayedRef.current) {
                hasPlayedRef.current = true;
                dispatchTelemetry("play");
              }
              if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
              heartbeatTimerRef.current = setInterval(() => {
                dispatchTelemetry("heartbeat");
              }, 10000);
            })
            .catch(() => {});
        });
    } else {
      video.pause();
      setIsPlaying(false);
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      dispatchTelemetry("pause");
    }
  }, [dispatchTelemetry]);

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

    if (cur > maxWatchedRef.current) {
      maxWatchedRef.current = cur;
    }

    // Hook checkpoints detection
    if (cur >= 3 && !hook3sRef.current) {
      hook3sRef.current = true;
      dispatchTelemetry("milestone");
    }
    if (cur >= 10 && !hook10sRef.current) {
      hook10sRef.current = true;
      dispatchTelemetry("milestone");
    }
    if (cur >= 30 && !hook30sRef.current) {
      hook30sRef.current = true;
      dispatchTelemetry("milestone");
    }
    if (cur >= 45 && !hook45sRef.current) {
      hook45sRef.current = true;
      dispatchTelemetry("milestone");
    }
    if (cur >= 270 && !reachedMidpointRef.current) {
      reachedMidpointRef.current = true;
      dispatchTelemetry("milestone");
    }

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
      const pct = (cur / effectiveDuration) * 100;
      if (!isScrubbingRef.current) {
        setProgressPercent(pct);
      }

      // Quartiles detection
      if (pct >= 25 && !reached25Ref.current) {
        reached25Ref.current = true;
        dispatchTelemetry("milestone");
      }
      if (pct >= 50 && !reached50Ref.current) {
        reached50Ref.current = true;
        dispatchTelemetry("milestone");
      }
      if (pct >= 75 && !reached75Ref.current) {
        reached75Ref.current = true;
        dispatchTelemetry("milestone");
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
            if (!hasPlayedRef.current) {
              hasPlayedRef.current = true;
              dispatchTelemetry("play");
            }
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
            heartbeatTimerRef.current = setInterval(() => {
              dispatchTelemetry("heartbeat");
            }, 10000);
          }}
          onPause={() => {
            setIsPlaying(false);
            if (heartbeatTimerRef.current) {
              clearInterval(heartbeatTimerRef.current);
              heartbeatTimerRef.current = null;
            }
            dispatchTelemetry("pause");
          }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={syncDuration}
          onDurationChange={syncDuration}
          onLoadedData={syncDuration}
          onCanPlay={syncDuration}
          onEnded={() => {
            setIsPlaying(false);
            setIsEnded(true);
            if (heartbeatTimerRef.current) {
              clearInterval(heartbeatTimerRef.current);
              heartbeatTimerRef.current = null;
            }
            dispatchTelemetry("ended");
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
