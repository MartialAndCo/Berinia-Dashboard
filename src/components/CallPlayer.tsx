'use client'

import { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Play, Pause, ExternalLink } from 'lucide-react'

export default function CallPlayer({ recordingUrl }: { recordingUrl: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  if (!recordingUrl) return <span className="text-[#73706b] text-xs">—</span>

  return (
    <div className="flex items-center space-x-2">
      <audio 
        ref={audioRef} 
        src={recordingUrl} 
        onEnded={() => setIsPlaying(false)}
        className="hidden" 
      />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={togglePlay}
        className="h-7 px-2.5 text-[11px] font-semibold tracking-wider uppercase border-[#e6e2d6] bg-white hover:bg-[#faf8f5] text-[#1a1918] rounded-sm transition-colors flex items-center gap-1.5 shadow-none"
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
      <a
        href={recordingUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Ouvrir le lien direct de l'enregistrement"
        className="p-1 text-[#73706b] hover:text-[#9e4733] transition-colors rounded hover:bg-[#faf8f5]"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}
