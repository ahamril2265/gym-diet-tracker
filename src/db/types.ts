/** Local calendar date, `YYYY-MM-DD`. Every day-based table is keyed/indexed by this. */
export type ISODate = string

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type GoalMode = 'bulk' | 'cut' | 'recomp'
export type WeightUnit = 'kg' | 'lb'
export type LengthUnit = 'cm' | 'in'

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export type MacroTargets = Macros

/** Singleton row, id is always `'me'`. Body values are always stored metric. */
export interface Profile {
  id: 'me'
  name: string
  sex: Sex
  age: number
  heightCm: number
  /** Latest known body weight; kept in sync with the newest `bodyWeights` entry. */
  weightKg: number
  activity: ActivityLevel
  goal: GoalMode
  createdAt: number
  updatedAt: number
}

export interface ReminderSetting {
  enabled: boolean
  /** `HH:mm`, local time */
  time: string
}

/** Singleton row, id is always `'app'`. */
export interface Settings {
  id: 'app'
  onboarded: boolean
  /** `null` means "use the calculated targets". */
  targetsOverride: MacroTargets | null
  activeSplitId: string | null
  restCompoundSec: number
  restAccessorySec: number
  weightUnit: WeightUnit
  lengthUnit: LengthUnit
  waterGoalGlasses: number
  geminiApiKey: string | null
  reminders: {
    workout: ReminderSetting
    weighIn: ReminderSetting
    water: ReminderSetting
  }
  /** Bumped when a seed list changes so new built-in items get added on next launch. */
  seedVersions: Record<string, number>
}

export type Muscle =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'traps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'ez-bar'
  | 'kettlebell'
  | 'smith'
  | 'band'

export interface Exercise {
  id: string
  name: string
  muscle: Muscle
  equipment: Equipment
  isCompound: boolean
  custom: boolean
}

export interface SplitExercise {
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
}

/**
 * A split is a weekly plan. `schedule` has 7 entries indexed like `Date#getDay()`
 * (0 = Sunday … 6 = Saturday); each entry is a `SplitDay.id` or `null` for a rest day.
 */
export interface Split {
  id: string
  name: string
  schedule: (string | null)[]
  createdAt: number
}

export interface SplitDay {
  id: string
  splitId: string
  name: string
  order: number
  exercises: SplitExercise[]
}

export interface Workout {
  id: string
  date: ISODate
  splitDayId: string | null
  /** Snapshot of the day name ("Push") so history survives split edits. */
  name: string
  startedAt: number
  endedAt: number | null
  notes: string
  /** Exercise ids in session order (drives "Up next"). */
  exerciseOrder: string[]
  exerciseNotes: Record<string, string>
  /** Planned sets/reps per exercise (from the split day, or defaults for added exercises). */
  targets: Record<string, { sets: number; repMin: number; repMax: number }>
}

export interface WorkoutSet {
  id: string
  workoutId: string
  exerciseId: string
  /** Denormalised from the workout for fast history queries. */
  date: ISODate
  order: number
  /** `null` until entered. Always stored in kg. */
  kg: number | null
  reps: number | null
  isWarmup: boolean
  done: boolean
  rpe?: number
  completedAt?: number
}

export interface Serving {
  label: string
  grams: number
}

export type FoodSource = 'local' | 'off' | 'ai' | 'custom'

export interface Food {
  id: string
  name: string
  brand?: string
  per100g: Macros
  servings: Serving[]
  source: FoodSource
  barcode?: string
  /** Seed values from IFCT 2017 / NIN tables are estimates. */
  approximate?: boolean
  imageUrl?: string
  packQuantity?: string
  aliases?: string[]
  updatedAt: number
}

export type Meal = 'breakfast' | 'lunch' | 'snacks' | 'dinner'

export interface FoodLog {
  id: string
  date: ISODate
  meal: Meal
  /** `null` when the item only exists as an inline snapshot (e.g. an AI scan). */
  foodId: string | null
  name: string
  /** Human label for the portion, e.g. "2 roti" or "1.5 katori". */
  portionLabel: string
  grams: number
  /** How the portion was chosen, so editing reopens the same serving and quantity. */
  serving?: { label: string; grams: number; qty: number }
  /** Macros for this portion, frozen at log time. */
  macros: Macros
  aiScan?: boolean
  createdAt: number
}

export interface BodyWeight {
  date: ISODate
  kg: number
}

export type MeasurementSite =
  | 'chest'
  | 'waist'
  | 'hips'
  | 'arm'
  | 'forearm'
  | 'thigh'
  | 'calf'
  | 'neck'
  | 'shoulders'

export interface Measurement {
  id: string
  date: ISODate
  site: MeasurementSite
  cm: number
}

export type PhotoPose = 'front' | 'side' | 'back'

export interface ProgressPhoto {
  id: string
  date: ISODate
  pose: PhotoPose
  blob: Blob
  createdAt: number
}

export interface WaterLog {
  date: ISODate
  glasses: number
}
