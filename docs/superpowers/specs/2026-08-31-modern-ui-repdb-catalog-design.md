# Train — modern gym floor + RepDB catalog

Android PWA. Dark lime stays. Less chrome, bigger gym-floor controls. One illustration set: vendored RepDB peak-pose WebPs. English catalog to pick a picture; exercise name is freeform (Czech allowed).

## Goal

Open the app, start the test training, tap a lift, log a set, rest, finish. Replace the test plan with your own later.

## Architecture

Client-only Vite + React + TypeScript PWA. One JSON document in `localStorage`. No accounts, no server.

Vendored at build time from [RepDB free tier](https://github.com/RepDB/exercise-dataset):

- `exercises.json` (English names, equipment, muscles)
- peak WebPs only: `images/flat/{id}-peak.webp` (or `main` for holds)

Not vendored: start-pose images, old photo/effort JPGs, Iconify SVGs, `iconStyle`.

PWA precaches catalog JSON + peak WebPs. Gym floor is offline.

Attribution on Plans: `Exercise data by RepDB (repdb.co)`.

## Data

Store version **3**, `localStorage` key `train:v3`. Old `train:v1` is ignored, not migrated.

Unknown / corrupt store → seed. Existing local programs and history from v1 are left unused.

```ts
type Exercise = {
  // ...existing set/rest/weight/note/pairing fields
  name: string;       // freeform, Czech OK
  catalogId: string;  // RepDB id, always set (custom still picks a picture)
};
```

Drop `icon`, `IconId`, `iconStyle`, `ICON_STYLES`, `set-icon-style`.

Custom lift: pick any catalog picture, type any name. Name does not have to match the catalog row.

Missing WebP → `squat` peak image, never a broken tile.

## Seed

One program: **Test**. A short mix (e.g. squat, bench, pull-up, plank) using RepDB pictures and English default names so the app is tappable. You add real plans in Plans later.

## Screens

Keep lime (`#d6ff3e` on `#11140c`). Target: Android phone, 430px column, 56px+ controls, Log larger.

- **Train** — resume card if live; program cards (name, last day, a few pictures). No heatmap, eyebrows, “this week”, or “X lifts today”.
- **Log** — heatmap, streak, session count, past sessions.
- **Workout list** — picture, name, weight × scheme, set dots. Small pair mark for supersets. No icon captions.
- **Exercise player** — picture + name, huge weight ±, huge reps ±, full-width **Log N reps**. Rest overlay full-screen, tap to skip. Undo as quiet text. Note only if set.
- **Plans** — trainings, add, backup, unit, RepDB credit. No icon-style picker.
- **Add/edit exercise** — search sheet over English catalog (picture + name). Pick fills picture + default English name; you can rewrite the name. Custom row at top of the sheet.
- **Bottom nav** — Train / Log / Plans, icon + short label. Hidden during a session.

Unchanged gym-floor rules: auto rest, vibrate, session timer, 2.5 kg steps, `0` → BW, in-progress resume including rest.

## Test plan

One pass on an Android phone (or Chrome device mode):

1. Fresh load shows **Test** only. Install banner still works.
2. Start Test → list shows colorful RepDB pictures and names.
3. Open a lift → Log is the biggest control; weight/reps ± are easy to hit; log a set → rest overlay → tap to skip.
4. Finish and save → session appears on Log with heatmap.
5. Plans → add exercise → search English catalog → pick a picture → rename in Czech → it shows your name with that picture.
6. Reload offline (airplane mode after first visit) → Test and pictures still load.

No migrate tests. No extra seed programs.

## Out of scope

Migrating old `icon` / `iconStyle` stores. Start-pose images. Vector/Iconify sets. Rewriting the Czech training as seed. Extra languages in the catalog picker.
