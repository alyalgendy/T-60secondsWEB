# T-60 Seconds rebuild plan

## What exists

- React 18, TypeScript, Vite, CSS modules, and Firebase Realtime Database.
- `src/App.tsx` owns the room flow and routes through the scene registry.
- Lobby and room lifecycle live in `src/scenes/lobby/`, `src/shared/roomService.ts`,
  and `src/shared/hooks/`.
- The current planning, decision, and results scenes are under
  `src/scenes/{iss,moon,mars,decision,results}/`; content is in `src/content/`.
- Cutscene playback is in `src/scenes/cutscene/`, with the existing videos in
  `public/videos/`.

## Keep

- Lobby, room codes, player presence and host reassignment, flow router,
  Firebase hooks, `CutscenePlayer`, and all existing cutscene videos.
- The legacy game remains available with `VITE_GAME_V2=0`. V2 is the default
  route; the build-time flag can opt back into the legacy planning, decision,
  and results scenes.

## Replace incrementally

- Replace the existing slider-based planning and decision gameplay with staged
  design and cooperative mission scenes.
- Add the deterministic engine under `src/shared/sim/`, mission content under
  `src/content/`, and V2 scenes alongside the existing scenes. Do not remove
  legacy scenes before the default switch.
- All spacecraft capacities, resource amounts, costs, and modeled incidents
  are explicitly fictional game-balance data, not engineering guidance.

## Firebase Realtime Database paths

Existing paths used by the app:

- `rooms/{code}/meta`
- `rooms/{code}/players/{playerId}`
- `rooms/{code}/flow`
- `rooms/{code}/drafts/{missionId}`
- `rooms/{code}/plans/{missionId}`
- `rooms/{code}/decision/{missionId}`

V2 state uses:

- `rooms/{code}/design/{missionId}` for `DesignState`
- `rooms/{code}/mission/{missionId}` for host-authored `MissionState`
- `rooms/{code}/missionIntents/{missionId}/{intentId}` for client interaction
  intents, consumed and removed by the current host
- `rooms/{code}/players/{playerId}/position` for that player's own throttled
  cabin position

`useDesign` and `useMission` access V2 data through the V2 service layer and can
use an in-memory local mock store for isolated development.

Shared design edits use Firebase transactions at
`rooms/{code}/design/{missionId}`; the ISS design scene persists ballots,
subsystem selections, cargo, role ownership, pings, and readiness there.

Mission state changes use host-only transactions through `useMission`. Clients
write only their own position and append interaction intents; the host
validates/consumes intents, updates the shared mission, and removes processed
queue entries. Position writes are throttled to 10 Hz. Mission timestamps are
host-authored; clients estimate the displayed event clock between host updates.

## Capsule milestone

- `src/game/capsule/` provides the full-window starfield, planet view, warning
  effects, resource rings, WebAudio mute control, and three-screen onboarding.
- `useWarnings()` is available to components rendered inside `CapsuleShell`.
- `/?demo=capsule` cycles through all 24 warning-level/window-effect pairs.
- `prefers-reduced-motion` freezes the starfield and suppresses shake/flicker.

## ISS design milestone

- `src/game/design/` provides the five-stage ISS design flow, round-robin roles,
  role swaps by mutual acceptance, tie-broken voting, trade-study radars,
  blueprint installation, stackable cargo, launch-window voting, and readiness
  gates. The ISS fixture values are fictional game-balance units.
- `/?demo=design&players=1` and `/?demo=design&players=4` run the shared mock
  design flow with a local seat switcher, so one or four crew members can finish
  the design without Firebase.
- Timer expiry completes a fallback design, marks it rushed, and launches from
  the host seat. Under-timeout review gates still block normal launch.
- During review, unanimous crew sign-off launches immediately when every gate
  is clear, without waiting for the five-minute timer to expire.
- The design flow has a skippable/replayable stage walkthrough, and the
  planning console uses an expanded viewport with wider, denser layouts to
  minimize scrolling on desktop.
- The lobby's solo demo link opens the V2 ISS design and flight demo.
- `src/game/missionViz/` provides a lazy-loaded Three.js orrery, compact ISS
  flight tracker, full-screen launch-window picker, and debrief replay with
  pending/resolved/failed event markers. The trajectory fixtures in
  `src/content/trajectories.ts` are explicitly illustrative and not to scale.
- The `three` runtime dependency is paired with the `@types/three` dev
  dependency because the selected Three.js package version does not ship
  declaration files; the type package preserves the repository's strict
  no-`any` requirement.
- The launch-window choice is carried into mission setup: its trip days set the
  displayed mission duration, allocated cargo sets the starting fuel supply,
  and its required fuel-crate ratio scales host-simulated fuel drain. Tracker
  progress reads the authoritative `MissionState.progress` value advanced by
  the 240-second mission clock.
- ISS debriefs show a two-sentence sourced real-world note for each scheduled
  event, plus Apollo 13 and ISS analog missions. `THIRD_PARTY_NOTICES.md`
  records the Mission Viz license check and credits the tracker as inspired by
  NASA Mission Viz; no upstream code or assets were copied.

## ISS flight milestone

- `src/game/mission/` provides the six-system cabin map, storage and airlock
  stations, keyboard walking, smoothed crew positions, diagnosis choices,
  spare delivery, cooperative repairs, event debrief, and up to two retries.
- The pure deterministic engine in `src/shared/sim/` creates reproducible
  event schedules from room, mission, and attempt; advances the 240-second
  mission clock; drains resources; and evaluates event, resource, and system
  failure as well as victory.
- ISS event and response options are fictional game-balance content. Correct
  response data is not serialized into `MissionEvent` state. Redundant modules
  gate backup saves; spares and second-station repairs are validated by the
  host simulation.
- To keep the teamwork star achievable, event count also scales with crew size:
  three connected players schedule at least two ISS events and four schedule
  all three fixtures. Higher design risk increases event count and overlaps
  event windows.

## Moon, Mars, and campaign

- `src/content/moon-v2.ts` and `mars-v2.ts` provide mission-specific objectives,
  launch vehicles, spacecraft, subsystem choices, launch windows, cargo limits,
  and four/five event fixtures. Mission values are fictional game-balance
  units. Their design and flight scenes use the same staged console and
  cooperative simulation as ISS.
- Each fixture and analog mission has a source-linked, two-sentence debrief.
  The original prompt's separate "source pool" was not present, so the content
  uses NASA, JPL, and Smithsonian sources already cited by the repository or
  identified for these scenarios. The historical note is explicitly separated
  from the fictional game event.
- Every mission permits two retries after the first attempt. Exhausting them
  advances to the campaign record; "Cure delivered" is shown only when the
  saved ISS, Moon, and Mars mission outcomes are all wins.
- Prepared-design tests cover the readiness gates and resource clock; rushed
  designs schedule more events and drain resources faster. This is a
  deterministic game model, not an empirical estimate of real player win rate.
- The pre-retry balance harness assumes a practiced crew resolves each event
  with 92% probability. Across 1,000 deterministic seeds, this produces
  70–80% Moon/Mars mission wins; this is a stated simulation assumption, not
  live-player telemetry.
- The final campaign record links event-research and analog-mission sources,
  credits the original Mission Viz-inspired tracker, and states that NASA does
  not endorse the project.

## Assumptions and current scope

- Existing `plan-*` steps map to V2 design and `decision-*` steps map to the
  mission scene for the same mission; `results` maps to the campaign record.
- V2 is the default unless `VITE_GAME_V2=0`; Vite evaluates this flag at build
  time. The legacy scenes remain available.
- The NASA Space Apps challenge's source pool was omitted from the task text;
  no missing challenge-resource URLs were invented. Mission research instead
  links to the NASA/JPL/Smithsonian references included in the repository.
- Mission resource values are game units derived from cargo and spacecraft
  capacity; critical resources drain at fixed balance rates over the 240-second
  clock. The host's wall clock is authoritative, and a new host resumes from
  the persisted timestamp and mission state.
- Launch-window travel days and fuel-drain multipliers are game-balance values:
  the selected window contributes its configured trip days, fuel crates, and
  fuel-crate ratio to mission setup; the simulation still lasts 240 real
  seconds, while the tracker maps that authoritative progress to mission days.
- A failed event or critical resource/system ends an attempt immediately.
  Retries reuse the saved design but use an attempt-specific event seed.
- The mission scene adds state-derived markers and skippable/replayable flight
  and event guidance. Guidance is data-backed and supports ISS, Moon, and Mars.
