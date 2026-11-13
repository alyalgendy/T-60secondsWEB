# AGENTS.md — standing rules for this repo

These rules apply to every feature, scene and milestone.

## 1. What we are building

A co-op web game for the NASA Space Apps Challenge. 1–4 players join a room with
a 4-character code and plan three missions together: the ISS, then the Moon,
then Mars. Before each mission a provided video cutscene teaches something real.
In each mission players choose a craft, allocate resources inside a mass budget,
then take turns solving a real-incident-inspired decision problem.

## 2. Tech stack (fixed)

- Vite + React 18 + TypeScript strict, no `any`.
- Plain CSS Modules + the variables in `src/shared/tokens.css`. No Tailwind, no
  UI libraries.
- Firebase Realtime Database via the modular JS SDK.
- Allowed extra packages: `framer-motion`, `clsx`, `@fontsource/orbitron`,
  `@fontsource/rajdhani`, `@fontsource/share-tech-mono`. Do not add anything
  else without telling the team why.
- No secrets in code. Firebase config comes from `import.meta.env.VITE_FIREBASE_*`.

## 3. Ownership

```
src/shared/        M1 ONLY (types, tokens, firebase, hooks, scoring, UI kit, harness)
src/scenes/lobby/  M1
src/scenes/iss/    M2
src/scenes/moon/   M3
src/scenes/mars/   M4
src/scenes/decision/  M4
src/scenes/cutscene/  M4
src/scenes/results/   M4
src/content/       M4 / content author
```

- Only create or edit files inside your own folder(s).
- Import from `src/shared` but never modify it unless you are M1.
- If you need a shared change, write the exact patch request at the end of your
  reply and ask M1.
- Do not edit `src/App.tsx` or `src/sceneRegistry.ts`. Scenes are discovered
  automatically from the folder names above.

## 4. Visual theme: Mission Control HUD

- Every scene renders inside `<HudShell>` (top bar: mission name, step, room
  code, player badges). Never build your own page chrome.
- Design for 1280×720 and keep it usable down to 1024 wide. No page scroll;
  panels scroll internally.
- Panels: `<HudPanel title="…">`, 1px cyan border, corner brackets. Section
  labels are uppercase, small, letter-spaced (`0.12em`), `--font-display`.
- Numbers/data: `--font-mono`. Body text: `--font-body`.
- Buttons: `<HudButton variant="primary|ghost|danger">`. One primary action per
  screen.
- Motion: subtle only (150–250ms fade/slide, glowing gauges). Respect
  `prefers-reduced-motion`.
- English, plain words, short sentences. Explain a space term the first time it
  appears.
- Accessibility: keyboard reachable, visible focus ring, `aria-label` on icon
  buttons, never color alone (add an icon or text), contrast ≥ 4.5:1.
- Player identity: each player has a color and an initial. Use `<PlayerBadge>`
  and show who last edited a shared control.

## 5. Standard planning layout (ISS, Moon, Mars)

Three columns inside `HudShell`:

1. **Left — Mission Brief**: destination, 2–3 `<FactCard>`s with NASA/ESA
   sources, and the mission goal in one sentence.
2. **Center — Plan Builder**: craft chooser (hide if only one craft), then one
   `<ResourceSlider>` per resource with its one-line "why it matters".
3. **Right — Mission Status**: mass used vs budget gauge, per-resource coverage
   gauges (below min = danger, min→ideal = warn, at/above ideal = ok), live
   `scorePlan()` preview, and `<ReadyBar>`.

Co-op rules are identical in all planning scenes:

- All players edit the same live draft from props. Write with `updateDraft`.
- Each player presses **Lock plan** (`toggleReady`). When everyone is ready the
  host gets **Launch mission**, which calls `launch(plan)`.
- Launch is disabled while mass used > budget or any resource is below minimum.
  The UI must say exactly why.
- 1 player still works (host and only voter).

## 6. Data contract

Use the types and component names in `src/shared/types.ts`. Your scene receives
`PlanningSceneProps`, `CutsceneProps`, `DecisionSceneProps` or
`ResultsSceneProps`. Scenes never read Firebase directly; they use props and the
hooks exported from `src/shared`.

Each mission folder exports:

- `config.ts`: `export const missionConfig: MissionConfig`
- `index.tsx`: `export default function XxxScene(props: PlanningSceneProps)`

`src/content/problems.<mission>.ts` exports a default `DecisionProblem[]`
(3+ problems per mission). Every problem has exactly 3 options with real
trade-offs, and a `realWorld.source` from NASA/ESA.

## 7. Accuracy rules

- Do not invent technical facts or numbers. Every fact shown to a player needs a
  `source: { title, url }` from NASA or ESA.
- If unsure of a number, write `TODO(verify)` in a code comment and use a clearly
  labeled game-balance value ("game units").
- Resource amounts, mass and budgets are game units unless a real figure is
  cited.
- Keep real mission names exactly as NASA uses them.

## 8. Definition of done

- Scene renders inside `HudShell` using only shared UI components and tokens.
- Works with 1, 2, 3 and 4 players in mock mode:
  `/?scene=<step>&mock=<1-4>`.
- All state goes through props; no direct Firebase calls in the scene.
- Keyboard and screen-reader basics pass.
- `npm run build` and `npx tsc --noEmit` pass with no errors.
- No new dependencies beyond section 2.
- End your reply with: (1) what you built, (2) assumptions, (3) any patch
  requests for `src/shared`.
