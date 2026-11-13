import type { StaticAnchorId } from "./anchors";

export type TutorialPhase = "landing" | "lobby" | "moon";

export interface TutorialStep {
  id: string;
  phase: TutorialPhase;
  anchor: StaticAnchorId;
  title: string;
  body: string;
}

/**
 * Tutorial content is data, never branches in components.
 * Adding a screen or mechanic means adding a step here — that's the rule.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "landing-name",
    phase: "landing",
    anchor: "name-field",
    title: "Pick a call sign",
    body: "This is how the rest of the crew sees you. It stays on this device — no account, no sign-up.",
  },
  {
    id: "landing-create",
    phase: "landing",
    anchor: "create-button",
    title: "Create a room to command",
    body: "Whoever creates the room becomes Mission Commander. You'll get a 5-character code to share.",
  },
  {
    id: "landing-join",
    phase: "landing",
    anchor: "join-button",
    title: "Or join an existing crew",
    body: "Paste a code or a full invite link. Bad codes are rejected before you ever connect to a room.",
  },
  {
    id: "lobby-ready",
    phase: "lobby",
    anchor: "ready-button",
    title: "Lock in when you're set",
    body: "Ready is a signal to the Commander, nothing more. You can stand down any time before launch.",
  },
  {
    id: "lobby-start",
    phase: "lobby",
    anchor: "start-button",
    title: "Commander launches preflight",
    body: "Once every connected player is locked in, the Commander can launch. This is where the 60-second scramble will begin.",
  },
  {
    id: "lobby-invite",
    phase: "lobby",
    anchor: "invite-card",
    title: "Up to four crew",
    body: "Share the link. Dropped players keep their seat for two minutes, so a refresh doesn't cost anyone their spot.",
  },
  {
    id: "moon-craft",
    phase: "moon",
    anchor: "moon-craft",
    title: "Pick your ride",
    body: "The lander sets your mass budget. A bigger bay gives you more margin; heavier ships cost more game units and carry more risk.",
  },
  {
    id: "moon-resources",
    phase: "moon",
    anchor: "moon-resources",
    title: "Balance the load",
    body: "Every unit spends mass. Fuel and shielding matter more here. Anything below its minimum blocks launch — the markers call it out.",
  },
  {
    id: "moon-ready",
    phase: "moon",
    anchor: "moon-ready",
    title: "Lock in together",
    body: "Everyone edits the same live draft. Lock your plan when you are happy; the Commander launches once the whole crew is ready and every resource clears its minimum.",
  },
];

const SEEN_KEY = "t60.tutorial.seen.v1";

export function resetSeenSteps(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SEEN_KEY);
}

export function readSeenSteps(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((step): step is string => typeof step === "string") : [];
  } catch {
    return [];
  }
}

export function writeSeenSteps(steps: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set(steps)]));
}

export function stepsForPhase(phase: TutorialPhase, seen: string[]): TutorialStep[] {
  return TUTORIAL_STEPS.filter((step) => step.phase === phase && !seen.includes(step.id));
}
