# MyVW Maintenance

A local-first PWA to track maintenance, costs and fuel for **classic air-cooled
VWs** (Beetle / Type 1, Bus / Type 2, Karmann Ghia, Type 3). Based on each car's
model, year and engine — plus any modifications — it suggests services and
checklists (oil change, valve adjustment, points/timing, brakes, fuel lines…)
and flags what's **overdue** or **due soon**.

## Features

- 🚗 **Garage** of multiple cars, each with its own odometer (mi or km).
- 🔧 **Model/year-aware service suggestions** with checklists, driven by a curated
  air-cooled VW knowledge base. Tailors to 6V/12V, carb vs fuel-injection, and
  **modifications** (electronic ignition, disc-brake conversion, full-flow oil
  filter, EFI/engine swap…).
- ⏰ **Reminders & due alerts** based on mileage *and* time since last service.
- 💰 **Costs & reports** — totals, spending by month and by category (charts).
- 📷 **Photos & documents** attached to records, stored on-device.
- 🧾 **Receipt scanning** — capture a receipt and on-device OCR (tesseract.js)
  pre-fills the amount, date and vendor for you to confirm. Nothing leaves the
  device.
- ⛽ **Fuel/mileage log** — fill-ups compute economy (mpg or L/100km) and keep
  the odometer current, which drives the due calculations.
- 📴 **Offline-first PWA** — all data lives in your browser (IndexedDB via Dexie).

> ⚠️ Suggested intervals are general classic-VW guidance, **not** a substitute for
> the official workshop manual (e.g. Bentley) for your exact car. Every interval
> is editable per car.

## Tech

React + TypeScript + Vite · Dexie (IndexedDB) · react-hook-form + zod · recharts ·
tesseract.js · vite-plugin-pwa.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # preview the build
```

## Architecture notes

All persistence goes through a single data-access layer in `src/lib/db/repo.ts`.
The UI never touches IndexedDB directly, so a cloud backend (e.g. Supabase) can
be added later by implementing the same `repo` interface — enabling multi-device
sync and sharing with others. Entities already carry stable `id`s and timestamps
to ease future sync.

## Moving to its own repository

This app is self-contained in this folder. To extract it into a dedicated
`MyVWmaintenance` repo, copy the contents of this directory into the new repo
root and commit.
