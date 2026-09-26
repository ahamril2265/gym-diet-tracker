import { toISODate } from '../lib/date'
import { db } from './db'
import { instantiateTemplate, type SplitTemplate } from './seed/splitTemplates'
import type { GoalMode, MacroTargets, Profile, Settings } from './types'

export type ProfileInput = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  await db.settings.update('app', patch)
}

/** Saves onboarding in one transaction: profile, first weigh-in, split and settings. */
export async function completeOnboarding(
  input: ProfileInput,
  template: SplitTemplate | null,
  units: Pick<Settings, 'weightUnit' | 'lengthUnit'>,
): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', [db.profile, db.bodyWeights, db.splits, db.splitDays, db.settings], async () => {
    await db.profile.put({ ...input, id: 'me', createdAt: now, updatedAt: now })
    await db.bodyWeights.put({ date: toISODate(), kg: input.weightKg })
    let activeSplitId: string | null = null
    if (template) {
      const { split, days } = instantiateTemplate(template, now)
      await db.splits.add(split)
      await db.splitDays.bulkAdd(days)
      activeSplitId = split.id
    }
    await db.settings.update('app', { onboarded: true, activeSplitId, targetsOverride: null, ...units })
  })
}

/** Profile edits. Changing weight here also records today's weigh-in. */
export async function updateProfile(patch: Partial<ProfileInput>): Promise<void> {
  await db.transaction('rw', db.profile, db.bodyWeights, async () => {
    await db.profile.update('me', { ...patch, updatedAt: Date.now() })
    if (patch.weightKg !== undefined) {
      await db.bodyWeights.put({ date: toISODate(), kg: patch.weightKg })
    }
  })
}

/** Switching goal mode drops any manual override so targets recompute everywhere. */
export async function setGoalMode(goal: GoalMode): Promise<void> {
  await db.transaction('rw', db.profile, db.settings, async () => {
    await db.profile.update('me', { goal, updatedAt: Date.now() })
    await db.settings.update('app', { targetsOverride: null })
  })
}

export async function setTargetsOverride(targets: MacroTargets | null): Promise<void> {
  await db.settings.update('app', { targetsOverride: targets })
}

/** Logs (or replaces) a weigh-in; the newest weigh-in becomes the profile weight used for targets. */
export async function logWeight(kg: number, date = toISODate()): Promise<void> {
  await db.transaction('rw', db.profile, db.bodyWeights, async () => {
    await db.bodyWeights.put({ date, kg })
    const latest = await db.bodyWeights.orderBy('date').last()
    if (latest) await db.profile.update('me', { weightKg: latest.kg, updatedAt: Date.now() })
  })
}
