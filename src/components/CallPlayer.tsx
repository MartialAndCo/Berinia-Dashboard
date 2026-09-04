'use client'

import { useState, useRef } from 'react'
import { Button } from './ui/button'

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

  if (!recordingUrl) return <span className="text-muted-foreground text-sm">Pas d'audio</span>

  return (
    <div className="flex items-center space-x-2">
      <audio 
        ref={audioRef} 
        src={recordingUrl} 
        onEnded={() => setIsPlaying(false)}
        className="hidden" 
      />
      <Button variant="secondary" size="sm" onClick={togglePlay}>
        {isPlaying ? '⏸ Pause' : '▶ Écouter'}
      </Button>
    </div>
  )
}
