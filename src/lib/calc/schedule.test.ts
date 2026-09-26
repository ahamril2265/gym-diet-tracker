import { describe, expect, it } from 'vitest'
import type { Split, SplitDay } from '../../db/types'
import { planForDate } from './schedule'

const day = (id: string, name: string): SplitDay => ({ id, splitId: 's', name, order: 0, exercises: [] })
const push = day('p', 'Push')
const pull = day('l', 'Pull')
// Sun rest, Mon push, Tue pull, Wed–Sat rest
const split: Split = { id: 's', name: 'Test', createdAt: 0, schedule: [null, 'p', 'l', null, null, null, null] }

describe('planForDate', () => {
  it('returns the scheduled day and the next training day', () => {
    const monday = new Date(2026, 8, 21) // Mon 21 Sep 2026
    expect(planForDate(split, [push, pull], monday)).toEqual({ day: push, next: { day: pull, inDays: 1 } })
  })

  it('returns null on rest days and wraps to next week', () => {
    const wednesday = new Date(2026, 8, 23)
    expect(planForDate(split, [push, pull], wednesday)).toEqual({ day: null, next: { day: push, inDays: 5 } })
  })

  it('handles a split with no training days', () => {
    const empty: Split = { ...split, schedule: Array(7).fill(null) }
    expect(planForDate(empty, [], new Date(2026, 8, 23))).toEqual({ day: null, next: null })
  })
})
