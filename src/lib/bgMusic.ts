/**
 * Ambient Background Music completely disabled per user preference.
 * All functions are safe no-ops.
 */

export function isBgMusicEnabled(): boolean {
  return false
}

export function setBgMusicEnabled(_enabled: boolean): void {}

export function getBgMusicVolume(): number {
  return 0
}

export function setBgMusicVolume(_vol: number): void {}

export function playBgMusic(): void {}

export function pauseBgMusic(): void {}

export function toggleBgMusic(): boolean {
  return false
}

export function initBgMusic(): void {}
