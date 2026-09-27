import type { Settings } from '../db/types'

export type ReminderKind = 'workout' | 'weighIn' | 'water'

export const REMINDER_INFO: Record<ReminderKind, { label: string; desc: string }> = {
  workout: { label: 'Workout', desc: 'On training days, if you haven’t trained yet' },
  weighIn: { label: 'Weigh-in', desc: 'If you haven’t logged your weight today' },
  water: { label: 'Water', desc: 'If you’re below your daily water goal' },
}

/** What today looks like, for deciding which reminders still matter. */
export interface ReminderContext {
  /** Name of today's scheduled split day, or null on a rest day / no split. */
  trainingDay: string | null
  trainedToday: boolean
  weighedToday: boolean
  water: number
  waterGoal: number
}

export interface DueReminder {
  kind: ReminderKind
  title: string
  body: string
  /** Where tapping the notification (or the banner action) goes. */
  url: string
}

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/**
 * Reminders whose time has passed today, whose condition is still unmet, and that haven't been handled
 * (notified/dismissed) today. Pure, so it's easy to test.
 */
export function dueReminders(
  now: Date,
  reminders: Settings['reminders'],
  ctx: ReminderContext,
  handled: ReadonlySet<ReminderKind> = new Set(),
): DueReminder[] {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const out: DueReminder[] = []
  const ready = (kind: ReminderKind) => reminders[kind].enabled && nowMin >= minutesOf(reminders[kind].time) && !handled.has(kind)

  if (ready('workout') && ctx.trainingDay && !ctx.trainedToday) {
    out.push({ kind: 'workout', title: 'Time to train', body: `${ctx.trainingDay} day is on the plan today.`, url: '/' })
  }
  if (ready('weighIn') && !ctx.weighedToday) {
    out.push({ kind: 'weighIn', title: 'Weigh-in', body: 'Log your weight — mornings before breakfast give the steadiest trend.', url: '/progress/body' })
  }
  if (ready('water') && ctx.water < ctx.waterGoal) {
    out.push({ kind: 'water', title: 'Drink some water', body: `${ctx.water} of ${ctx.waterGoal} glasses so far today.`, url: '/' })
  }
  return out
}

export type NotifySupport = 'granted' | 'default' | 'denied' | 'unsupported'

export function notificationSupport(): NotifySupport {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission as NotifySupport
}

/** Shows a system notification via the service worker (so tapping it opens the app), or directly in dev. */
export async function showReminderNotification(r: Pick<DueReminder, 'kind' | 'title' | 'body' | 'url'>): Promise<boolean> {
  if (notificationSupport() !== 'granted') return false
  const options: NotificationOptions = {
    body: r.body,
    tag: `gdt-${r.kind}`,
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    data: { url: r.url },
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.()
    if (reg) await reg.showNotification(r.title, options)
    else new Notification(r.title, options)
    return true
  } catch {
    return false
  }
}
