# Gym & Diet Tracker

A personal, local-first fitness PWA: gym sessions, diet (with Indian foods), body metrics and progress.
All data lives in your browser's IndexedDB on your device. There's no account and no backend.

> **Status:** Phase 5 of 6 (scaffold, goals, workouts, food log, camera scanning, progress). Phase 6 adds
> export/import, reminders and polish. The full README (deploy, install) comes in phase 6.

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

## Routines

- **Create your own:** Train → **Create routine** → tick exercises in the library (they're numbered in the
  order you tap them) → set sets × rep range, reorder → name it (or keep the suggested name, e.g.
  "Chest & Back") → optionally pick the weekdays it repeats on → **Save** or **Save & start now**.
- Routines are the days of your weekly split: scheduled ones show on Today, and any routine can be started
  from Train. Picking a weekday another routine uses moves that day to the new routine.
- Edit or delete a routine with the pencil on its card; **Edit week** shows the whole weekly schedule.
  Applying a template replaces all routines (workout history is kept).

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

## Camera scanning

The camera needs HTTPS: use `npm run dev` (self-signed cert) on your phone, or the deployed site.

### Free Gemini API key (for meal photos and nutrition labels)

1. Open [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in with a Google account.
2. **Create API key** and copy it (starts with `AIza…`).
3. In the app: **Me → AI food scan** → paste → **Test key**.

The model is set in one place: `GEMINI_MODEL` in `src/lib/ai/config.ts` (currently `gemini-3.8-flash`, a
free-tier Flash model). The free tier is rate-limited; if you hit it the app says so — wait a minute.

### Meal photo (Eat → camera button, or Today → Scan)

Take or pick a photo → Gemini returns each dish with an Indian household portion (roti, idli, katori…),
grams, calories, macros, a confidence score and a box on the photo. Adjust quantities with the steppers,
remove wrong items, pick the meal and add. Low-confidence items are marked **Check this**. Entries keep an
**AI** tag in the log and can be re-portioned later like any other entry.

### Barcode (Eat → barcode button, or the Meal | Barcode toggle)

Point at an EAN-13 / EAN-8 / UPC code (Chrome on Android uses the built-in detector; iOS uses ZXing), or
type the number. Lookup order: products saved on your phone → [Open Food Facts](https://world.openfoodfacts.org).
Found products are cached for offline use. If a product is missing or has no nutrition table, **Snap the
nutrition label**: Gemini reads the per-100 g values and serving size, you check them, and the product is
saved under that barcode, so the next scan finds it instantly. "Data wrong?" does the same for products
Open Food Facts got wrong.

## Progress & body

- **Strength:** workouts in the last 12 weeks, volume in the last 7 days vs the 7 before, PRs this month;
  estimated-1RM chart per lift (Epley) with the 12-week gain (best of the first 2 weeks vs best of the last
  2, so one light session doesn't flip it); recent PRs; working sets per muscle this week against a 10–20
  set zone (bars outside it are orange and labelled Low/High); a 12-week consistency heatmap.
- **Nutrition:** average calories and protein vs target over the last 7 and 30 *complete* days (today is
  excluded until it's over), and days on target (kcal within ±10 %, protein ≥ 90 % of target).
- **Body:** latest weight, 7-day moving average (mean of weigh-ins in the 7 calendar days ending that
  day), change this month; chart of daily weigh-ins vs the trend with a 30D/90D/1Y/All range. Measurements
  with the change vs the previous reading. Progress photos (front/side/back) saved as Blobs in IndexedDB on
  the device — never uploaded — with a side-by-side compare.
- Every chart has a **table view** (the grid icon) with the exact numbers.

### What leaves your phone

Only meal/label **photos** (to Google, with your key) and **barcodes** (to Open Food Facts). Your key is
stored in this device's IndexedDB. Nothing else is uploaded.
