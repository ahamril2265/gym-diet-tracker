import type { Config } from 'tailwindcss'

/** Design tokens from the spec. Keep every colour here so screens never hard-code hex values. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0D0E0B',
        surface: '#181A15',
        'surface-2': '#22241E',
        border: '#2A2D24',
        divider: '#26281F',
        tabbar: '#111210',
        fg: '#F2F3EC',
        muted: '#9A9E90',
        faint: '#8B8F82',
        disabled: '#5C6053',
        accent: '#C8F03C',
        'on-accent': '#0D0E0B',
        protein: '#FF8A3D',
        carbs: '#C8F03C',
        fat: '#D9DBD2',
        water: '#7CC4FF',
        danger: '#FF6B5E',
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'Impact', 'system-ui', 'sans-serif'],
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
