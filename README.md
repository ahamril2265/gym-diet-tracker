# Gym & Diet Tracker

A personal, local-first fitness PWA: gym sessions, diet (with Indian foods), body metrics and progress.
All data lives in your browser's IndexedDB on your device. There's no account and no backend.

> **Status:** Phase 3 of 6 (scaffold, goals, workouts, food log). Later phases add camera scanning,
> progress charts and export. The full README (deploy, Gemini key, install) comes in phase 6.

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

## How workouts are tracked

- **Prefill / PREVIOUS:** a new session copies the last session of each exercise: warm-ups are repeated and
  working sets take the matching set's kg × reps (extra planned sets copy the last one).
- **Estimated 1RM (Epley):** `kg × (1 + reps / 30)`. Warm-up sets never count.
- **PR:** a ticked working set that beats your best estimated 1RM, or lifts more than ever before for that
  many reps (or more). An exercise's first session only sets the baseline, so it shows no PRs.
- **Volume:** Σ kg × reps over ticked working sets.
- **Rest timer:** starts when you tick a set (compound vs accessory defaults in **Me**; warm-ups rest up to
  60 s). It beeps and vibrates at 0 (vibration isn't available on iOS). The screen stays awake during a
  workout where the browser supports it.
- **Finishing** removes unticked sets. Past workouts open from **Train → History**.

## Food logging

- **Built-in foods:** ~135 common Indian foods (`src/db/seed/indianFoods.ts`), per 100 g as eaten, with
  household servings: katori ≈ 150 g of a cooked dish, plate of rice ≈ 250 g, glass ≈ 250 ml, tsp 5 g,
  tbsp 15 g. Values are **approximate** (IFCT 2017 / NIN reference tables plus typical home recipes; oil
  and recipes vary a lot). Any food can be edited from its portion sheet (pencil icon); your numbers then
  replace the built-in ones. Past entries keep the values they were logged with.
- **Search** matches every word against names and common aliases (chapati, dahi, chaas, anda…).
- **Quick add** logs calories/macros without a food, e.g. a restaurant meal you estimated.
- **Edit or delete:** tap an entry, or swipe it left for Edit / Delete (with Undo).
- **Copy previous day:** empty meals offer to copy the same meal from the day before.
- **Streak:** consecutive days where you trained or your split had a rest day, counted from your first
  workout. Today doesn't break the streak until it's over.
