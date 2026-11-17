'use client'

/**
 * COSMIC AUDIO ENGINE
 * Powered by user's uploaded sound (/SOUND.mp3) with zero-latency HTML5 Audio pool,
 * action-specific playback modulation, and Web Audio API fallback.
 */

const AUDIO_SRC = '/SOUND.mp3'
const audioPool: HTMLAudioElement[] = []
const POOL_SIZE = 6

function getPooledAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  try {
    for (const a of audioPool) {
      if (a.paused || a.ended) {
        a.currentTime = 0
        return a
      }
    }
    const audio = new Audio(AUDIO_SRC)
    audio.preload = 'auto'
    if (audioPool.length < POOL_SIZE) {
      audioPool.push(audio)
    }
    return audio
  } catch {
    return null
  }
}

export function isAudioMuted(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem('mindgalaxy_muted') === 'true'
}

export function setAudioMuted(muted: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem('mindgalaxy_muted', muted ? 'true' : 'false')
}

export function getSoundVolume(): number {
  if (typeof window === 'undefined') return 0.14
  const saved = localStorage.getItem('mindgalaxy_volume')
  if (saved !== null) {
    const parsed = parseFloat(saved)
    if (!isNaN(parsed)) return Math.max(0.01, Math.min(1.0, parsed))
  }
  return 0.14 // Gentle, soft default UI sound effect level
}

export function setSoundVolume(vol: number) {
  if (typeof window === 'undefined') return
  const clamped = Math.max(0.01, Math.min(1.0, vol))
  localStorage.setItem('mindgalaxy_volume', clamped.toFixed(2))
}

// ── CORE SOUND PLAYER USING UPLOADED SOUND.mp3 ──
// Subtle, gentle volume levels tailored for delicate UI feedback ("ha ka effect")
export function playCustomSound(relativeVol = 0.12, playbackRate = 1.0) {
  if (isAudioMuted()) return
  const masterVol = getSoundVolume()
  // Scale relative volume by the master volume setting (default factor 1.0 at 0.14)
  const finalVolume = Math.max(0.005, Math.min(1.0, relativeVol * (masterVol / 0.14)))

  try {
    const audio = getPooledAudio()
    if (audio) {
      audio.volume = finalVolume
      audio.playbackRate = playbackRate
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          playProceduralFallback(520 * playbackRate, finalVolume)
        })
      }
      return
    }
  } catch {}
  playProceduralFallback(520 * playbackRate, finalVolume)
}

// 1. Node Selection / Focus Chime (Gentle, subtle tap)
export function playSelectSound(pitch = 520) {
  const rate = pitch ? Math.max(0.75, Math.min(1.35, pitch / 520)) : 1.0
  playCustomSound(0.12, rate)
}

// 2. Synaptic Ignition (New Node, Task, or Lesson Added)
export function playIgniteSound() {
  playCustomSound(0.16, 1.08)
}

// 3. Milestone Completion / Streak Victory
export function playAchievementSound() {
  playCustomSound(0.20, 1.2)
}

// Procedural fallback if MP3 cannot autoplay
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) audioCtx = new AudioContextClass()
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function playProceduralFallback(freq = 520, volume = 0.015) {
  if (isAudioMuted()) return
  const ctx = getAudioContext()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(freq * 1.35, ctx.currentTime + 0.18)

  const softGain = Math.max(0.002, Math.min(0.05, volume * 0.1))
  gain.gain.setValueAtTime(softGain, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start()
  osc.stop(ctx.currentTime + 0.32)
}
