# Gym & Diet Tracker

A personal, local-first fitness PWA: gym sessions, diet (with Indian foods), body metrics and progress.
All data lives in your browser's IndexedDB on your device. There's no account and no backend.

> **Status:** Phase 1 of 6 (scaffold, onboarding, goals and targets). Later phases add workouts, food logging,
> camera scanning, progress charts and export. The full README (deploy, Gemini key, install) comes in phase 6.

## Requirements

- Node.js 22.12+ (built with Node 24)
- npm

## Run locally

```bash
npm install
npm run dev:http      # http://localhost:5174 — quickest for the computer
npm run dev           # https://localhost:5173 + your LAN address — for phone testing
```

## Test on your phone (same Wi-Fi)

1. Run `npm run dev`. Vite prints a `Network:` URL, e.g. `https://192.168.1.45:5173/`.
2. Open that URL on your phone. The certificate is self-signed, so the browser shows a warning:
   - **Android Chrome:** *Advanced → Proceed to 192.168.x.x (unsafe)*
   - **iOS Safari:** *Show Details → visit this website*
3. HTTPS is needed so the camera works (phase 4).

Because the certificate isn't trusted, browsers won't register the offline service worker on it. To test
installing and offline use, run `npm run build && npm run preview` on the computer (localhost is trusted) or
use the deployed URL (phase 6).

If Windows Firewall asks about Node.js, allow it on **Private networks**, or your phone can't connect.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | HTTPS dev server exposed on your LAN |
| `npm run dev:http` | Plain-http dev server on port 5174 |
| `npm test` | Vitest unit tests (calculations, DB seeding, validation) |
| `npm run typecheck` | TypeScript strict check |
| `npm run build` | Type-check + production build with PWA service worker and icons |
| `npm run preview` | Serve the production build on http://localhost:4173 (service worker works here) |

## Project layout

```
src/
  app/          router, tab bar, layouts, error boundaries, update prompt
  components/   shared UI (Button, Chip, Ring, MacroBar, RadioCard, Segmented, …)
  db/           Dexie schema, types, seed data (exercises, split templates), actions
  features/     one folder per screen (today, train, eat, progress, me, onboarding, workout, scan)
  hooks/        live-query hooks (profile, settings, targets, active split)
  lib/calc/     pure calculation logic + tests (targets, schedule, session time)
```

Design tokens (colours, fonts, radii) live in `tailwind.config.ts`. PWA icons are generated at build time
from `public/logo.svg` (see `pwa-assets.config.ts`).

## How targets are calculated

- BMR: Mifflin-St Jeor, `10·kg + 6.25·cm − 5·age + 5` (male) or `− 161` (female)
- TDEE = BMR × activity factor (1.2 / 1.375 / 1.55 / 1.725 / 1.9)
- Goal: Bulk +300 kcal, Cut −500 kcal, Recomp ±0 (kcal rounded to nearest 10)
- Protein 2.0 g/kg (2.2 g/kg on a cut), fat 0.9 g/kg, carbs fill the remaining calories

Targets can be overridden on the **Me** screen. Switching goal mode resets to calculated values.
