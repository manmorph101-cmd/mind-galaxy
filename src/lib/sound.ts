/**
 * COSMIC AUDIO ENGINE (SFX)
 * Powered by user's uploaded sound (/SOUND.mp3) with zero-latency HTML5 Audio pool,
 * action-specific playback modulation, and gentle default volume level.
 */

const AUDIO_SRC = '/SOUND.mp3'
const audioPool: HTMLAudioElement[] = []
const POOL_SIZE = 6

function getPooledAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  try {
    for (const a of audioPool) {
      if (a.paused || a.ended) {
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

let mutedState = false

export function isAudioMuted(): boolean {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mind_galaxy_sfx_muted')
    if (saved !== null) return saved === 'true'
  }
  return mutedState
}

export function setAudioMuted(muted: boolean): void {
  mutedState = muted
  if (typeof window !== 'undefined') {
    localStorage.setItem('mind_galaxy_sfx_muted', String(muted))
  }
}

export function getSoundVolume(): number {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mind_galaxy_sfx_volume')
    if (saved) {
      const v = parseFloat(saved)
      if (!isNaN(v)) return Math.min(0.5, Math.max(0.01, v))
    }
  }
  return 0.12 // Gentle, soft default SFX level
}

export function setSoundVolume(vol: number): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mind_galaxy_sfx_volume', String(vol))
  }
}

export function playCustomSound(relativeVol = 0.10, playbackRate = 1.0): void {
  if (isAudioMuted()) return
  const masterVol = getSoundVolume()
  const finalVolume = Math.min(1.0, Math.max(0.01, masterVol * (relativeVol / 0.12)))

  try {
    const audio = getPooledAudio()
    if (audio) {
      audio.volume = finalVolume
      audio.playbackRate = playbackRate
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Ignore autoplay restriction or fast click errors
        })
      }
    }
  } catch {
    // Graceful no-op
  }
}

export function playSelectSound(pitch = 520): void {
  const rate = Math.min(1.6, Math.max(0.7, pitch / 520))
  playCustomSound(0.10, rate)
}

export function playIgniteSound(): void {
  playCustomSound(0.14, 1.08)
}

export function playAchievementSound(): void {
  playCustomSound(0.16, 1.20)
}
