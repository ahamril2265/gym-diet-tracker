import { cx } from '../../components/cx'
import type { MacroTargets } from '../../db/types'

const TILES = [
  { key: 'protein', label: 'Protein', color: 'text-protein' },
  { key: 'carbs', label: 'Carbs', color: 'text-carbs' },
  { key: 'fat', label: 'Fat', color: 'text-fat' },
] as const

/** Read-only display of daily targets: big kcal number plus P / C / F. */
export function TargetTiles({ targets }: { targets: MacroTargets }) {
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span className="h-display num text-[52px] leading-none">{targets.kcal.toLocaleString('en-IN')}</span>
        <span className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-muted">kcal / day</span>
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {TILES.map((t) => (
          <div key={t.key} className="rounded-btn bg-surface-2 px-3 py-2.5">
            <dt className={cx('text-[11px] font-extrabold uppercase tracking-[0.08em]', t.color)}>{t.label}</dt>
            <dd className="h-display num mt-0.5 text-[26px] leading-none">
              {targets[t.key]}
              <span className="ml-0.5 font-sans text-[13px] font-bold normal-case text-muted">g</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
