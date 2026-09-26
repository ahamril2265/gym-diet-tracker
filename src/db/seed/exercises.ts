import type { Equipment, Exercise, Muscle } from '../types'

/** Bump when this list changes; new ids are added on next launch without touching user edits. */
export const EXERCISE_SEED_VERSION = 1

type Row = [id: string, name: string, muscle: Muscle, equipment: Equipment, isCompound: boolean]

const rows: Row[] = [
  // Chest
  ['bench-press', 'Bench Press', 'chest', 'barbell', true],
  ['incline-bench-press', 'Incline Bench Press', 'chest', 'barbell', true],
  ['db-bench-press', 'Dumbbell Bench Press', 'chest', 'dumbbell', true],
  ['incline-db-press', 'Incline Dumbbell Press', 'chest', 'dumbbell', true],
  ['machine-chest-press', 'Machine Chest Press', 'chest', 'machine', true],
  ['cable-fly', 'Cable Fly', 'chest', 'cable', false],
  ['pec-deck', 'Pec Deck', 'chest', 'machine', false],
  ['push-up', 'Push-up', 'chest', 'bodyweight', true],
  // Back
  ['deadlift', 'Deadlift', 'back', 'barbell', true],
  ['barbell-row', 'Barbell Row', 'back', 'barbell', true],
  ['pull-up', 'Pull-up', 'back', 'bodyweight', true],
  ['chin-up', 'Chin-up', 'back', 'bodyweight', true],
  ['lat-pulldown', 'Lat Pulldown', 'back', 'cable', true],
  ['seated-cable-row', 'Seated Cable Row', 'back', 'cable', true],
  ['db-row', 'One-arm Dumbbell Row', 'back', 'dumbbell', true],
  ['t-bar-row', 'T-bar Row', 'back', 'barbell', true],
  ['chest-supported-row', 'Chest-supported Row', 'back', 'machine', true],
  ['straight-arm-pulldown', 'Straight-arm Pulldown', 'back', 'cable', false],
  // Shoulders
  ['overhead-press', 'Overhead Press', 'shoulders', 'barbell', true],
  ['db-shoulder-press', 'Dumbbell Shoulder Press', 'shoulders', 'dumbbell', true],
  ['arnold-press', 'Arnold Press', 'shoulders', 'dumbbell', true],
  ['lateral-raise', 'Lateral Raise', 'shoulders', 'dumbbell', false],
  ['cable-lateral-raise', 'Cable Lateral Raise', 'shoulders', 'cable', false],
  ['rear-delt-fly', 'Rear Delt Fly', 'shoulders', 'dumbbell', false],
  ['face-pull', 'Face Pull', 'shoulders', 'cable', false],
  // Biceps
  ['barbell-curl', 'Barbell Curl', 'biceps', 'barbell', false],
  ['db-curl', 'Dumbbell Curl', 'biceps', 'dumbbell', false],
  ['hammer-curl', 'Hammer Curl', 'biceps', 'dumbbell', false],
  ['incline-db-curl', 'Incline Dumbbell Curl', 'biceps', 'dumbbell', false],
  ['preacher-curl', 'Preacher Curl', 'biceps', 'ez-bar', false],
  ['cable-curl', 'Cable Curl', 'biceps', 'cable', false],
  // Triceps
  ['close-grip-bench', 'Close-grip Bench Press', 'triceps', 'barbell', true],
  ['dips', 'Dips', 'triceps', 'bodyweight', true],
  ['tricep-pushdown', 'Triceps Pushdown', 'triceps', 'cable', false],
  ['overhead-tricep-extension', 'Overhead Triceps Extension', 'triceps', 'cable', false],
  ['skull-crusher', 'Skull Crusher', 'triceps', 'ez-bar', false],
  // Quads
  ['back-squat', 'Back Squat', 'quads', 'barbell', true],
  ['front-squat', 'Front Squat', 'quads', 'barbell', true],
  ['leg-press', 'Leg Press', 'quads', 'machine', true],
  ['hack-squat', 'Hack Squat', 'quads', 'machine', true],
  ['goblet-squat', 'Goblet Squat', 'quads', 'dumbbell', true],
  ['bulgarian-split-squat', 'Bulgarian Split Squat', 'quads', 'dumbbell', true],
  ['walking-lunge', 'Walking Lunge', 'quads', 'dumbbell', true],
  ['leg-extension', 'Leg Extension', 'quads', 'machine', false],
  // Hamstrings
  ['romanian-deadlift', 'Romanian Deadlift', 'hamstrings', 'barbell', true],
  ['good-morning', 'Good Morning', 'hamstrings', 'barbell', true],
  ['lying-leg-curl', 'Lying Leg Curl', 'hamstrings', 'machine', false],
  ['seated-leg-curl', 'Seated Leg Curl', 'hamstrings', 'machine', false],
  // Glutes
  ['hip-thrust', 'Hip Thrust', 'glutes', 'barbell', true],
  ['glute-bridge', 'Glute Bridge', 'glutes', 'bodyweight', false],
  ['cable-kickback', 'Cable Kickback', 'glutes', 'cable', false],
  ['hip-abduction', 'Hip Abduction', 'glutes', 'machine', false],
  // Calves
  ['standing-calf-raise', 'Standing Calf Raise', 'calves', 'machine', false],
  ['seated-calf-raise', 'Seated Calf Raise', 'calves', 'machine', false],
  // Abs
  ['plank', 'Plank (seconds)', 'abs', 'bodyweight', false],
  ['hanging-leg-raise', 'Hanging Leg Raise', 'abs', 'bodyweight', false],
  ['cable-crunch', 'Cable Crunch', 'abs', 'cable', false],
  ['ab-wheel', 'Ab Wheel Rollout', 'abs', 'bodyweight', false],
  ['russian-twist', 'Russian Twist', 'abs', 'bodyweight', false],
  // Traps & forearms
  ['db-shrug', 'Dumbbell Shrug', 'traps', 'dumbbell', false],
  ['wrist-curl', 'Wrist Curl', 'forearms', 'dumbbell', false],
  ['farmers-carry', "Farmer's Carry", 'forearms', 'dumbbell', true],
]

export const SEED_EXERCISES: Exercise[] = rows.map(([id, name, muscle, equipment, isCompound]) => ({
  id,
  name,
  muscle,
  equipment,
  isCompound,
  custom: false,
}))

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  traps: 'Traps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  'ez-bar': 'EZ bar',
  kettlebell: 'Kettlebell',
  smith: 'Smith machine',
  band: 'Band',
}
