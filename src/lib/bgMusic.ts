'use client'

/**
 * COSMIC AMBIENT BACKGROUND MUSIC ENGINE
 * Smooth, looping celestial soundscape (/bg-music.mp3)
 * with low-volume ambient playback, autoplay unlock on interaction,
 * and persistent volume / mute controls.
 */

const BG_MUSIC_SRC = '/bg-music.mp3'

let bgAudio: HTMLAudioElement | null = null
let hasUnlockedAutoplay = false

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!bgAudio) {
    try {
      bgAudio = new Audio(BG_MUSIC_SRC)
      bgAudio.loop = true
      bgAudio.preload = 'auto'
      bgAudio.volume = getBgMusicVolume()
    } catch {
      return null
    }
  }
  return bgAudio
}

export function isBgMusicEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const saved = localStorage.getItem('mindgalaxy_bg_music_enabled')
  // Default to enabled (true)
  return saved === null ? true : saved === 'true'
}

export function setBgMusicEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem('mindgalaxy_bg_music_enabled', enabled ? 'true' : 'false')
  const audio = getAudio()
  if (!audio) return

  if (enabled) {
    playBgMusic()
  } else {
    audio.pause()
  }
}

export function getBgMusicVolume(): number {
  if (typeof window === 'undefined') return 0.10
  const saved = localStorage.getItem('mindgalaxy_bg_music_volume')
  if (saved !== null) {
    const val = parseFloat(saved)
    if (!isNaN(val)) return Math.max(0.01, Math.min(0.60, val))
  }
  return 0.10 // Gentle, soothing ambient level by default
}

export function setBgMusicVolume(vol: number) {
  if (typeof window === 'undefined') return
  const clamped = Math.max(0.01, Math.min(0.60, vol))
  localStorage.setItem('mindgalaxy_bg_music_volume', clamped.toFixed(2))
  const audio = getAudio()
  if (audio) {
    audio.volume = clamped
  }
}

export function playBgMusic() {
  if (!isBgMusicEnabled()) return
  const audio = getAudio()
  if (!audio) return

  audio.volume = getBgMusicVolume()
  const promise = audio.play()
  if (promise !== undefined) {
    promise.catch(() => {
      // Browser autoplay policy blocked it; unlock on first interaction
      if (!hasUnlockedAutoplay && typeof window !== 'undefined') {
        const unlock = () => {
          hasUnlockedAutoplay = true
          if (isBgMusicEnabled()) {
            audio.play().catch(() => {})
          }
          window.removeEventListener('pointerdown', unlock)
          window.removeEventListener('keydown', unlock)
        }
        window.addEventListener('pointerdown', unlock, { once: true })
        window.addEventListener('keydown', unlock, { once: true })
      }
    })
  }
}

export function pauseBgMusic() {
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

// Global initializer called on mount in GalaxyExperience
export function initBgMusic() {
  if (typeof window === 'undefined') return
  if (isBgMusicEnabled()) {
    playBgMusic()
  }
}
