import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, formatHeaderDate, fromISODate, toISODate } from './date'

describe('date helpers', () => {
  it('formats a local date without UTC shifting', () => {
    expect(toISODate(new Date(2026, 8, 26, 23, 59))).toBe('2026-09-26')
    expect(toISODate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
  })

  it('round-trips ISO dates', () => {
    expect(toISODate(fromISODate('2026-02-28'))).toBe('2026-02-28')
  })

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('counts days between dates', () => {
    expect(daysBetween('2026-09-20', '2026-09-26')).toBe(6)
    expect(daysBetween('2026-09-26', '2026-09-20')).toBe(-6)
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31)
  })

  it('formats the header date in small caps style', () => {
    expect(formatHeaderDate(new Date(2026, 8, 26))).toBe('SAT · 26 SEP')
  })
})
