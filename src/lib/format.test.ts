import { describe, expect, it } from 'vitest'
import { formatClock, formatDuration, formatSet, formatShortDate, formatTarget, formatVolume, formatWeightValue } from './format'

describe('format', () => {
  it('formats clocks', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(45_000)).toBe('0:45')
    expect(formatClock(12 * 60_000 + 3_000)).toBe('12:03')
    expect(formatClock(3_909_000)).toBe('1:05:09')
    expect(formatClock(-5000)).toBe('0:00')
  })

  it('formats durations', () => {
    expect(formatDuration(8 * 60_000)).toBe('8 min')
    expect(formatDuration(65 * 60_000)).toBe('1 h 5 min')
    expect(formatDuration(120 * 60_000)).toBe('2 h')
  })

  it('formats sets and weights in either unit', () => {
    expect(formatSet(62.5, 8, 'kg')).toBe('62.5 × 8')
    expect(formatSet(100, 5, 'lb')).toBe('220.5 × 5')
    expect(formatSet(0, 12, 'kg')).toBe('12 reps')
    expect(formatSet(null, null, 'kg')).toBe('—')
    expect(formatWeightValue(61.23497, 'lb')).toBe('135')
  })

  it('formats volume and targets', () => {
    expect(formatVolume(12340, 'kg')).toBe('12,340 kg')
    expect(formatTarget({ sets: 3, repMin: 8, repMax: 12 })).toBe('3 × 8–12')
    expect(formatTarget({ sets: 4, repMin: 5, repMax: 5 })).toBe('4 × 5')
  })

  it('formats short dates consistently', () => {
    expect(formatShortDate(new Date(2026, 8, 26))).toBe('Sat 26 Sep')
  })
})
