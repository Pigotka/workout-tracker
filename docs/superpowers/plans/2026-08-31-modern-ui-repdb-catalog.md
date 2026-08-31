# Modern UI + RepDB catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Lime gym-floor UI with one vendored RepDB picture set, English catalog picker, freeform names, and a single Test program.

**Architecture:** Vendor RepDB peak WebPs + JSON into `public/catalog`. Exercise stores `catalogId` + freeform `name`. New `localStorage` key `train:v3` (no migrate). Strip chrome; keep session/log/rest logic.

**Tech Stack:** Vite + React + TypeScript PWA, existing store/reducer, Vitest, RepDB free-tier assets (CC, attribution required).

## Global Constraints

- Android phone, 430px column, lime `#d6ff3e` on `#11140c`, controls ≥ 56px, Log larger.
- Store version 3, key `train:v3`. Ignore `train:v1`. No migrate.
- One seed program: **Test** (squat, bench-press, pull-up, plank). User adds real plans later.
- Catalog English; `name` freeform (Czech OK). Always a `catalogId`. Missing image → `squat`.
- Peak (or `main`) WebPs only. Attribution on Plans: `Exercise data by RepDB (repdb.co)`.
- One phone test pass from the spec. No migrate tests. Do not add extra seed programs.
- Do not commit unless the user asks.

---

## Files

- Create: `scripts/vendor-repdb.mjs`, `src/logic/catalog.ts`, `public/catalog/*` (generated)
- Modify: `src/types.ts`, `src/seed.ts`, `src/logic/storage.ts`, `src/logic/store.ts`, `src/logic/store.test.ts`, `src/components/Glyph.tsx`, `src/screens/*`, `src/index.css`, `vite.config.ts`, `package.json`
- Delete: `public/exercise-icons/*`, `scripts/download-exercise-icons.mjs`, `scripts/download-vector-icons.mjs`, icon-style UI

---

### Task 1: Vendor RepDB

**Files:** Create `scripts/vendor-repdb.mjs`. Output `public/catalog/exercises.json` + `public/catalog/{id}.webp`. Modify `package.json` (`"catalog": "node scripts/vendor-repdb.mjs"`).

- [x] Fetch `https://raw.githubusercontent.com/RepDB/exercise-dataset/main/exercises.json`. For each exercise copy `images.flat.peak` or `images.flat.main` to `public/catalog/{id}.webp`. Write a slim JSON `{ id, name, equipment }[]`.
- [x] Run `npm run catalog`. Confirm `public/catalog/squat.webp` and `plank.webp` exist.

```js
const src = ex.images?.flat?.peak ?? ex.images?.flat?.main;
```

---

### Task 2: Types, storage v3, Test seed

**Files:** `src/types.ts`, `src/logic/catalog.ts`, `src/logic/storage.ts`, `src/seed.ts`, `src/logic/store.ts`

**Produces:** `Exercise.catalogId`, `FALLBACK_ID = "squat"`, `catalogSrc(id)`, `searchCatalog(q, entries)`, `STORAGE_KEY = "train:v3"`, seed program id `"test"`.

- [x] Replace `icon` / `IconId` / `iconStyle` with `catalogId: string`. Drop `set-icon-style`. `Store.version` is `3` only. `CompletedExercise` uses `catalogId`.
- [x] `catalog.ts`: load `/catalog/exercises.json`, `catalogSrc` → `/catalog/${id}.webp` (fallback `squat`), `searchCatalog` filters name+equipment.
- [x] `loadStore`: `train:v3` only; invalid → `createSeedStore()`. Delete `migrate` / `readIconStyle`.
- [x] Seed **Test** (`id: "test"`): squat, bench-press, pull-up (reps), plank (timed). English names. `version: 3`, no `iconStyle`.
- [x] `store.ts` finish-workout copies `catalogId` not `icon`. Remove `set-icon-style` case.

```ts
export function catalogSrc(id: string): string {
  return `/catalog/${id}.webp`;
}
```

---

### Task 3: Glyph + picker + strip UI

**Files:** `Glyph.tsx`, `ProgramEditScreen.tsx`, `ProgramsScreen.tsx`, `HomeScreen.tsx`, `WorkoutScreen.tsx`, `ExerciseScreen.tsx`, `HistoryScreen.tsx`, `SetupScreen.tsx`, `index.css`, `vite.config.ts`

- [x] `Glyph` takes `catalogId`. `<img src={catalogSrc(id)} onError=…squat>`. Delete `ICON_COLORS`, `ICON_LABELS`, `iconSrc`, style switch. Delete `public/exercise-icons/*` and old download scripts.
- [x] Editor: search `PickerSheet` over catalog (picture + English name). Pick sets `catalogId` and default `name` if still empty/default. Custom row: keep current picture, focus name. Drop icon grid / `ICON_IDS`.
- [x] Plans: remove icon-style block; add `Exercise data by RepDB (repdb.co)`.
- [x] Home: resume + program cards only (no heatmap / eyebrows / “X lifts”). Log keeps heatmap. Workout rows: picture, name, weight×scheme, dots — no captions. Player: bigger Log (`min-height: 72px`) and ± buttons. Hide empty notes.
- [x] `vite.config.ts` `includeAssets`: `catalog/**`.

---

### Task 4: Tests + phone pass

**Files:** `src/logic/store.test.ts`

- [x] Point tests at program `"test"` and squat/bench/pull-up/plank ids. Delete `set-icon-style` test. Keep log-set / finish / undo. `npm test` green.
- [x] `npm run build` then spec Test plan (fresh Test, log a set, rest skip, save to Log, add exercise + Czech rename, offline reload).
