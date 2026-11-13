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
] as const;

export type StaticAnchorId = (typeof ANCHORS)[number];

/** Player cards are dynamic, so anchors can also be `player-<id>`. */
export type AnchorId = StaticAnchorId | `player-${string}`;

export function isStaticAnchor(value: string): value is StaticAnchorId {
  return (ANCHORS as readonly string[]).includes(value);
}
