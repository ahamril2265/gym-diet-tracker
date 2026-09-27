import type { Config } from 'tailwindcss'
import { colors } from './src/theme/colors.ts'

/** Design tokens live in src/theme/colors.ts (shared with the charts). */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ...colors },
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
        // Barcode scan line sweeping inside the scan frame.
        scanline: {
          '0%': { top: '8%' },
          '50%': { top: '92%' },
          '100%': { top: '8%' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        scanline: 'scanline 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
