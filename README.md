# Train

One-person gym PWA. Pick a training, log sets, rest, repeat. Data stays on the device.

## Screens

- **Train** — start or resume a session.
- **Log** — history, attendance heatmap, max-weight charts per lift.
- **Plans** — edit trainings, kg/lb, JSON backup, reset to the Test template (history is kept).

## Session

Tap a lift, set weight, **Log N reps**. Rest starts on its own; tap the overlay to skip. After the planned sets you stay on that lift — log extra reps, then **Next**.

Weight `0` is **BW**. The last working weight is remembered for next time. Names can be anything; pictures come from the [RepDB](https://repdb.co) catalog (muscle tint, optional color override).

## Run

```bash
npm install
npm run dev
```

Phone install needs HTTPS or localhost:

```bash
npm run build
npm run preview
```

Then Chrome → **Add to Home screen**. Offline after that.

Storage key: `train:v1` in `localStorage`. Refresh catalog pictures with `npm run catalog`.
