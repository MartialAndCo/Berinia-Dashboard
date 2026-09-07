'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Download } from 'lucide-react'

interface CallPlayerProps {
  recordingUrl: string
  mode?: 'compact' | 'full'
  className?: string
}

export default function CallPlayer({ recordingUrl, mode = 'compact', className = '' }: CallPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration)
      }
    }
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [recordingUrl])

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {})
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation()
    const rates = [1, 1.25, 1.5, 2]
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length
    const nextRate = rates[nextIdx]
    setPlaybackRate(nextRate)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate
    }
  }

  const skipSeconds = (seconds: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!audioRef.current) return
    const newTime = Math.min(Math.max(0, audioRef.current.currentTime + seconds), duration || 9999)
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!audioRef.current) return
    audioRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (!recordingUrl) return <span className="text-[#73706b] text-xs">—</span>

  // Compact Mode (used in table rows)
  if (mode === 'compact') {
    return (
      <div className={`flex items-center space-x-1.5 ${className}`} onClick={(e) => e.stopPropagation()}>
        <audio ref={audioRef} src={recordingUrl} preload="metadata" className="hidden" />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={togglePlay}
          className="h-7 px-2 text-[11px] font-semibold tracking-wider uppercase border-[#e6e2d6] bg-white hover:bg-[#faf8f5] text-[#1a1918] rounded-sm transition-colors flex items-center gap-1 shadow-none"
        >
          {isPlaying ? (
            <>
              <Pause className="h-3 w-3 fill-current text-[#9e4733]" /> Pause
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-current text-[#1a1918]" /> Listen
            </>
          )}
        </Button>

        {isPlaying && (
          <span className="text-[10px] font-mono text-[#73706b] px-1">
            {formatTime(currentTime)}
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={cyclePlaybackRate}
          className="h-7 px-1.5 text-[10px] font-mono text-[#73706b] hover:text-[#1a1918] hover:bg-[#faf8f5]"
          title="Playback speed"
        >
          {playbackRate}x
        </Button>
      </div>
    )
  }

  // Full Mode (used in expanded call view)
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div 
      className={`p-3.5 bg-[#faf8f5] border border-[#e6e2d6] rounded-sm flex flex-col gap-2.5 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <audio ref={audioRef} src={recordingUrl} preload="metadata" className="hidden" />
      
      {/* Top Bar: Play, Skip, Duration, Speed, Volume, Download */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={togglePlay}
            className="h-8 px-3 text-xs font-semibold tracking-wider uppercase bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm transition-colors flex items-center gap-1.5 shadow-none"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current text-[#9e4733]" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current text-[#f6f4f0]" /> Play Audio
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={(e) => skipSeconds(-5, e)}
            className="h-8 w-8 p-0 border-[#e6e2d6] bg-white text-[#73706b] hover:text-[#1a1918]"
            title="Rewind 5 seconds"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={(e) => skipSeconds(10, e)}
            className="h-8 w-8 p-0 border-[#e6e2d6] bg-white text-[#73706b] hover:text-[#1a1918]"
            title="Forward 10 seconds"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>

          <div className="font-mono text-xs text-[#73706b] ml-1">
            <span className="text-[#1a1918] font-medium">{formatTime(currentTime)}</span> / {formatTime(duration)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Playback speed selector */}
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className="px-2 py-1 text-xs font-mono font-semibold rounded border border-[#e6e2d6] bg-white text-[#1a1918] hover:bg-[#f6f4f0] cursor-pointer"
            title="Toggle playback speed"
          >
            {playbackRate}x
          </button>

          {/* Mute Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="h-8 w-8 p-0 text-[#73706b] hover:text-[#1a1918]"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-[#9e4733]" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          {/* Download Audio */}
          <a
            href={recordingUrl}
            download="call_recording.wav"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-[#73706b] hover:text-[#1a1918] hover:bg-white rounded border border-transparent hover:border-[#e6e2d6] transition-colors"
            title="Download audio recording"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Progress Bar / Scrubber */}
      <div className="relative flex items-center w-full">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-[#e6e2d6] rounded-lg appearance-none cursor-pointer accent-[#9e4733]"
        />
      </div>
    </div>
  )
}
