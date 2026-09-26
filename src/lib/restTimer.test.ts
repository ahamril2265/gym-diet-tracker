import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DONE_VISIBLE_MS, remainingMs, restTimer } from './restTimer'

describe('restTimer', () => {
  const onDone = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 26, 18, 0, 0))
    onDone.mockReset()
    restTimer.setOnDone(onDone)
    restTimer.stop()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts down and fires once at zero', () => {
    restTimer.start('w1', 90)
    const s = restTimer.get()!
    expect(remainingMs(s)).toBe(90_000)
    vi.advanceTimersByTime(89_000)
    expect(onDone).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1_000)
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(restTimer.get()?.done).toBe(true)
  })

  it('hides itself a few seconds after finishing', () => {
    restTimer.start('w1', 10)
    vi.advanceTimersByTime(10_000 + DONE_VISIBLE_MS)
    expect(restTimer.get()).toBeNull()
  })

  it('adds and removes 15 s and moves the alarm with it', () => {
    restTimer.start('w1', 60)
    restTimer.adjust(15)
    expect(remainingMs(restTimer.get()!)).toBe(75_000)
    expect(restTimer.get()!.totalMs).toBe(75_000)
    restTimer.adjust(-15)
    restTimer.adjust(-15)
    expect(remainingMs(restTimer.get()!)).toBe(45_000)
    vi.advanceTimersByTime(45_000)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('fires immediately when −15 takes it past zero', () => {
    restTimer.start('w1', 10)
    restTimer.adjust(-15)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('restarts cleanly when a new set is ticked mid-rest', () => {
    restTimer.start('w1', 90)
    vi.advanceTimersByTime(30_000)
    restTimer.start('w1', 120)
    vi.advanceTimersByTime(90_000)
    expect(onDone).not.toHaveBeenCalled()
    vi.advanceTimersByTime(30_000)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('stop cancels the alarm', () => {
    restTimer.start('w1', 30)
    restTimer.stop()
    vi.advanceTimersByTime(60_000)
    expect(onDone).not.toHaveBeenCalled()
    expect(restTimer.get()).toBeNull()
  })
})
