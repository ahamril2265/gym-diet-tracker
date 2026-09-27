/**
 * Design tokens. Theme: Flame Hashira — golden flame hair with crimson tips, the white flame-hem haori,
 * and the charred black of the corps uniform. Tailwind reads these (tailwind.config.ts) and so do the
 * charts, so there is one source of truth for every colour.
 * All text/background pairs are ≥ 4.5:1 (flame-deep is decorative only, never behind text).
 */
export const colors = {
  // Charred, warm blacks
  bg: '#0F0B09',
  surface: '#1A1310',
  'surface-2': '#251B16',
  border: '#3A2A21',
  divider: '#2C201A',
  tabbar: '#130E0B',
  // Haori white and ash
  fg: '#FBF2E6',
  muted: '#BCA898',
  faint: '#A38F80',
  disabled: '#5F4F45',
  // Flame gold (primary accent); text on it is always the near-black on-accent
  accent: '#FFB627',
  'on-accent': '#140C06',
  // Crimson flame tips: streaks, PRs, "over target", badges
  flame: '#FF5A36',
  'flame-deep': '#D8301F',
  ember: '#FF7A1F',
  // Macros: protein burns red, carbs are the gold fuel, fat is ash white
  protein: '#FF5A36',
  carbs: '#FFB627',
  fat: '#EADCC9',
  water: '#7CC4FF',
  danger: '#FF6B8A',
} as const

/**
 * Sequential gold ramp for magnitude (heatmap), dark → light on the dark surface.
 * Validated with the dataviz ordinal check: one hue, monotone lightness, visible steps.
 */
export const goldRamp = ['#5C4418', '#8F6A1E', '#C99425', '#FFB627'] as const
