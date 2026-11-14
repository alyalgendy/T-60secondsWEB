/**
 * Every tutorial step and marker points at one of these ids.
 * Tutorial steps are typed to StaticAnchorId, so a step pointing at a
 * non-existent anchor fails `npm run typecheck` instead of silently breaking.
 */
export const ANCHORS = [
  // landing
  "name-field",
  "create-button",
  "join-button",
  "how-it-works",
  // lobby
  "phase-banner",
  "crew-list",
  "ready-button",
  "start-button",
  "host-badge",
  "invite-card",
  "activity-log",
  // moon planning
  "moon-brief",
  "moon-craft",
  "moon-resources",
  "moon-status",
  "moon-ready",
  "moon-launch",
  // V2 placeholder phases
  "v2-design",
  "v2-mission",
  // V2 design stages
  "design-console",
  "design-objectives",
  "design-hangar",
  "design-trade",
  "design-blueprint",
  "design-review",
  "design-crew",
  "design-timer",
  "design-ready",
  "design-window-picker",
  // Capsule shell and onboarding
  "capsule-warning",
  "capsule-resources",
  "capsule-tutorial-roles",
  "capsule-tutorial-movement",
  "capsule-tutorial-warnings",
  // ISS flight
  "mission-map",
  "mission-response",
  "mission-resource",
  "mission-clock",
  "mission-tracker",
  "mission-debrief",
  "mission-replay",
  "campaign-ending",
] as const;

export type StaticAnchorId = (typeof ANCHORS)[number];

/** Player cards are dynamic, so anchors can also be `player-<id>`. */
export type AnchorId = StaticAnchorId | `player-${string}`;

export function isStaticAnchor(value: string): value is StaticAnchorId {
  return (ANCHORS as readonly string[]).includes(value);
}
