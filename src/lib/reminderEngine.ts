import { liveQuery } from 'dexie'
import { db } from '../db/db'
import type { Settings } from '../db/types'
import { planForDate } from './calc/schedule'
import { toISODate } from './date'
import { dueReminders, showReminderNotification, type DueReminder, type ReminderContext, type ReminderKind } from './reminders'

/*
 * Runs while the app is open (or recently backgrounded): once a minute, when the app becomes visible,
 * and whenever relevant data changes. Web apps can't schedule alarms that fire while fully closed
 * without a push server, so missed reminders show as banners on Today the next time the app opens.
 */

const KEY = 'gdt.reminders.handled'

interface Handled {
  date: string
  notified: ReminderKind[]
  dismissed: ReminderKind[]
}

function loadHandled(today: string): Handled {
  try {
    const h = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Handled | null
    if (h?.date === today) return h
  } catch {
    // ignore
  }
  return { date: today, notified: [], dismissed: [] }
}

function saveHandled(h: Handled) {
  try {
    localStorage.setItem(KEY, JSON.stringify(h))
  } catch {
    // Storage unavailable: reminders may repeat, nothing worse.
  }
}

let due: DueReminder[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const reminderStore = {
  get: () => due,
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

async function readContext(): Promise<{ ctx: ReminderContext; reminders: Settings['reminders'] } | null> {
  const today = toISODate()
  const settings = await db.settings.get('app')
  if (!settings?.onboarded) return null
  const split = settings.activeSplitId ? await db.splits.get(settings.activeSplitId) : undefined
  const days = split ? await db.splitDays.where('splitId').equals(split.id).toArray() : []
  const [workoutsToday, weight, water] = await Promise.all([
    db.workouts.where('date').equals(today).count(),
    db.bodyWeights.get(today),
    db.water.get(today),
  ])
  return {
    reminders: settings.reminders,
    ctx: {
      trainingDay: split ? (planForDate(split, days, new Date()).day?.name ?? null) : null,
      trainedToday: workoutsToday > 0,
      weighedToday: Boolean(weight),
      water: water?.glasses ?? 0,
      waterGoal: settings.waterGoalGlasses,
    },
  }
}

async function check() {
  const today = toISODate()
  const data = await readContext()
  if (!data) {
    due = []
    return emit()
  }
  const handled = loadHandled(today)
  const list = dueReminders(new Date(), data.reminders, data.ctx, new Set(handled.dismissed))
  for (const r of list) {
    if (handled.notified.includes(r.kind)) continue
    handled.notified.push(r.kind)
    saveHandled(handled)
    void showReminderNotification(r)
  }
  due = list
  emit()
}

export function dismissReminder(kind: ReminderKind) {
  const h = loadHandled(toISODate())
  if (!h.dismissed.includes(kind)) h.dismissed.push(kind)
  saveHandled(h)
  due = due.filter((r) => r.kind !== kind)
  emit()
}

let started = false

export function startReminderEngine() {
  if (started) return
  started = true
  // Re-check whenever the data behind the reminders changes (a weigh-in, a workout, water…).
  liveQuery(readContext).subscribe({ next: () => void check(), error: () => {} })
  window.setInterval(() => void check(), 60_000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check()
  })
}

/** For the "Send test notification" button. */
export function testReminderNotification() {
  return showReminderNotification({ kind: 'water', title: 'Reminders are on', body: 'This is how reminders will look.', url: '/' })
}
