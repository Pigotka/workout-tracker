# Train

Gym PWA. Pick a training, log sets, rest, repeat. Data stays in `localStorage` on the device, and each signed-in Google account can back that up to their own Drive.

## Screens

- **Train** — start or resume a session.
- **Log** — history, attendance heatmap, max-weight charts per lift.
- **Plans** — edit trainings, kg/lb, Google Drive sync, JSON backup, reset to the Test template (history is kept).

## Session

Tap a lift, set weight, **Log N reps**. Rest starts on its own; tap the overlay to skip. After the planned sets you stay on that lift — log extra reps, then **Next**.

Weight `0` is **BW**. The last working weight is remembered for next time. Names can be anything; pictures come from the [RepDB](https://repdb.co) catalog (muscle tint, optional color override).

## Run

```bash
npm install
npm run dev
```

Phone: open [https://pigotka.github.io/workout-tracker/](https://pigotka.github.io/workout-tracker/) in Chrome → **Install on this phone**.

Local HTTPS/localhost preview:

```bash
npm run build
npm run preview
```

Storage key: `train:v1` in `localStorage`. Refresh catalog pictures with `npm run catalog`.

## Google Drive backup

Sign in on Plans. The app stores one file, `train-v1.json`, in that Google account's Drive **app data folder** (hidden from My Drive). It syncs when the app opens and about a second and a half after a change.

### Upgrade safety

Installing or updating on a phone that already has workouts does not rewrite `train:v1`. That local copy stays the source of truth until sign-in finishes a merge. If Drive has no file yet, or an older one, the phone's copy is uploaded. Drive is pulled over the phone only when its backup is strictly newer and is not an empty template. The legacy clock is the last workout time, not the moment you open the new version, so a newer backup from another device can still win.

Sign-out leaves the phone's history in place. Signing in as a different Google account asks before switching. The previous workouts stay on the phone under that account.

The phone keeps working offline from `localStorage`. Export / Import on Plans still read and write the same store JSON; Import also accepts the Drive wrapper.

While the OAuth app is in Testing, Google drops the grant after 7 days. Add each person as a test user, and sign in again if sync says the session expired.

### Google Cloud Console

The client ID is public in the built JavaScript. There is no client secret. Do not commit a filled-in `.env`.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or pick a project.
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen**.
   - User type: **External** (or Internal for a Workspace org).
   - App name: Train.
   - Add the scopes `openid`, `email`, and `https://www.googleapis.com/auth/drive.appdata` if the wizard asks. `drive.appdata` can only see this app's hidden folder. `openid` and `email` tell accounts apart on a shared phone.
   - While the app is in **Testing**, add every Google account that will sign in under **Test users**.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
5. **Authorized JavaScript origins**:
   - `http://localhost:5173`
   - `https://pigotka.github.io`
6. **Authorized redirect URIs**: the sign-in popup does not use a redirect URI. If the form requires one, add those same two origins.
7. Copy the client ID (it ends in `.apps.googleusercontent.com`).

### Local

```bash
cp .env.example .env.local
```

Set `VITE_GOOGLE_CLIENT_ID` in `.env.local`, then restart `npm run dev`.

### GitHub Pages

The Pages workflow reads the Actions secret `VITE_GOOGLE_CLIENT_ID` at build time. In the repo: **Settings → Secrets and variables → Actions → New repository secret**. Redeploy after changing it. An empty secret still builds; Plans will ask for the client ID until one is set.

The backup body is `{ "version": 1, "updatedAt": <ms>, "store": <train:v1> }`. `updatedAt` uses the phone's clock.
