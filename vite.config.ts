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
        // The Gemini SDK and ZXing are big and only needed when scanning (Gemini needs internet anyway;
        // ZXing is the iOS barcode fallback), so they're cached on first use instead of at install.
        globIgnores: ['**/vendor-genai-*.js', '**/vendor-zxing-*.js'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/vendor-(genai|zxing)-/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'lazy-vendor', expiration: { maxEntries: 8 } },
          },
          {
            // Product photos from Open Food Facts, so saved products still show their pack offline.
            urlPattern: ({ url }) => url.hostname === 'images.openfoodfacts.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'off-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Opens the app on the right screen when a reminder notification is tapped.
        importScripts: ['sw-notifications.js'],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Stable names for the heavy on-demand libraries (see globIgnores above).
        codeSplitting: {
          groups: [
            { name: 'vendor-genai', test: /node_modules[\\/]@google[\\/]genai/ },
            { name: 'vendor-zxing', test: /node_modules[\\/]@zxing[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    host: true,
  },
}))
