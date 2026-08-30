# Train

A one-person gym PWA. Open it on your phone, pick today's training, tap an exercise, log the set, rest, repeat.

## Run it

```bash
npm install
npm run dev
```

On a phone, the page must be served over HTTPS (or localhost). For a real device on your network:

```bash
npm run build
npm run preview
```

Then in Chrome on Android: menu → **Add to Home screen**. It installs as a standalone app and keeps working offline.

## How it works

- **Train** — pick Push / Pull / Legs (or your own plans). The heatmap is how often you actually show up.
- Tap a training → day's exercise list with icons.
- Tap an exercise → today's weight, next-time weight, cue, huge **Log N reps**. Rest starts by itself. Tap the rest screen to skip.
- Next-time weight and cues are remembered immediately. Reload is safe; an in-progress workout resumes, rest included.
- **Plans** — replace the seed program with your real lifts. Export a JSON backup from the same screen.

Data lives only on this device (`localStorage`). No accounts.

## UX defaults

These are the gym-floor choices baked in. Say if you want a different control:

- Big **Log** button, not a spinner — sweaty thumbs.
- Rest auto-starts after a set; full-screen countdown; tap to skip; vibrate when done.
- Set time is measured automatically. Timed holds (plank) get an explicit start/stop.
- Session clock stays on screen for the whole workout.
- `0` weight shows as **BW**.
- Notes are cues on the exercise ("this week, pause at the bottom"), not buried in history.
