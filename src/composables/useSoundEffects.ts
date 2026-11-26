import { ref } from 'vue'

const isMuted = ref(false)
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (AudioCtx) {
      audioCtx = new AudioCtx()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

async function tryPlayMp3(path: string): Promise<boolean> {
  try {
    const audio = new Audio(path)
    audio.volume = 0.85
    await audio.play()
    return true
  } catch {
    return false
  }
}

function playSynthReveal() {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now + i * 0.06)
    gain.gain.setValueAtTime(0.001, now + i * 0.06)
    gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.06 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + i * 0.06)
    osc.stop(now + i * 0.06 + 0.26)
  })
}

function playSynthStrike() {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  const freqs = [150, 110]
  freqs.forEach((freq) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(freq, now)
    osc.frequency.linearRampToValueAtTime(freq * 0.75, now + 0.45)
    gain.gain.setValueAtTime(0.28, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.5)
  })
}

function playSynthTick() {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, now)
  gain.gain.setValueAtTime(0.12, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.08)
}

function playSynthWin() {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  const melody = [
    { f: 523.25, t: 0, d: 0.14 },
    { f: 659.25, t: 0.12, d: 0.14 },
    { f: 783.99, t: 0.24, d: 0.14 },
    { f: 1046.5, t: 0.36, d: 0.45 },
  ]
  melody.forEach((n) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(n.f, now + n.t)
    gain.gain.setValueAtTime(0.16, now + n.t)
    gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + n.t)
    osc.stop(now + n.t + n.d + 0.02)
  })
}

export function useSoundEffects() {
  async function playReveal() {
    if (isMuted.value) return
    const played = await tryPlayMp3('/sounds/reveal.mp3')
    if (!played) playSynthReveal()
  }

  async function playStrike() {
    if (isMuted.value) return
    const played = await tryPlayMp3('/sounds/strike.mp3')
    if (!played) playSynthStrike()
  }

  function playTick() {
    if (isMuted.value) return
    playSynthTick()
  }

  async function playWin() {
    if (isMuted.value) return
    const played = await tryPlayMp3('/sounds/win.mp3')
    if (!played) playSynthWin()
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
  }

  function testSound() {
    if (isMuted.value) {
      isMuted.value = false
    }
    playSynthReveal()
  }

  return {
    isMuted,
    playReveal,
    playStrike,
    playTick,
    playWin,
    toggleMute,
    testSound,
  }
}

