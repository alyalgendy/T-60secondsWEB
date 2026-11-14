## 1. Goal
 
Rebuild the **gameplay and UI** of this repo, "T-60 seconds" (React 18 + TypeScript + Vite + Firebase Realtime Database; 1-4 players share a room code; 3 missions: ISS, then Moon, then Mars; pre-made video cutscenes between them; built for the NASA Space Apps challenge "Space Mission Design Game").
 
Today the planning step is a set of sliders in boxy split panels. The new game must:
 
1. Be **more collaborative**: each player has a different role and the team must negotiate shared limits.
2. Simulate the **real mission design process** (NASA mission design stages, below), not just sliders.
3. Have **clear win/lose conditions** (section 7).
4. Feel like a **game, not a dashboard**: full-screen view out of a space capsule window, warnings that appear as risk grows, **much less text and much more visuals**.
5. Include a **Mission Viz-style tracker** (Three.js) that follows mission progress.
Make reasonable assumptions instead of asking questions. List them in the PR description.
 
## 2. Constraints
 
- **Deadline:** the Space Apps hackathon ends Sunday Nov 15. Every milestone must leave the game fully playable. Build the new version next to the old one behind `VITE_GAME_V2=1` and switch the router default only when Milestone 5 passes. Do not delete old code before that.
- **Stack stays:** Vite, React 18, TypeScript (strict, no `any`), CSS Modules with the existing CSS variables, Firebase Realtime Database.
- **New dependencies allowed (all MIT):** `three`, `lucide-react` (icons), `vitest` (dev). Nothing else without a written reason in the PR.
- **Keep:** lobby, room codes, Firebase hooks, flow router, `CutscenePlayer` and the 4 cutscene videos (`public/videos/`). Never regenerate or replace videos.
- **Language:** English. See the text budget in section 8.
## 3. First step of every task
 
Read the repo. The first time, write `docs/REBUILD_PLAN.md` listing: what exists, what is kept, what is replaced, and which Firebase paths are in use. Later tasks must read and update that file.
 
## 4. Core loop (per mission, 3 missions: ISS, Moon, Mars)
 
```
Cutscene -> DESIGN PHASE (5 min or until all ready) -> Flight Readiness Review
 -> Launch -> MISSION PHASE (simulated mission clock, tracker, crisis events)
 -> Debrief (what happened, real analog missions, stars) -> next cutscene
```
 
Winning all 3 missions shows the "cure delivered" ending. Failing a mission shows the debrief and lets the team **retry that mission, up to 2 retries**.
 
## 5. Roles (collaboration)
 
Each player gets a role (assigned in the lobby by join order, can be swapped by agreement). Roles follow the spacecraft disciplines used by NASA's Mission Design Lab (power, propulsion, thermal, structures, avionics, communications, attitude control, reliability, cost, risk).
 
| Role | Owns | Station in the capsule |
|---|---|---|
| Mission Lead | objectives, launch window, cost, final sign-off, tie-breaks | Command console |
| Power & Thermal | Solar Panels, Temperature control | Power room |
| Propulsion & Structures | Engine, Meteorite protection, fuel | Engine room |
| Comms & Avionics | Communication, Navigation (attitude/star trackers, computers) | Comms deck |
 
Rules:
- **Fewer than 4 players:** unowned roles are shared round-robin among present players. A player with several roles gets a role switcher. 1 player plays all roles.
- Everyone sees every subsystem as a small gauge cluster. Only the owner opens that subsystem's console and changes it.
- **Shared limits** (mass, power, cost, delta-v, life-support days) change live as anyone edits, so players must talk and trade off.
- **Voting** (majority; ties broken by Mission Lead): objectives, launch vehicle, spacecraft, launch window, final sign-off.
- **Pings:** icon buttons ("need more power", "too heavy", "over budget", "looks good") that flash on the owner's console. No typed chat.
## 6. Design phase: simulate real mission design
 
Default timer `DESIGN_SECONDS = 300` (blueprint: 5 minutes or until all press ready). Stages follow NASA's Concept Maturity Levels and Mission Design Lab study levels. Interaction must be visual (drag, drop, flip, hold, vote tokens). **Sliders are not allowed anywhere.**
 
| Stage | NASA basis | What players do |
|---|---|---|
| 1 Concept | CML 1, "Office Hours" | A mission board shows the need and requirements (crew, duration, payload). Drag 2 of 4 objective cards onto the board and vote. Objectives change requirements. |
| 2 Feasibility | CML 2, "Concept Development" | Vote on a **launch vehicle** and a **spacecraft** in a hangar carousel. A risk radar previews risk. Options that are incompatible with the chosen objectives are greyed out with an icon showing why (like NASA's telescope design game). |
| 3 Trade studies | CML 3, "Trade Studies" | Each owner compares 2-3 architectures for their subsystems on a radar chart (mass, power, cost, risk, reliability) and picks one. Dependencies are real: bigger engine means more mass and structure; stronger comms means more power draw. |
| 4 Point design | CML 4, "Point Design" | (a) Drag chosen modules onto the craft blueprint slots (Engine, Solar Panels, Temperature control, Communication, Navigation, Meteorite protection). (b) Fill the **cargo bay grid** with stackable crates (food, water, oxygen, fuel, spares); capacity is limited by cells, not a slider. (c) Pick a **launch window** in the Mission Viz tracker (earlier = more fuel, shorter trip; later = cheaper, longer). |
| 5 Flight Readiness Review | design review | Everyone presses ready. Gates show green/amber/red: mass, power, cost, delta-v, comms coverage, life-support days vs mission days, redundancy. |
 
Also show a four-icon **segment checklist**: Launch, Space, Ground, User (NASA's four mission segments). Launch = vehicle chosen. Space = craft built. Ground = comms coverage above threshold. User = objective payload installed.
 
**Launch rule:** launch is blocked while any gate is red. If the timer expires, the mission launches anyway with a **risk penalty** (extra events), so a rushed design is punished, as in the blueprint.
 
## 7. Mission phase and win/lose
 
### Gameplay (hybrid view)
- The cabin is a **top-down map** with stations for the 6 systems plus storage and airlock. Players walk with **WASD/arrows**, interact with **E/Space**, and hold to repair. Each player is a colored avatar with their role icon.
- Host runs the **authoritative simulation**; clients send only their own position (throttled to ~10 Hz, interpolated) and interaction intents.
- A mission clock runs `MISSION_SECONDS = 240` real seconds mapped to mission days (shown in the tracker).
- Resources (oxygen, water, food, fuel, power, spares) drain over time and show as small ring gauges on the window frame.
### Events (crises)
Events are scheduled by the simulation from the design's risk score (seeded from room code + mission + attempt, so they are reproducible). Each event:
1. **Warning:** appears on the window (section 8) with the failing system lit on the cabin map.
2. **60-second countdown** (`EVENT_SECONDS = 60`).
3. **Diagnose:** the system's owner (or any present player) picks 1 of 3 responses on the station screen. Available responses depend on the design (e.g. "switch to backup" exists only if redundancy was built; "use spare" costs spares). A wrong diagnosis costs time and adds damage.
4. **Repair:** physical and cooperative. Hold-to-repair at the station; many events also need a **second player to carry a spare part** from storage to the station, or to hold a second station at the same time.
Late in the mission events can overlap (chaos).
### Win
Reach the end of the mission clock with **every event resolved** and **no critical resource at 0**. Stars: **Design** (margins at launch), **Response** (average time to fix), **Teamwork** (every present player contributed at least one diagnosis or repair).
 
### Lose
- Any event countdown reaches 0 unresolved (the mission fails). Exception: one degraded-mode save if a redundant backup was built for that system.
- Oxygen, water, food, fuel or power reaches 0.
- A system's health reaches 0.
- **Wrong craft** is not an instant loss: it raises the event count and severity (shown beforehand in the risk radar). **Bad allocation** shows up as resources running out early.
## 8. UI: "Space capsule", not boxy panels
 
- **Full-screen scene.** Layered parallax starfield on canvas, with Earth, Moon or Mars scaled by mission progress. A capsule window frame (vignette, rivets, glow) surrounds it. The cabin floor and consoles sit in the lower part of the screen. **No 3-column split layouts.**
- **Consoles** are glowing screens in the scene. Clicking a station zooms the camera into that console (300 ms transition).
- **Warning levels:** Advisory (amber icon), Caution (amber pulse), Warning (red edge pulse, rotating beacon, countdown ring around the system icon), Critical (red vignette and light screen shake). Warnings are **holographic pop-ups with an icon, system name and countdown only**.
- **Window effects** tell the story visually: solar flare = white flash and speckles; micrometeoroid = streaks and a crack decal; comms pause = static; thermal = heat shimmer or frost; engine = flicker; power drop = lights dim.
- **Text budget:** labels at most 3 words, tooltips at most 1 sentence (with a source link icon), no paragraphs in gameplay. Debrief "What really happened" is at most 2 sentences. Use icons (`lucide-react`), gauges, colors plus shapes, and animations to carry meaning.
- **Sound:** synthesized with WebAudio (no asset files): beeps, alarm, ambience. A mute toggle is always visible; default unmuted but quiet.
- **Onboarding:** a 3-screen visual tutorial (roles, walking and repairing, warnings) before the first mission, skippable.
- **Accessibility:** `prefers-reduced-motion` disables shake and flicker; never rely on color alone; keyboard operable; contrast at least 4.5:1.
- **Performance:** 60 fps on a mid-range laptop; lazy-load the Three.js tracker.
## 9. Mission Viz tracker (Three.js port)
 
Feature folder: `src/features/missionViz/`.
 
**License gate (do this first).** Open https://github.com/nasa/mission-viz and read its `LICENSE` file and the headers of the files you want (the Three.js orrery in `OntologyDrivenOrrery/`).
- If the license is permissive and clear: port the Three.js orrery code, keep the original headers, and add attribution to `THIRD_PARTY_NOTICES.md`.
- If there is **no license or it is unclear**: do **not** copy code. Re-implement the same technique from scratch (planets on orbit lines, a spacecraft marker, a timeline) and credit "inspired by NASA Mission Viz" in the credits.
- In both cases: use the `three` npm package (not a bundled copy), drop the ontology/JSON-LD/R/X3Dom parts, and drive everything from our TypeScript config. Say in the PR which path you took.
Features:
- Bodies: Sun, Earth, Moon, Mars with orbit lines. Spacecraft marker moves along the mission trajectory by mission progress (ISS: Earth orbit; Moon: Earth-Moon transfer; Mars: Earth-Mars transfer).
- Trajectories are **illustrative precomputed curves** in `src/content/trajectories.ts`, clearly labeled "illustrative, not to scale".
- Timeline bar with event markers colored by status (pending, resolved, failed).
- Camera presets: follow craft, overview. Compact corner widget during the mission; full-screen overlay for the launch-window choice (Stage 4) and for the debrief replay.
- Stretch: generate trajectory data offline with NASA's open-source GMAT and load it as JSON.
## 10. Data and architecture
 
New shared types (add to `src/shared/types.ts`; keep existing ones working):
 
```ts
type RoleId = 'lead' | 'power-thermal' | 'propulsion-structures' | 'comms-avionics';
type SystemId = 'engine' | 'solar' | 'thermal' | 'comms' | 'navigation' | 'shield';
type DesignStage = 'concept' | 'feasibility' | 'trade' | 'point-design' | 'review';
 
interface SubsystemOption {
  id: string; system: SystemId; label: string; icon: string;
  mass: number; power: number; cost: number;      // game units
  risk: number; reliability: number;              // 0..1
  redundant?: boolean;
  incompatibleWith?: { optionId: string; reason: string }[];
  source?: { title: string; url: string };
}
 
interface DesignState {                            // rooms/{code}/design/{missionId}
  stage: DesignStage; endsAt: number;
  objectiveIds: string[]; launchVehicleId: string | null; craftId: string | null;
  modules: Partial<Record<SystemId, string>>;     // option ids
  cargo: Record<ResourceKey, number>;              // crates placed
  launchWindowId: string | null;
  votes: Record<string, Record<string, string>>;   // topic -> playerId -> choice
  ready: string[];
}
 
interface MissionState {                           // rooms/{code}/mission/{missionId}
  attempt: number; startedAt: number; progress: number;   // 0..1
  systems: Record<SystemId, { health: number; status: 'ok' | 'degraded' | 'failed' }>;
  resources: Record<ResourceKey, number>;
  players: Record<string, { x: number; y: number; carrying: string | null }>;
  events: MissionEvent[];
  outcome: 'running' | 'won' | 'lost'; lostReason?: string;
}
 
interface MissionEvent {
  id: string; system: SystemId; level: 'caution' | 'warning' | 'critical';
  startsAt: number; deadlineAt: number;
  diagnosedBy?: string; repairedBy?: string[];
  status: 'pending' | 'diagnosed' | 'resolved' | 'failed';
  windowEffect: 'flare' | 'micrometeoroid' | 'static' | 'thermal' | 'engine' | 'powerdip';
}
```
 
- **Pure simulation** in `src/shared/sim/` (no React, no Firebase): stats from chosen options, gate checks, risk score, event scheduling, resource drain, win/lose evaluation. Cover it with `vitest` tests.
- **Content as data** in `src/content/`: objectives, launch vehicles, crafts, subsystem options, trajectories, events, analog missions. One file per mission where it makes sense.
- **Host authority:** only the host writes `mission/*`. Clients write their own `players/{id}` position and an `intents` queue. If the host leaves, existing host reassignment applies and the new host resumes from the last state.
## 11. Content and accuracy rules
 
- Do not invent technical facts. Every real-world claim shown to players needs a source (NASA/ESA). Use game units for mass, power, cost and resources unless a real figure is cited.
- If unsure, add a `TODO(verify)` comment and a clearly labeled game-balance value.
- Resource documents from the challenge have no URLs in the pasted text; use `url: 'TODO(team: add URL from the challenge Resources tab)'`.
- The debrief lists 1-2 **real analog missions** with a source link (like NASA's telescope game, which names similar real missions).
- Credits screen: NASA data and sources used, Mission Viz attribution, and the line "NASA does not endorse this project."
## 12. Definition of done (every task)
 
- [ ] `npm run build`, `npx tsc --noEmit` and `npx vitest run` pass
- [ ] Works with 1, 2, 3 and 4 players (a mock mode or two browser tabs)
- [ ] No sliders, no 3-column layouts, no paragraphs in gameplay
- [ ] Old game still works until the V2 flag becomes default
- [ ] `docs/REBUILD_PLAN.md` updated
- [ ] PR description lists what changed, assumptions, and anything blocked

## APPENDIX: Events and source pool
 
Read each page before using it. Simplify the story for players and cite it. Do not add details the page does not state.
 
| Event | System | Real basis | Window effect |
|---|---|---|---|
| Solar flare or radiation storm confuses star trackers | Navigation | Stardust and a solar flare: https://www.jpl.nasa.gov/news/stardust-spacecraft-encounters-solar-flare/ ; Solar storms and flares: https://science.nasa.gov/sun/solar-storms-and-flares/ | flare |
| Solar array does not deploy or power drops | Solar Panels | Lucy solar array anomaly: https://svs.gsfc.nasa.gov/20366/ | powerdip |
| Brief communications pause | Communication | Voyager 1 conserves power, resolves brief communications pause: https://www.jpl.nasa.gov/news/nasas-voyager-1-conserves-power-resolves-brief-communications-pause/ | static |
| Micrometeoroid hits | Meteorite protection | Onboard systems, micro-meteoroid protection: https://science.nasa.gov/learn/basics-of-space-flight/chapter11-4/ | micrometeoroid |
| Temperature swing | Temperature control | Same chapter, temperature control subsystems | thermal |
| Engine or propulsion anomaly | Engine | Same chapter, propulsion subsystems | engine |
 
Not yet checked (open each first, original links had missing hyphens):
- https://www.jpl.nasa.gov/news/nasas-hibernating-mars-rover-may-not-call-home/
- https://www.jpl.nasa.gov/news/mariner-iv-crosses-path-with-micrometeoroids/
- https://www.nasa.gov/history/60-years-ago-mariner-2-first-to-explore-venus/
- https://www.nasa.gov/solar-system/latest-updates-from-nasa-on-image-recovery/
- https://www.nasa.gov/missions/new-horizons-team-responds-to-spacecraft-anomaly/
- https://www.esa.int/articles/about-us/directorates/science/anatomy-of-a-spacecraft
How the challenge's resources map to the game:
 
| Resource | Used for |
|---|---|
| Design and Develop Science Missions (4 segments, CMLs) | Design stages, segment checklist |
| Mission Design Lab (study levels, disciplines) | Stage names, player roles |
| Mission Viz | Tracker (section 9) |
| GMAT | Launch-window trade; stretch: offline trajectory data |
| A Learning Game About Telescopes | Greyed-out incompatible options; analog missions in the debrief |
| CubeSat 101 (ConOps) | Stretch: arrange a mission timeline of key events |
| 2023 VR mission challenge | Tracker feature set: concept, trajectory, timeline, 3D view |