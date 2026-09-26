import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Exercise, MacroTargets, Profile, Settings, Split, SplitDay } from '../db/types'
import { calcTargets } from '../lib/calc/targets'

/** `undefined` while loading. */
export function useSettings(): Settings | undefined {
  return useLiveQuery(() => db.settings.get('app'))
}

/** `undefined` while loading, `null` before onboarding. */
export function useProfile(): Profile | null | undefined {
  return useLiveQuery(async () => (await db.profile.get('me')) ?? null)
}

export interface TargetsInfo {
  targets: MacroTargets
  calculated: MacroTargets
  isCustom: boolean
}

/** Targets currently in effect: the manual override if set, otherwise calculated from the profile. */
export function resolveTargets(profile: Profile, settings: Settings): TargetsInfo {
  const calculated = calcTargets(profile)
  return {
    calculated,
    targets: settings.targetsOverride ?? calculated,
    isCustom: settings.targetsOverride !== null,
  }
}

export function useTargets(): TargetsInfo | null | undefined {
  const profile = useProfile()
  const settings = useSettings()
  if (profile === undefined || settings === undefined) return undefined
  if (profile === null) return null
  return resolveTargets(profile, settings)
}

export interface ActiveSplit {
  split: Split
  days: SplitDay[]
}

/** `undefined` while loading, `null` when no split is set up. */
export function useActiveSplit(): ActiveSplit | null | undefined {
  return useLiveQuery(async () => {
    const settings = await db.settings.get('app')
    if (!settings?.activeSplitId) return null
    const split = await db.splits.get(settings.activeSplitId)
    if (!split) return null
    const days = await db.splitDays.where('splitId').equals(split.id).sortBy('order')
    return { split, days }
  })
}

/** All exercises keyed by id. */
export function useExerciseMap(): Map<string, Exercise> | undefined {
  return useLiveQuery(async () => new Map((await db.exercises.toArray()).map((e) => [e.id, e])))
}
