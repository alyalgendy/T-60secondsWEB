import type { StaticAnchorId } from "./anchors";

export type TutorialPhase =
  | "landing"
  | "lobby"
  | "moon"
  | "v2-design"
  | "v2-mission"
  | "campaign"
  | "design"
  | "capsule-onboarding";

export interface TutorialStep {
  id: string;
  phase: TutorialPhase;
  anchor: StaticAnchorId;
  title: string;
  body: string;
  visual?: string;
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
  {
    id: "v2-design-overview",
    phase: "v2-design",
    anchor: "v2-design",
    title: "Plan together",
    body: "Your crew will shape mission goals, compare spacecraft systems, and review shared limits.",
  },
  {
    id: "design-concept",
    phase: "design",
    anchor: "design-objectives",
    title: "Choose goals",
    body: "Choose two goals, signal trade-offs with crew pings, and beat the five-minute clock.",
    visual: "◇",
  },
  {
    id: "design-feasibility",
    phase: "design",
    anchor: "design-hangar",
    title: "Pick the vehicle",
    body: "Vote for a compatible vehicle and craft; the Mission Lead breaks ties.",
    visual: "▲",
  },
  {
    id: "design-trade",
    phase: "design",
    anchor: "design-trade",
    title: "Compare systems",
    body: "Each role owns two systems; request a swap and get agreement first. Choices trade mass, power, and cost.",
    visual: "⌘",
  },
  {
    id: "design-point",
    phase: "design",
    anchor: "design-blueprint",
    title: "Build the craft",
    body: "Install each chosen module, pack cargo cells, and select a launch window.",
    visual: "⬡",
  },
  {
    id: "design-window-viz",
    phase: "design",
    anchor: "design-window-picker",
    title: "Compare trajectories",
    body: "Vote on a launch window; shorter trips use more fuel, while longer trips change mission time.",
    visual: "◉",
  },
  {
    id: "design-review",
    phase: "design",
    anchor: "design-review",
    title: "Review together",
    body: "Clear every red gate, then all crew sign off before the host launches.",
    visual: "✓",
  },
  {
    id: "v2-mission-overview",
    phase: "v2-mission",
    anchor: "v2-mission",
    title: "Fly together",
    body: "Move through the cabin, respond to system events, and keep mission resources above zero.",
  },
  {
    id: "mission-walk",
    phase: "v2-mission",
    anchor: "mission-map",
    title: "Walk the cabin",
    body: "Use WASD or arrows to reach a station, then press E or Space to interact.",
    visual: "⌖",
  },
  {
    id: "mission-diagnose",
    phase: "v2-mission",
    anchor: "mission-response",
    title: "Diagnose together",
    body: "Choose a response at the affected station; a wrong diagnosis costs time and system health.",
    visual: "△",
  },
  {
    id: "mission-repair",
    phase: "v2-mission",
    anchor: "mission-map",
    title: "Repair as crew",
    body: "Hold E at the system, deliver a spare when needed, and send a crewmate to assist.",
    visual: "⚙",
  },
  {
    id: "mission-tracker",
    phase: "v2-mission",
    anchor: "mission-tracker",
    title: "Track the flight",
    body: "The craft marker follows the host mission clock; event dots show where incidents began.",
    visual: "◈",
  },
  {
    id: "mission-event-flare",
    phase: "v2-mission",
    anchor: "mission-response",
    title: "Solar alert",
    body: "A flare affects the solar system; reach that console to diagnose the event.",
    visual: "☼",
  },
  {
    id: "mission-event-comms",
    phase: "v2-mission",
    anchor: "mission-response",
    title: "Comms alert",
    body: "Signal static affects communications; available repairs depend on the design and cargo.",
    visual: "⌁",
  },
  {
    id: "mission-event-thermal",
    phase: "v2-mission",
    anchor: "mission-response",
    title: "Thermal alert",
    body: "A thermal event may use a backup, a spare, or a second station.",
    visual: "◇",
  },
  {
    id: "mission-event-moon-array",
    phase: "v2-mission",
    anchor: "mission-response",
    title: "Array latch",
    body: "A partly deployed array limits power; shed load or choose a spare-assisted repair.",
    visual: "☼",
  },
  {
    id: "mission-event-moon-comms",
    phase: "v2-mission",
    anchor: "mission-response",
    title: "Relay handover",
    body: "The lunar relay is silent; a backup route needs a second crewmate at navigation.",
    visual: "⌁",
  },
  {
    id: "mission-event-moon-rover",
    phase: "v2-mission",
    anchor: "mission-response",
    title: "Rover sleep",
    body: "A quiet rover may be conserving power; diagnose before forcing a wake-up.",
    visual: "⌖",
  },
  {
    id: "mission-event-moon-fender",
    phase: "v2-mission",
    anchor: "mission-response",
    title: "Dust shield",
    body: "A rover fender is damaged; patch it with a spare or take the slower route.",
    visual: "⬡",
  },
  {
    id: "mission-event-mars-safe",
    phase: "v2-mission",
    anchor: "mission-response",
    title: "Safe mode",
    body: "The backup computer is active; a prepared recovery or a low-power coast can buy time.",
    visual: "◇",
  },
  {
    id: "mission-event-mars-comms",
    phase: "v2-mission",
    anchor: "mission-response",
    title: "Silent relay",
    body: "Rebuild the link using a spare or ask a crewmate to route through navigation.",
    visual: "⌁",
  },
  {
    id: "mission-event-mars-radiation",
    phase: "v2-mission",
    anchor: "mission-response",
    title: "Radiation alert",
    body: "Protect the crew before continuing surface work; a second station can help add shielding.",
    visual: "△",
  },
  {
    id: "mission-event-mars-dust",
    phase: "v2-mission",
    anchor: "mission-response",
    title: "Dust storm",
    body: "Solar output is falling; conserve power or use a spare to deploy additional panels.",
    visual: "☼",
  },
  {
    id: "mission-event-mars-probe",
    phase: "v2-mission",
    anchor: "mission-response",
    title: "Probe stalled",
    body: "A surface probe needs a second station for the arm-assisted repair.",
    visual: "⚙",
  },
  {
    id: "mission-debrief",
    phase: "v2-mission",
    anchor: "mission-debrief",
    title: "Debrief and retry",
    body: "A failed attempt can be retried twice before the mission is over.",
    visual: "↻",
  },
  {
    id: "mission-replay",
    phase: "v2-mission",
    anchor: "mission-replay",
    title: "Replay the timeline",
    body: "Play the trajectory again or select an event marker to inspect when it happened.",
    visual: "◌",
  },
  {
    id: "campaign-ending",
    phase: "campaign",
    anchor: "campaign-ending",
    title: "Check campaign outcome",
    body: "The cure is delivered only when the ISS, Moon, and Mars missions are all won.",
    visual: "✓",
  },
  {
    id: "capsule-crew-roles",
    phase: "capsule-onboarding",
    anchor: "capsule-tutorial-roles",
    title: "Crew stations",
    body: "Each astronaut owns different systems; ask a crewmate to handle their station.",
    visual: "◉",
  },
  {
    id: "capsule-movement",
    phase: "capsule-onboarding",
    anchor: "capsule-tutorial-movement",
    title: "Move and repair",
    body: "Use WASD or arrows to move; hold E or Space to repair a station.",
    visual: "⌖",
  },
  {
    id: "capsule-warning-levels",
    phase: "capsule-onboarding",
    anchor: "capsule-tutorial-warnings",
    title: "Read warnings",
    body: "Respond before countdown ends; the window shows which system is affected.",
    visual: "△",
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
