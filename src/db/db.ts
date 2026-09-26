import Dexie, { type EntityTable } from 'dexie'
import type {
  BodyWeight,
  Exercise,
  Food,
  FoodLog,
  Measurement,
  Profile,
  ProgressPhoto,
  Settings,
  Split,
  SplitDay,
  WaterLog,
  Workout,
  WorkoutSet,
} from './types'

export type AppDB = Dexie & {
  profile: EntityTable<Profile, 'id'>
  settings: EntityTable<Settings, 'id'>
  exercises: EntityTable<Exercise, 'id'>
  splits: EntityTable<Split, 'id'>
  splitDays: EntityTable<SplitDay, 'id'>
  workouts: EntityTable<Workout, 'id'>
  sets: EntityTable<WorkoutSet, 'id'>
  foods: EntityTable<Food, 'id'>
  foodLogs: EntityTable<FoodLog, 'id'>
  bodyWeights: EntityTable<BodyWeight, 'date'>
  measurements: EntityTable<Measurement, 'id'>
  photos: EntityTable<ProgressPhoto, 'id'>
  water: EntityTable<WaterLog, 'date'>
}

export const DB_NAME = 'gym-diet-tracker'

export function createDb(name = DB_NAME): AppDB {
  const db = new Dexie(name) as AppDB
  // Only indexed fields are listed; other fields are stored but not indexed.
  db.version(1).stores({
    profile: 'id',
    settings: 'id',
    exercises: 'id, name, muscle, equipment',
    splits: 'id',
    splitDays: 'id, splitId',
    workouts: 'id, date, splitDayId, startedAt',
    sets: 'id, workoutId, exerciseId, date, [exerciseId+date]',
    foods: 'id, name, barcode, source',
    foodLogs: 'id, date, [date+meal], foodId',
    bodyWeights: 'date',
    measurements: 'id, date, site, [site+date]',
    photos: 'id, date, pose',
    water: 'date',
  })
  return db
}

export const db = createDb()
