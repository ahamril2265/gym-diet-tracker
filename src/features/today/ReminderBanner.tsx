import { BellRing, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { ButtonLink, IconButton } from '../../components/Button'
import { dismissReminder, reminderStore } from '../../lib/reminderEngine'
import type { ReminderKind } from '../../lib/reminders'

const ACTION: Record<ReminderKind, { label: string; to: string }> = {
  workout: { label: 'Train', to: '/train' },
  weighIn: { label: 'Log weight', to: '/progress/body' },
  water: { label: 'Log water', to: '/' },
}

/** Due reminders, shown in the app too (system notifications can't fire while the app is closed). */
export function ReminderBanner() {
  const due = useSyncExternalStore(reminderStore.subscribe, reminderStore.get)
  if (due.length === 0) return null
  return (
    <ul className="flex flex-col gap-2" aria-label="Reminders">
      {due.map((r) => (
        <li key={r.kind} className="flex items-center gap-3 rounded-card border border-flame/40 bg-flame/10 py-2 pl-3 pr-1">
          <BellRing size={20} className="shrink-0 text-flame" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-extrabold">{r.title}</p>
            <p className="text-[13px] font-semibold text-muted">{r.body}</p>
          </div>
          {r.kind !== 'water' && (
            <ButtonLink to={ACTION[r.kind].to} size="sm" variant="surface" className="shrink-0">
              {ACTION[r.kind].label}
            </ButtonLink>
          )}
          <IconButton label={`Dismiss ${r.title} reminder for today`} variant="ghost" onClick={() => dismissReminder(r.kind)}>
            <X size={18} aria-hidden="true" />
          </IconButton>
        </li>
      ))}
    </ul>
  )
}
