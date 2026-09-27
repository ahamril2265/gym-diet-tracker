import { Bell, BellOff, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button, IconButton } from '../../components/Button'
import { Switch } from '../../components/Switch'
import { updateSettings } from '../../db/actions'
import type { Settings } from '../../db/types'
import { testReminderNotification } from '../../lib/reminderEngine'
import { notificationSupport, REMINDER_INFO, type NotifySupport, type ReminderKind } from '../../lib/reminders'

const KINDS: ReminderKind[] = ['workout', 'weighIn', 'water']

const STATUS: Record<NotifySupport, string> = {
  granted: 'Notifications are allowed.',
  default: 'Allow notifications so reminders can pop up on your phone.',
  denied: 'Notifications are blocked for this site — allow them in your browser’s site settings. Reminders still show on Today.',
  unsupported:
    'This browser can’t show notifications. On iPhone, add the app to your Home Screen first (iOS 16.4+). Reminders still show on Today.',
}

export function RemindersCard({ settings }: { settings: Settings }) {
  const [support, setSupport] = useState<NotifySupport>(() => notificationSupport())
  const [tested, setTested] = useState<string | null>(null)
  const r = settings.reminders

  const ask = async () => {
    if (support !== 'default') return
    try {
      setSupport((await Notification.requestPermission()) as NotifySupport)
    } catch {
      setSupport(notificationSupport())
    }
  }

  const set = async (kind: ReminderKind, patch: Partial<Settings['reminders'][ReminderKind]>) => {
    await updateSettings({ reminders: { ...r, [kind]: { ...r[kind], ...patch } } })
    // Turning a reminder on is a good moment to ask (it's a direct tap, which browsers require).
    if (patch.enabled) await ask()
  }

  return (
    <section className="card flex flex-col gap-4 p-5" aria-labelledby="rem-h">
      <h2 id="rem-h" className="h-display text-[24px]">
        Reminders
      </h2>
      <p className="flex items-start gap-2 text-[13px] font-semibold text-muted">
        {support === 'granted' ? (
          <Bell size={16} className="mt-px shrink-0 text-accent" aria-hidden="true" />
        ) : (
          <BellOff size={16} className="mt-px shrink-0" aria-hidden="true" />
        )}
        {STATUS[support]}
      </p>
      {support === 'default' && (
        <Button size="sm" variant="surface" className="self-start" onClick={() => void ask()}>
          Allow notifications
        </Button>
      )}

      <ul className="flex flex-col divide-y divide-divider">
        {KINDS.map((kind) => (
          <li key={kind} className="flex items-center gap-2 py-2">
            <Switch checked={r[kind].enabled} onChange={(v) => void set(kind, { enabled: v })} label={`${REMINDER_INFO[kind].label} reminder`} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold">{REMINDER_INFO[kind].label}</p>
              <p className="text-[12px] font-semibold text-faint">{REMINDER_INFO[kind].desc}</p>
            </div>
            <label className="shrink-0">
              <span className="sr-only">{REMINDER_INFO[kind].label} reminder time</span>
              <input
                type="time"
                className="input num h-11 w-[132px] px-2 text-[14px]"
                value={r[kind].time}
                disabled={!r[kind].enabled}
                onChange={(e) => e.target.value && void set(kind, { time: e.target.value })}
              />
            </label>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-bold">Daily water goal</span>
        <div className="flex items-center gap-2">
          <IconButton
            label="One glass less"
            disabled={settings.waterGoalGlasses <= 1}
            onClick={() => void updateSettings({ waterGoalGlasses: settings.waterGoalGlasses - 1 })}
          >
            <Minus size={18} aria-hidden="true" />
          </IconButton>
          <output className="h-display num w-20 text-center text-[24px]" aria-live="polite">
            {settings.waterGoalGlasses} <span className="font-sans text-[12px] font-bold normal-case text-muted">glasses</span>
          </output>
          <IconButton
            label="One glass more"
            disabled={settings.waterGoalGlasses >= 20}
            onClick={() => void updateSettings({ waterGoalGlasses: settings.waterGoalGlasses + 1 })}
          >
            <Plus size={18} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      {support === 'granted' && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => setTested((await testReminderNotification()) ? 'Sent — check your notifications.' : 'Couldn’t show a notification.')}
          >
            Send a test notification
          </Button>
          {tested && (
            <span role="status" className="text-[13px] font-semibold text-muted">
              {tested}
            </span>
          )}
        </div>
      )}
      <p className="text-[12px] text-faint">
        Reminders pop up while the app is open or recently used. Phones close web apps in the background, so if a
        reminder is missed you’ll see it on Today the next time you open the app.
      </p>
    </section>
  )
}
