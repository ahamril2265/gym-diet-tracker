import type { Config } from 'tailwindcss'

/**
 * Design tokens. Theme: Flame Hashira — golden flame hair with crimson tips, the white flame-hem haori,
 * and the charred black of the corps uniform. Keep every colour here so screens never hard-code hex values.
 * All text/background pairs are ≥ 4.5:1 (flame-deep is decorative only, never behind text).
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'Impact', 'system-ui', 'sans-serif'],
        // 炎 watermark only; every phone OS ships one of these CJK fonts.
        jp: ['"Noto Sans JP"', '"Hiragino Sans"', '"Hiragino Kaku Gothic ProN"', '"Yu Gothic"', '"Noto Sans CJK JP"', 'sans-serif'],
        sans: ['"Manrope Variable"', 'Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'card-sm': '18px',
        card: '20px',
        'card-lg': '22px',
        btn: '14px',
        'btn-sm': '12px',
      },
      spacing: {
        tabbar: '84px',
        touch: '44px',
      },
      maxWidth: {
        app: '430px',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      keyframes: {
        shimmer: {
          '0%': { opacity: '0.55' },
          '50%': { opacity: '0.9' },
          '100%': { opacity: '0.55' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
