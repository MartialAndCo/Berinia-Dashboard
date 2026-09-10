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

interface CustomVideoPlayerProps {
  src: string;
  title?: string;
  autoPlayTrigger?: number;
  onEnded?: () => void;
}

export default function CustomVideoPlayer({
  src,
  title = "Video player",
  autoPlayTrigger = 0,
  onEnded,
}: CustomVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxTimeRef = useRef(0);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const [clickFeedback, setClickFeedback] = useState<"play" | "pause" | null>(null);

  // Auto-play when triggered (e.g. after form completion)
  useEffect(() => {
    if (autoPlayTrigger > 0) {
      const video = videoRef.current;
      if (video) {
        video
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsEnded(false);
          })
          .catch(() => {
            // If browser autoplay policies require user gesture or muted
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
      }
    }
  }, [autoPlayTrigger]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsEnded(false);
          setClickFeedback("play");
          setTimeout(() => setClickFeedback(null), 500);
        })
        .catch(() => {
          /* browser autoplay constraint */
        });
    } else {
      video.pause();
      setIsPlaying(false);
      setClickFeedback("pause");
      setTimeout(() => setClickFeedback(null), 500);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    setVolume(val);
    if (val === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        onFullscreenChange,
      );
    };
  }, []);

  const triggerActivity = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isPlaying]);

  // Anti-skip logic: prevent advancing/skipping forward beyond watched point
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.currentTime > maxTimeRef.current + 1.2) {
      // User or script attempted to skip forward — snap back immediately
      video.currentTime = maxTimeRef.current;
    } else {
      maxTimeRef.current = Math.max(maxTimeRef.current, video.currentTime);
    }

    if (video.duration && !isNaN(video.duration)) {
      const pct = (video.currentTime / video.duration) * 100;
      setProgressPercent(Math.min(100, Math.max(0, pct)));
    }
  };

  // Handle keyboard shortcuts (Prevent skipping forward, allow play/mute/fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Block forward / backward skip keys (ArrowRight, ArrowLeft, J, L, 0-9)
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowLeft" ||
        e.code === "KeyJ" ||
        e.code === "KeyL" ||
        (!isNaN(Number(e.key)) && e.key !== " ")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.key === " " || e.code === "Space" || e.code === "KeyK") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        toggleMute();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, toggleMute, toggleFullscreen]);

  return (
    <div
      ref={containerRef}
      className={`f-custom-player ${isFullscreen ? "f-fullscreen" : ""} ${
        !showControls && isPlaying ? "f-controls-hidden" : ""
      }`}
      onMouseMove={triggerActivity}
      onMouseEnter={triggerActivity}
      onContextMenu={(e) => e.preventDefault()}
      tabIndex={0}
      role="region"
      aria-label={title}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        className="f-custom-video"
        onPlay={() => {
          setIsPlaying(true);
          setIsEnded(false);
          triggerActivity();
        }}
        onPause={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setIsEnded(true);
          setShowControls(true);
          if (onEnded) {
            onEnded();
          }
        }}
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
      />

      {/* Ripple click feedback icon */}
      {clickFeedback && (
        <div className="f-click-feedback" key={clickFeedback + Date.now()}>
          {clickFeedback === "play" ? (
            <Play size={44} fill="currentColor" />
          ) : (
            <Pause size={44} fill="currentColor" />
          )}
        </div>
      )}

      {/* Big Center Play / Replay button */}
      {(!isPlaying || isEnded) && (
        <button
          type="button"
          className="f-center-action"
          aria-label={isEnded ? "Watch again" : "Play video"}
          onClick={togglePlay}
        >
          <span className="f-center-action-btn">
            {isEnded ? (
              <RotateCcw size={32} />
            ) : (
              <Play size={32} fill="currentColor" style={{ marginLeft: "3px" }} />
            )}
          </span>
          {isEnded && (
            <span className="f-center-action-label">Watch again</span>
          )}
        </button>
      )}

      {/* Subtle brand tag */}
      <div className="f-player-brand-tag" aria-hidden="true">
        <span>BerinAgents</span>
      </div>

      {/* Custom Controls Bar */}
      <div className="f-custom-controls">
        {/* Visual Progress Line — non-interactive, NO timestamps / NO duration */}
        <div className="f-progress-track" aria-hidden="true">
          <div
            className="f-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="f-controls-bar">
          <div className="f-controls-left">
            <button
              type="button"
              className="f-ctrl-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={19} fill="currentColor" />
              ) : (
                <Play size={19} fill="currentColor" style={{ marginLeft: "1px" }} />
              )}
            </button>

            {/* Volume Control */}
            <div className="f-volume-group">
              <button
                type="button"
                className="f-ctrl-btn"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={19} />
                ) : (
                  <Volume2 size={19} />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="f-volume-slider"
                aria-label="Volume slider"
              />
            </div>
          </div>

          <div className="f-controls-right">
            <button
              type="button"
              className="f-ctrl-btn"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
