import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../db/defaults'
import { dueReminders, type ReminderContext } from './reminders'

const on = {
  workout: { enabled: true, time: '18:00' },
  weighIn: { enabled: true, time: '07:30' },
  water: { enabled: true, time: '11:00' },
}
const ctx: ReminderContext = { trainingDay: 'Push', trainedToday: false, weighedToday: false, water: 2, waterGoal: 8 }
const at = (h: number, m = 0) => new Date(2026, 8, 27, h, m)
const kinds = (list: { kind: string }[]) => list.map((r) => r.kind)

describe('dueReminders', () => {
  it('only fires reminders whose time has passed', () => {
    expect(kinds(dueReminders(at(7, 29), on, ctx))).toEqual([])
    expect(kinds(dueReminders(at(7, 30), on, ctx))).toEqual(['weighIn'])
    expect(kinds(dueReminders(at(12), on, ctx))).toEqual(['weighIn', 'water'])
    expect(kinds(dueReminders(at(19), on, ctx))).toEqual(['workout', 'weighIn', 'water'])
  })

  it('skips reminders that are off, already handled, or no longer needed', () => {
    expect(dueReminders(at(19), DEFAULT_SETTINGS.reminders, ctx)).toEqual([]) // all off by default
    expect(kinds(dueReminders(at(19), on, ctx, new Set(['weighIn'])))).toEqual(['workout', 'water'])
    expect(kinds(dueReminders(at(19), on, { ...ctx, trainedToday: true, weighedToday: true, water: 8 }))).toEqual([])
    expect(kinds(dueReminders(at(19), on, { ...ctx, trainingDay: null }))).toEqual(['weighIn', 'water']) // rest day
  })

  it('writes helpful text', () => {
    const [workout] = dueReminders(at(19), on, ctx)
    expect(workout).toMatchObject({ title: 'Time to train', body: 'Push day is on the plan today.' })
  })
})
