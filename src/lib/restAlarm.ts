import { playRestDone, vibrate } from './feedback'
import { restTimer } from './restTimer'

/** Wires the rest timer's end to sound + vibration, app-wide (it keeps running across screens). */
export function installRestAlarm(): void {
  restTimer.setOnDone(() => {
    playRestDone()
    vibrate([300, 120, 300])
  })
  // Background tabs throttle timers; catch up as soon as the app is visible again.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') restTimer.resync()
  })
  restTimer.resync()
}
