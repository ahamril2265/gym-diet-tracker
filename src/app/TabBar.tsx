import { ChartLine, Dumbbell, House, User, Utensils, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { cx } from '../components/cx'

const TABS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Today', icon: House, end: true },
  { to: '/train', label: 'Train', icon: Dumbbell },
  { to: '/eat', label: 'Eat', icon: Utensils },
  { to: '/progress', label: 'Progress', icon: ChartLine },
  { to: '/me', label: 'Me', icon: User },
]

export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed bottom-0 left-1/2 z-30 h-tabbar w-full max-w-app -translate-x-1/2 border-t border-divider bg-tabbar"
    >
      <ul className="flex h-full items-stretch">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  'relative flex h-full min-h-touch flex-col items-center justify-center gap-1 text-[11px] font-bold tracking-[0.02em] transition-colors',
                  isActive ? 'text-accent' : 'text-faint',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Crimson "flame tip" over the gold active tab */}
                  {isActive && <span aria-hidden="true" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-flame" />}
                  <Icon size={24} strokeWidth={2} aria-hidden="true" />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
