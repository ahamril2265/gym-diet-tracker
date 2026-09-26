import type { Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  onboarded: false,
  targetsOverride: null,
  activeSplitId: null,
  restCompoundSec: 150,
  restAccessorySec: 90,
  weightUnit: 'kg',
  lengthUnit: 'cm',
  waterGoalGlasses: 8,
  geminiApiKey: null,
  reminders: {
    workout: { enabled: false, time: '18:00' },
    weighIn: { enabled: false, time: '07:30' },
    water: { enabled: false, time: '11:00' },
  },
  seedVersions: {},
}
