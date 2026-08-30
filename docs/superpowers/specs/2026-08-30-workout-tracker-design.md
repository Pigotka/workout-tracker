# Train — PWA workout tracker

Single-user Android PWA for running gym sessions with almost no reading or fiddling.

## Goal

Open the app at the gym, pick today's training, see the exercise list with icons, tap an exercise, log sets, rest, and leave. Data survives reloads. History shows how often you train.

## Architecture

Client-only Vite + React + TypeScript PWA. One versioned JSON document in `localStorage`. No accounts, no server. Service worker for install + offline.

## Screens

1. **Train** — program cards, week heatmap, resume banner if a session is live.
2. **Workout list** — day's exercises with glyph, weight, set dots. Session timer sticky.
3. **Exercise player** — glyph, note, weight + next weight, +/- reps, one huge Log button. Rest overlay auto-starts after a set.
4. **Log** — heatmap, streak, past sessions.
5. **Plans** — edit programs/exercises/icons (seed Push/Pull/Legs until you replace them).

## UX defaults (change these by saying so)

- Log with a big button, not a spinner. Sweaty hands, one thumb.
- Rest starts automatically after Log. Tap anywhere to skip. Phone vibrates when rest ends.
- Set duration is tracked automatically (no Start/Stop unless the exercise is timed, e.g. plank).
- Session timer is always visible during a workout.
- Weight +/- 2.5 (kg). `0` displays as BW.
- Next-weight is saved onto the exercise when you finish the workout.
- Notes live on the exercise (a cue for "this week"), not only the session.
- In-progress workout resumes after reload, including remaining rest.

## Persistence

`localStorage` key `train:v1`. Corrupt data falls back to seed programs. Export/import JSON on Plans.
