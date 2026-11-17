/**
 * Audio Engine completely disabled per user preference.
 * All sound and audio calls are safe no-ops.
 */

export function isAudioMuted(): boolean {
  return true
}

export function setAudioMuted(_muted: boolean): void {}

export function getSoundVolume(): number {
  return 0
}

export function setSoundVolume(_vol: number): void {}

export function playCustomSound(_relativeVol = 0.12, _playbackRate = 1.0): void {}

export function playSelectSound(_pitch = 520): void {}

export function playIgniteSound(): void {}

export function playAchievementSound(): void {}
