# Gym & Diet Tracker

A personal, local-first fitness app for your phone: gym sessions, Indian-friendly food logging with barcode
and AI photo scanning, body metrics, and progress charts. It's a PWA — install it to your home screen and it
works offline. There's no account and no backend: **your data stays on your device.**

## Features

- **Today** — calories left and macros, today's session from your weekly split, streak, quick tiles
  (meal scan, weight, water), last session summary, reminders.
- **Train** — routines you build by picking exercises (or start from PPL / Upper-Lower / Full Body / Bro
  templates), weekly schedule, exercise library (60+ plus your own), live workout with rest timer, PREVIOUS
  column and prefill from last time, warm-ups, PR badges, finish summary, history.
- **Eat** — 7-day log with meals, ~135 common Indian foods in household portions (katori, roti, idli…),
  search with Hindi/regional names, quick add, edit any food, swipe to edit/delete, copy the previous day.
- **Camera** — barcode lookup via Open Food Facts (with a nutrition-label photo fallback) and meal photos
  recognised by Google Gemini with portion estimates and boxes on the photo.
- **Progress** — estimated 1RM charts, PRs, sets per muscle vs a 10–20 target zone, 12-week consistency
  heatmap, nutrition averages, weight trend, measurements, private progress photos with side-by-side compare.
- **Me** — profile, goal mode (bulk / cut / recomp) with auto-calculated targets, split editor, rest
  timers, units, Gemini key, reminders, backup / restore / CSV export.

## Quick start

Requirements: **Node.js 22.12+** and npm.

```bash
npm install
npm run dev        # https://localhost:5173 and your LAN address (for phone testing)
npm run dev:http   # http://localhost:5174 — plain http, quickest on the computer
```

## Test on your phone (same Wi-Fi)

1. Run `npm run dev`. Vite prints a `Network:` URL, e.g. `https://192.168.1.45:5173/`.
2. Open it on the phone. The certificate is self-signed, so accept the warning once:
   **Android Chrome** → *Advanced → Proceed*; **iPhone Safari** → *Show Details → visit this website*.
3. Allow camera access when you open a scanner (the camera needs HTTPS, which is why dev uses it).
4. If the phone can't connect, allow Node.js on **Private networks** in Windows Firewall.

Browsers won't install the app or register its offline service worker on a self-signed certificate. To test
installing and offline mode, deploy it (below) or run `npm run build && npm run preview` and open
`http://localhost:4173` on the computer.

## Free Gemini API key (for meal photos and nutrition labels)

1. Go to **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)** and sign in with a Google account.
2. Click **Create API key** and copy it (it starts with `AIza…`).
3. In the app: **Me → AI food scan** → paste → **Test key**.

The key is stored only in this device's IndexedDB, sent only to Google when you scan, and never included in
backups. The free tier is rate-limited; if you hit the limit the app tells you — wait a minute and retry.
The model name lives in one place: `GEMINI_MODEL` in `src/lib/ai/config.ts` (currently `gemini-3.8-flash`).

## Deploy for free

The app is static files (`npm run build` → `dist/`). Both hosts below give you free HTTPS, which the camera
and installing need. Configs are included: `vercel.json` and `netlify.toml` (SPA routing, caching and
security headers, including a Content-Security-Policy that only allows Google and Open Food Facts).

### Vercel

1. Push this folder to a GitHub repository.
2. On [vercel.com](https://vercel.com) → **Add New… → Project** → import the repo. Vercel detects Vite;
   `vercel.json` sets the build (`npm run build`) and output (`dist`). Click **Deploy**.
3. Or from the terminal: `npx vercel` (preview) then `npx vercel --prod`.

### Netlify

1. Push to GitHub, then on [netlify.com](https://netlify.com) → **Add new site → Import an existing project**
   → pick the repo. `netlify.toml` supplies the build command and publish directory. Deploy.
2. Or without Git: `npm run build`, then drag the `dist` folder onto
   [app.netlify.com/drop](https://app.netlify.com/drop) — or `npx netlify deploy --prod --dir dist`.

## Install to your home screen

- **Android (Chrome):** open your deployed URL → menu ⋮ → **Install app** (or the install banner).
- **iPhone (Safari):** open the URL → **Share** → **Add to Home Screen**. (iOS 16.4+ is needed for
  notifications, and only for the installed app.)

The app then opens full-screen and works offline. When a new version is deployed you'll see
**"A new version is ready — Reload"**; it never reloads on its own, so a live workout isn't interrupted.

## Using it — the short version

- **Onboarding:** profile → goal → split template (or none). Change everything later in **Me**.
- **Routines:** Train → **Create routine** → tick exercises (numbered in tap order) → sets × reps → pick
  weekdays → **Save** or **Save & start now**. Routines are the days of your weekly split.
- **Workout:** ticking a set starts the rest timer (±15 s; beep + vibration at 0; screen kept awake).
  PREVIOUS shows the same set last time; weights are prefilled. Tap a set number for warm-up / delete.
- **Food:** Eat → **+** on a meal → search → pick a serving and amount → add (stays open for more items).
  Swipe an entry left to edit or delete (with Undo).
- **Barcode:** Eat → barcode icon → scan or type the number. Unknown product? **Snap the nutrition label**.
- **Meal photo:** Eat → camera button (or Today → Scan) → take/pick a photo → adjust quantities → add.
- **Reminders:** Me → Reminders → switch on workout / weigh-in / water and set times → allow notifications.
- **Backups:** Me → Your data → **Download backup** (or **Share…** to Drive/WhatsApp) every couple of
  weeks. **Restore from backup…** previews the file and lets you replace or merge.

## Privacy — what leaves your phone

Only two things, and only when you use those features:

- **Meal and label photos** → Google Gemini (with your key).
- **Barcodes** → Open Food Facts (with an `X-User-Agent: GymDietTracker/0.1` header). Pack photos load
  from Open Food Facts' image server.

Everything else — workouts, food log, weight, measurements, progress photos, your key — stays in this
browser's IndexedDB. Clearing the site's data or uninstalling deletes it, so keep a backup. **Me → Your data
→ Protect storage from clean-up** asks the browser not to evict the data (installed apps usually get this).

## How the numbers work

| What | How |
| --- | --- |
| Calorie target | Mifflin-St Jeor BMR (`10·kg + 6.25·cm − 5·age + 5` male / `− 161` female) × activity (1.2 / 1.375 / 1.55 / 1.725 / 1.9); Bulk +300, Cut −500, Recomp ±0; rounded to 10 kcal |
| Macros | Protein 2.0 g/kg (2.2 on a cut), fat 0.9 g/kg, carbs = the remaining calories. Editable, with "reset to calculated" |
| Estimated 1RM | Epley `kg × (1 + reps/30)`, warm-ups excluded |
| PR | A ticked working set that beats your best e1RM, or lifts more than ever for that many reps (or more). An exercise's first session only sets the baseline |
| Volume | Σ kg × reps over ticked working sets |
| 1RM gain (12 wk) | Best e1RM in the last 2 weeks vs best in the first 2 weeks of the window |
| Weight trend | 7-day moving average: mean of the weigh-ins in the 7 calendar days ending that day |
| Streak | Consecutive days you trained or your split scheduled rest, counted from your first workout; today doesn't break it until it's over |
| Nutrition averages | Over *complete* logged days (today excluded); a day is on target at ±10 % kcal and ≥ 90 % protein |
| Food values | ~135 foods per 100 g as eaten, approximate (IFCT 2017 / NIN reference values + typical home recipes); every food is editable |

## Development

| Script | What it does |
| --- | --- |
| `npm run dev` / `npm run dev:http` | Dev server (HTTPS on LAN / plain http on localhost) |
| `npm test` | Vitest unit tests (calculations, database actions, parsing, backups) |
| `npm run typecheck` | TypeScript strict check |
| `npm run build` | Type-check + production build with service worker and icons |
| `npm run preview` | Serve the production build on http://localhost:4173 |

**Stack:** Vite 8, React 18, TypeScript (strict), Tailwind CSS 3.4, React Router 7, Dexie (IndexedDB),
Recharts, vite-plugin-pwa (Workbox), @zxing/browser (barcode fallback), @google/genai, Vitest.
React Router 7 is used because v8 requires React 19.

```
src/
  app/          router, layouts, tab bar, error boundaries, update prompt, global notices
  components/   shared UI (Button, BottomSheet, Ring, charts/ChartCard, Segmented, Switch, …)
  db/           Dexie schema + types, actions (food, workouts, splits, body, backup), seed data
  features/     one folder per area: today, train, workout, exercises, eat, scan, progress, body, me
  hooks/        live-query hooks, camera, online status, timers
  lib/          calc/ (pure maths + tests), ai/ (Gemini), off.ts, barcode.ts, scanner.ts, reminders…
  theme/        colour tokens shared by Tailwind and the charts
```

Design tokens (the "Flame Hashira" palette) live in `src/theme/colors.ts`; fonts are bundled via
`@fontsource` so they work offline. PWA icons are generated at build time from `public/logo.svg`.

**Performance notes:** screens are lazy-loaded; the Gemini SDK and ZXing (~850 KB together) are kept out of
the install-time cache and cached on first use; the offline precache is ~1.1 MB.

## Known limitations

- **Reminders** fire while the app is open or recently used. Web apps can't schedule alarms while fully
  closed without a push server, so missed reminders appear as banners on Today when you next open the app.
- **Rest timer** beeps at zero only while the app is in the foreground (the screen is kept awake during a
  workout). iPhones don't support vibration, and the beep is silent with the ringer switch off.
- **Barcode torch** works only where the browser exposes it (mostly Android Chrome).
- **AI estimates** can be off — low-confidence items are marked *Check this*. Built-in food values are
  approximate.
