// Apple-inspired elegant Web Audio chime (no external MP3 file required)

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function playSupportChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Tone 1: C6 (1046.5 Hz) - bright glass ping
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(1046.5, now)
    
    gain1.gain.setValueAtTime(0.001, now)
    gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.02)
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.36)

    // Tone 2: E6 (1318.5 Hz) - pleasant major third harmonic arriving 90ms later
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1318.5, now + 0.09)

    gain2.gain.setValueAtTime(0.001, now + 0.09)
    gain2.gain.exponentialRampToValueAtTime(0.22, now + 0.11)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    osc2.start(now + 0.09)
    osc2.stop(now + 0.61)
  } catch (err) {
    console.warn('[Chime] Could not play audio alert:', err)
  }
}
