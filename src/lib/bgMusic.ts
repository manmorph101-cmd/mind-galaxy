/**
 * CELESTIAL BACKGROUND MUSIC ENGINE
 * Smooth, looping celestial soundscape (/bg-music.mp3)
 * Muted by default (opt-in only), gentle low ambient volume level (8%)
 * so it never disturbs or causes headache.
 */

const BG_MUSIC_SRC = '/bg-music.mp3'
let bgAudio: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!bgAudio) {
    try {
      bgAudio = new Audio(BG_MUSIC_SRC)
      bgAudio.loop = true
      bgAudio.preload = 'metadata'
      bgAudio.volume = getBgMusicVolume()
    } catch {
      bgAudio = null
    }
  }
  return bgAudio
}

export function isBgMusicEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mind_galaxy_bg_music_enabled')
    if (saved !== null) {
      return saved === 'true'
    }
  }
  // MUTED BY DEFAULT: user must explicitly launch it
  return false
}

export function setBgMusicEnabled(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mind_galaxy_bg_music_enabled', String(enabled))
  }
  if (!enabled) {
    pauseBgMusic()
  } else {
    playBgMusic()
  }
}

export function getBgMusicVolume(): number {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mind_galaxy_bg_music_volume')
    if (saved) {
      const v = parseFloat(saved)
      if (!isNaN(v)) return Math.min(0.35, Math.max(0.01, v))
    }
  }
  // Soft, calming, low ambient whisper volume
  return 0.08
}

export function setBgMusicVolume(vol: number): void {
  const clamped = Math.min(0.35, Math.max(0.01, vol))
  if (typeof window !== 'undefined') {
    localStorage.setItem('mind_galaxy_bg_music_volume', String(clamped))
  }
  const audio = getAudio()
  if (audio) {
    audio.volume = clamped
  }
}

export function playBgMusic(): void {
  const audio = getAudio()
  if (!audio) return
  audio.volume = getBgMusicVolume()

  const promise = audio.play()
  if (promise !== undefined) {
    promise.catch(() => {
      // Auto-play policy waiting for first user click
      const onFirstInteraction = () => {
        if (isBgMusicEnabled()) {
          audio.play().catch(() => {})
        }
        window.removeEventListener('click', onFirstInteraction)
        window.removeEventListener('keydown', onFirstInteraction)
        window.removeEventListener('touchstart', onFirstInteraction)
      }
      window.addEventListener('click', onFirstInteraction, { once: true })
      window.addEventListener('keydown', onFirstInteraction, { once: true })
      window.addEventListener('touchstart', onFirstInteraction, { once: true })
    })
  }
}

export function pauseBgMusic(): void {
  const audio = getAudio()
  if (audio) {
    audio.pause()
  }
}

export function toggleBgMusic(): boolean {
  const currentlyEnabled = isBgMusicEnabled()
  const next = !currentlyEnabled
  setBgMusicEnabled(next)
  return next
}

export function initBgMusic(): void {
  // Only start if explicitly enabled in previous session, otherwise stays muted!
  if (isBgMusicEnabled()) {
    playBgMusic()
  }
}
