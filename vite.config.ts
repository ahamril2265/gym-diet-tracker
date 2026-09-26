import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const THEME = '#0F0B09'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Self-signed cert so the camera works when testing on a phone over Wi-Fi (camera needs HTTPS).
    // `--mode http` skips it for plain http://localhost (already a secure context on the computer itself).
    mode !== 'http' && basicSsl({ name: 'gym-diet-tracker' }),
    VitePWA({
      // 'prompt' rather than auto-reload so an update never interrupts a live workout.
      registerType: 'prompt',
      injectRegister: false,
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Gym & Diet Tracker',
        short_name: 'Gym & Diet',
        description: 'Track workouts, Indian-friendly diet, body metrics and progress. Local-first.',
        theme_color: THEME,
        background_color: THEME,
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en-IN',
        categories: ['health', 'fitness', 'lifestyle'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}', '**/*latin-*.woff2', '**/*latin-wght*.woff2'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    host: true,
  },
}))
