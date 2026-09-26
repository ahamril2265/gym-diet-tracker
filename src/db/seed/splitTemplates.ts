import { uid } from '../../lib/id'
import type { Split, SplitDay, SplitExercise } from '../types'

type Ex = [exerciseId: string, sets: number, repMin: number, repMax: number]

interface TemplateDay {
  key: string
  name: string
  exercises: Ex[]
}

export interface SplitTemplate {
  id: string
  name: string
  blurb: string
  days: TemplateDay[]
  /** Indexed by `Date#getDay()` (0 = Sunday); value is a day `key` or `null` for rest. */
  schedule: (string | null)[]
}

export const SPLIT_TEMPLATES: SplitTemplate[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    blurb: '6 days · each muscle twice a week',
    days: [
      {
        key: 'push',
        name: 'Push',
        exercises: [
          ['bench-press', 4, 6, 8],
          ['overhead-press', 3, 8, 10],
          ['incline-db-press', 3, 8, 12],
          ['cable-lateral-raise', 3, 12, 15],
          ['tricep-pushdown', 3, 10, 12],
          ['overhead-tricep-extension', 3, 10, 12],
        ],
      },
      {
        key: 'pull',
        name: 'Pull',
        exercises: [
          ['deadlift', 3, 5, 5],
          ['pull-up', 3, 6, 10],
          ['barbell-row', 3, 8, 10],
          ['face-pull', 3, 12, 15],
          ['db-curl', 3, 10, 12],
          ['hammer-curl', 3, 10, 12],
        ],
      },
      {
        key: 'legs',
        name: 'Legs',
        exercises: [
          ['back-squat', 4, 6, 8],
          ['romanian-deadlift', 3, 8, 10],
          ['leg-press', 3, 10, 12],
          ['lying-leg-curl', 3, 10, 12],
          ['standing-calf-raise', 4, 12, 15],
          ['hanging-leg-raise', 3, 10, 15],
        ],
      },
    ],
    // Sun rest, Mon push … Sat legs
    schedule: [null, 'push', 'pull', 'legs', 'push', 'pull', 'legs'],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    blurb: '4 days · balanced strength and size',
    days: [
      {
        key: 'upper',
        name: 'Upper',
        exercises: [
          ['bench-press', 4, 6, 8],
          ['barbell-row', 4, 6, 8],
          ['overhead-press', 3, 8, 10],
          ['lat-pulldown', 3, 10, 12],
          ['db-curl', 3, 10, 12],
          ['tricep-pushdown', 3, 10, 12],
        ],
      },
      {
        key: 'lower',
        name: 'Lower',
        exercises: [
          ['back-squat', 4, 6, 8],
          ['romanian-deadlift', 3, 8, 10],
          ['leg-press', 3, 10, 12],
          ['lying-leg-curl', 3, 10, 12],
          ['standing-calf-raise', 4, 12, 15],
          ['cable-crunch', 3, 12, 15],
        ],
      },
    ],
    schedule: [null, 'upper', 'lower', null, 'upper', 'lower', null],
  },
  {
    id: 'full-body',
    name: 'Full Body',
    blurb: '3 days · great for beginners',
    days: [
      {
        key: 'a',
        name: 'Full Body A',
        exercises: [
          ['back-squat', 3, 6, 8],
          ['bench-press', 3, 6, 8],
          ['barbell-row', 3, 8, 10],
          ['lateral-raise', 3, 12, 15],
          ['db-curl', 2, 10, 12],
          ['plank', 3, 30, 60],
        ],
      },
      {
        key: 'b',
        name: 'Full Body B',
        exercises: [
          ['deadlift', 3, 5, 5],
          ['overhead-press', 3, 8, 10],
          ['lat-pulldown', 3, 10, 12],
          ['leg-press', 3, 10, 12],
          ['tricep-pushdown', 2, 10, 12],
          ['standing-calf-raise', 3, 12, 15],
        ],
      },
      {
        key: 'c',
        name: 'Full Body C',
        exercises: [
          ['front-squat', 3, 6, 8],
          ['incline-db-press', 3, 8, 12],
          ['seated-cable-row', 3, 10, 12],
          ['romanian-deadlift', 3, 8, 10],
          ['face-pull', 3, 12, 15],
          ['hanging-leg-raise', 3, 10, 15],
        ],
      },
    ],
    schedule: [null, 'a', null, 'b', null, 'c', null],
  },
  {
    id: 'bro',
    name: 'Bro Split',
    blurb: '5 days · one muscle group per day',
    days: [
      {
        key: 'chest',
        name: 'Chest',
        exercises: [
          ['bench-press', 4, 6, 8],
          ['incline-db-press', 3, 8, 12],
          ['machine-chest-press', 3, 10, 12],
          ['cable-fly', 3, 12, 15],
          ['dips', 3, 8, 12],
        ],
      },
      {
        key: 'back',
        name: 'Back',
        exercises: [
          ['deadlift', 3, 5, 5],
          ['pull-up', 3, 6, 10],
          ['barbell-row', 3, 8, 10],
          ['lat-pulldown', 3, 10, 12],
          ['seated-cable-row', 3, 10, 12],
        ],
      },
      {
        key: 'shoulders',
        name: 'Shoulders',
        exercises: [
          ['overhead-press', 4, 6, 8],
          ['db-shoulder-press', 3, 8, 12],
          ['lateral-raise', 4, 12, 15],
          ['rear-delt-fly', 3, 12, 15],
          ['db-shrug', 3, 10, 12],
        ],
      },
      {
        key: 'legs',
        name: 'Legs',
        exercises: [
          ['back-squat', 4, 6, 8],
          ['leg-press', 3, 10, 12],
          ['romanian-deadlift', 3, 8, 10],
          ['leg-extension', 3, 12, 15],
          ['lying-leg-curl', 3, 10, 12],
          ['standing-calf-raise', 4, 12, 15],
        ],
      },
      {
        key: 'arms',
        name: 'Arms',
        exercises: [
          ['close-grip-bench', 3, 6, 8],
          ['barbell-curl', 3, 8, 10],
          ['skull-crusher', 3, 10, 12],
          ['incline-db-curl', 3, 10, 12],
          ['tricep-pushdown', 3, 10, 12],
          ['hammer-curl', 3, 10, 12],
        ],
      },
    ],
    schedule: [null, 'chest', 'back', 'shoulders', 'legs', 'arms', null],
  },
]

/** Turns a template into fresh `Split` + `SplitDay` rows with new ids. */
export function instantiateTemplate(template: SplitTemplate, now = Date.now()): { split: Split; days: SplitDay[] } {
  const splitId = uid()
  const idByKey = new Map<string, string>()
  const days: SplitDay[] = template.days.map((d, order) => {
    const id = uid()
    idByKey.set(d.key, id)
    const exercises: SplitExercise[] = d.exercises.map(([exerciseId, sets, repMin, repMax]) => ({
      exerciseId,
      sets,
      repMin,
      repMax,
    }))
    return { id, splitId, name: d.name, order, exercises }
  })
  const split: Split = {
    id: splitId,
    name: template.name,
    schedule: template.schedule.map((key) => (key ? (idByKey.get(key) ?? null) : null)),
    createdAt: now,
  }
  return { split, days }
}
