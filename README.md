# T-60 Seconds // Mission Control

A co-op mission simulator for 1–4 players in the browser. Turn-based core with a
60-second real-time prologue. This build ships the **online lobby**.

## What works right now

- Create a room, share a five-character code or invite link, join from up to
  four browsers/devices.
- Live crew list, ready states, flight log, presence ("signal lost" seats held
  for two minutes), host migration, reconnect, kick, leave.
- Commander can launch preflight and return to assembly.
- Markers and guided briefing on every screen, skippable and replayable.

Not built yet: the scramble, allocation, mission turns, crises, win/lose.

## Run it locally (no account needed)

```bash
npm install
npm run dev
```

This starts Next.js on <http://localhost:3000> and the Firebase Realtime
Database emulator on port 9000. Open two browser windows, create a room in one,
join with the code in the other.

- `npm run test:lobby` runs the end-to-end lobby suite against the emulator.
- `npm run typecheck` and `npm run build` are part of the definition of done.

## Take it online (free Firebase project)

The game only needs a Firebase Realtime Database; there is no server to run.

1. Create a project at <https://console.firebase.google.com> (Spark/free plan).
2. **Build → Realtime Database → Create Database.** Pick a region.
3. **Project settings → Your apps → Web app** and copy the config values.
4. Put them in `.env.local`:

   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://<project>-default-rtdb.firebaseio.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   NEXT_PUBLIC_FIREBASE_USE_EMULATOR=0
   ```

5. Point the CLI at your project and deploy the rules:

   ```bash
   npx firebase login
   npx firebase use --add        # pick your project, alias it "default"
   npm run deploy:rules
   ```

6. Deploy the app (Vercel or any Next.js host) and set the same environment
   variables there.

`database.rules.json` is currently open (no auth) so playtests need no sign-up.
Before a public launch, add Firebase Anonymous Auth + App Check and tighten the
rules — see `AGENTS.md`.

## Layout

```
src/app/                 landing + /room/[code]
src/components/          markers, tutorial provider
src/hooks/useLobby.ts    room lifecycle: join, presence, live state
src/lib/lobby-service.ts the only place that talks to Firebase
src/lib/markers.ts       marker selectors (state -> what to highlight)
src/lib/tutorial.ts      briefing content (data, not branches)
src/lib/anchors.ts       anchor registry typed across markers + tutorial
scripts/smoke-lobby.ts   end-to-end lobby test
```

Read `AGENTS.md` before adding a screen, mechanic or mission.
