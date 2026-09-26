import type { WorkoutSet } from '../../db/types'

export type SetLike = Pick<WorkoutSet, 'kg' | 'reps' | 'isWarmup' | 'done'>

/** A ticked working set with real numbers. Warm-ups never count toward volume, 1RM or PRs. */
export function isCountedSet(s: SetLike): s is SetLike & { kg: number; reps: number } {
  return s.done && !s.isWarmup && s.kg !== null && s.reps !== null && s.reps > 0 && s.kg >= 0
}

/** Estimated 1RM, Epley: `w × (1 + reps / 30)`. */
export function epley1RM(kg: number, reps: number): number {
  if (kg <= 0 || reps <= 0) return 0
  return kg * (1 + reps / 30)
}

/** Volume = Σ kg × reps over ticked working sets. */
export function volume(sets: SetLike[]): number {
  let total = 0
  for (const s of sets) if (isCountedSet(s)) total += s.kg * s.reps
  return total
}

/** Personal bests for one exercise. `kgByReps[r]` = heaviest kg lifted for exactly r reps. */
export interface Bests {
  e1rm: number
  kgByReps: Record<number, number>
  /** Number of loaded working sets these bests were built from. */
  count: number
}

export const emptyBests = (): Bests => ({ e1rm: 0, kgByReps: {}, count: 0 })

function addToBests(b: Bests, kg: number, reps: number): void {
  b.e1rm = Math.max(b.e1rm, epley1RM(kg, reps))
  b.kgByReps[reps] = Math.max(b.kgByReps[reps] ?? 0, kg)
  b.count += 1
}

/** Builds bests from past sets (only loaded, ticked working sets count). */
export function bestsOf(sets: SetLike[]): Bests {
  const b = emptyBests()
  for (const s of sets) if (isCountedSet(s) && s.kg > 0) addToBests(b, s.kg, s.reps)
  return b
}

/** Heaviest kg ever lifted for at least `reps` reps, or `undefined` if never done that many. */
export function heaviestForAtLeast(b: Bests, reps: number): number | undefined {
  let best: number | undefined
  for (const [r, kg] of Object.entries(b.kgByReps)) {
    if (Number(r) >= reps && (best === undefined || kg > best)) best = kg
  }
  return best
}

export type PRKind = 'e1rm' | 'weight'

/**
 * Flags PR sets in a session, in order. A set is a PR when it beats the best estimated 1RM so far,
 * or lifts more than ever before for that many reps (or more). Earlier sets in the same session count
 * toward "so far", so repeating a PR weight isn't a second PR.
 *
 * Nothing is flagged for an exercise with no history — the first session only sets the baseline.
 */
export function detectPRs<T extends SetLike & { id: string }>(history: Bests, ordered: T[]): Map<string, PRKind[]> {
  const prs = new Map<string, PRKind[]>()
  if (history.count === 0) return prs
  const running: Bests = { e1rm: history.e1rm, kgByReps: { ...history.kgByReps }, count: history.count }
  for (const s of ordered) {
    if (!isCountedSet(s) || s.kg <= 0) continue
    const kinds: PRKind[] = []
    if (epley1RM(s.kg, s.reps) > running.e1rm + 1e-9) kinds.push('e1rm')
    const prevHeaviest = heaviestForAtLeast(running, s.reps)
    if (prevHeaviest !== undefined && s.kg > prevHeaviest + 1e-9) kinds.push('weight')
    if (kinds.length) prs.set(s.id, kinds)
    addToBests(running, s.kg, s.reps)
  }
  return prs
}

export interface PlannedSet {
  isWarmup: boolean
  kg: number | null
  reps: number | null
}

type OrderedSet = SetLike & { order: number }

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order

/**
 * Sets for a new session, prefilled from the last session of the same exercise: its warm-ups are
 * repeated, then `targetSets` working sets take the matching previous working set's kg/reps
 * (extra sets copy the last one). With no history, values stay empty.
 */
export function planSets(previous: OrderedSet[], targetSets: number): PlannedSet[] {
  const sorted = [...previous].sort(byOrder)
  const warm = sorted.filter((s) => s.isWarmup)
  const work = sorted.filter((s) => !s.isWarmup)
  const workingCount = targetSets > 0 ? targetSets : Math.max(work.length, 3)
  const planned: PlannedSet[] = warm.map((s) => ({ isWarmup: true, kg: s.kg, reps: s.reps }))
  for (let i = 0; i < workingCount; i++) {
    const src = work[i] ?? work[work.length - 1]
    planned.push({ isWarmup: false, kg: src?.kg ?? null, reps: src?.reps ?? null })
  }
  return planned
}

/**
 * Pairs each current set with "the same set" last session: the n-th warm-up with the n-th warm-up,
 * the n-th working set with the n-th working set.
 */
export function matchPrevious<C extends { id: string; isWarmup: boolean; order: number }, P extends OrderedSet>(
  current: C[],
  previous: P[],
): Map<string, P> {
  const prevWarm = previous.filter((s) => s.isWarmup).sort(byOrder)
  const prevWork = previous.filter((s) => !s.isWarmup).sort(byOrder)
  const out = new Map<string, P>()
  let w = 0
  let k = 0
  for (const s of [...current].sort(byOrder)) {
    const p = s.isWarmup ? prevWarm[w++] : prevWork[k++]
    if (p) out.set(s.id, p)
  }
  return out
}
