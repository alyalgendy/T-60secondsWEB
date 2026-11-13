# AGENTS.md — standing rules for this repo

These rules are permanent. They apply to every future feature, screen and
milestone, not just the current one.

## 1. Markers and tutorials are never optional

**Every screen, phase, mechanic, role, mission and event ships with markers and
tutorial coverage. A feature is not done until both exist.**

- Markers are produced by selectors (`src/lib/markers.ts` and later
  `src/game/`). Components render `MarkerSlot`; they never invent their own
  indicators.
- Markers never reveal hidden information or the "correct" answer. They point
  attention at state ("oxygen critical", "your turn"), never at decisions.
- Tutorial content lives in data (`src/lib/tutorial.ts`), not in `if` branches
  in components.
- Every tutorial step and marker anchor is typed against `src/lib/anchors.ts`.
  Pointing at an anchor that does not exist is a build/typecheck failure.
- Tutorials are always skippable and replayable. Markers are always derived and
  never hardcoded into a screen.
- New missions, ships, events and roles must add their guidance data before
  they are considered complete.

## 2. Architecture rules

- Game logic lives in a pure, framework-free, seeded engine. No React, no
  Firebase, no DOM inside the engine.
- Real-time phases (the 60-second scramble) stay outside the deterministic
  engine and hand it a serialised result. The engine must remain replayable
  from a seed.
- All content is validated data, not code branches.
- The transport (Firebase RTDB today) sits behind a service layer
  (`src/lib/lobby-service.ts`). Screens do not talk to Firebase directly.
- Raw transport objects never reach components; they are normalised into
  view types first.

## 3. Definition of done

A change is done when:

1. `npm run typecheck` passes.
2. `npm run build` passes.
3. `npm run test:lobby` passes (or the relevant replacement test suite).
4. The feature has markers and tutorial coverage, or an explicit note in the
   PR explaining why neither applies.
5. Accessibility: markers use icon/shape/text, never colour alone; motion
   respects `prefers-reduced-motion`.

## 4. Commands

```bash
npm run dev         # Next + Firebase RTDB emulator
npm run typecheck   # tsc --noEmit
npm run build       # production build
npm run test:lobby  # end-to-end lobby smoke test (starts the emulator)
```
