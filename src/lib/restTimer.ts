/**
 * Rest timer store. Tracks an absolute end time (not a countdown) so it stays right when the
 * phone throttles timers in the background, and survives a page reload via localStorage.
 */
export interface RestTimerState {
  workoutId: string
  endAt: number
  totalMs: number
  /** Set once the end alert has fired. */
  done: boolean
}

type Listener = () => void

const STORAGE_KEY = 'gdt.restTimer'
/** How long the "Rest over" state stays visible before the card hides itself. */
export const DONE_VISIBLE_MS = 5000

let state: RestTimerState | null = load()
const listeners = new Set<Listener>()
let endTimeout: ReturnType<typeof setTimeout> | undefined
let hideTimeout: ReturnType<typeof setTimeout> | undefined
let onDone: () => void = () => {}

function load(): RestTimerState | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as RestTimerState) : null
  } catch {
    return null
  }
}

function save() {
  try {
    if (state) globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state))
    else globalThis.localStorage?.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode); the timer still works in memory.
  }
}

function emit() {
  save()
  for (const l of listeners) l()
}

function schedule(now = Date.now()) {
  clearTimeout(endTimeout)
  clearTimeout(hideTimeout)
  if (!state) return
  if (!state.done) {
    endTimeout = setTimeout(fire, Math.max(0, state.endAt - now))
  } else {
    hideTimeout = setTimeout(() => restTimer.stop(), Math.max(0, state.endAt + DONE_VISIBLE_MS - now))
  }
}

function fire() {
  if (!state || state.done) return
  state = { ...state, done: true }
  onDone()
  schedule()
  emit()
}

export const restTimer = {
  get(): RestTimerState | null {
    return state
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  /** Called when the countdown reaches 0 (sound + vibration live in the UI layer). */
  setOnDone(fn: () => void) {
    onDone = fn
  },

  start(workoutId: string, seconds: number, now = Date.now()) {
    state = { workoutId, endAt: now + seconds * 1000, totalMs: seconds * 1000, done: false }
    schedule(now)
    emit()
  },

  /** ±seconds on the remaining time (the total grows or shrinks too, so the bar stays honest). */
  adjust(deltaSec: number, now = Date.now()) {
    if (!state || state.done) return
    const endAt = Math.max(now, state.endAt + deltaSec * 1000)
    const totalMs = Math.max(1000, state.totalMs + (endAt - state.endAt))
    state = { ...state, endAt, totalMs }
    schedule(now)
    emit()
    if (endAt <= now) fire()
  },

  stop() {
    clearTimeout(endTimeout)
    clearTimeout(hideTimeout)
    state = null
    emit()
  },

  /** Re-arms timers after a reload or when the app returns from the background. */
  resync(now = Date.now()) {
    if (!state) return
    if (!state.done && state.endAt <= now) fire()
    else schedule(now)
  },
}

export function remainingMs(s: RestTimerState, now = Date.now()): number {
  return Math.max(0, s.endAt - now)
}
