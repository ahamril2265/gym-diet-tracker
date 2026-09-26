import { useEffect } from 'react'

/*
 * Sound, vibration and screen wake lock. All optional browser features: every call is guarded and
 * silently does nothing where unsupported (e.g. no vibration on iOS).
 */

let audio: AudioContext | null = null

/** Browsers only allow audio after a user gesture; call this from a tap (e.g. ticking a set). */
export function unlockAudio(): void {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

/** Three short rising beeps. */
export function playRestDone(): void {
  if (!audio || audio.state !== 'running') return
  const t0 = audio.currentTime + 0.02
  const tones = [880, 880, 1320]
  tones.forEach((freq, i) => {
    const osc = audio!.createOscillator()
    const gain = audio!.createGain()
    const start = t0 + i * 0.22
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
    osc.connect(gain).connect(audio!.destination)
    osc.start(start)
    osc.stop(start + 0.2)
  })
}

export function vibrate(pattern: number | number[]): void {
  try {
    // Chrome blocks (and logs an error for) vibration before the user has tapped the page.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return
    navigator.vibrate?.(pattern)
  } catch {
    // Not supported (iOS) or blocked.
  }
}

/** Light tick for confirmations (set ticked, barcode found). */
export const haptic = () => vibrate(12)

/** Keeps the screen on while `active` so the rest timer can sound. Re-acquired after tab switches. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        if (document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock?.release()
      } catch {
        // Denied (battery saver) — fine, the timer still works while the screen is on.
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}
