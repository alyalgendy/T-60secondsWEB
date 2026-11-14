import {
  scorePlan,
  type MissionConfig,
  type PlanDraft,
  type PlanningPlayer,
} from "@/game/planning";
import {
  getLaunchBlockers,
  getMassBudget,
  getMassUsed,
} from "@/shared/scoring";
import type { AnchorId } from "./anchors";
import { isValidRoomCode } from "./room-code";
import { MAX_PLAYERS, type RoomView } from "./types";

/**
 * Markers are ALWAYS derived from state. Components must never invent their
 * own indicators — they render what this selector returns, attached to an anchor.
 */
export type MarkerSeverity = "info" | "attention" | "critical";
export type MarkerKind = "attention" | "state" | "context";

export interface Marker {
  id: string;
  anchor: AnchorId;
  kind: MarkerKind;
  severity: MarkerSeverity;
  label: string;
}

export function getLandingMarkers(input: { name: string; code: string }): Marker[] {
  const markers: Marker[] = [];

  if (!input.name.trim()) {
    markers.push({
      id: "landing-name",
      anchor: "name-field",
      kind: "attention",
      severity: "attention",
      label: "Set a call sign first",
    });
  }

  if (input.code.trim() && !isValidRoomCode(input.code)) {
    markers.push({
      id: "landing-code",
      anchor: "join-button",
      kind: "state",
      severity: "critical",
      label: "That code doesn't look right",
    });
  }

  return markers;
}

export function getLobbyMarkers(room: RoomView, youId: string): Marker[] {
  const markers: Marker[] = [];

  for (const player of room.players) {
    if (!player.connected) {
      markers.push({
        id: `offline-${player.id}`,
        anchor: `player-${player.id}`,
        kind: "state",
        severity: "critical",
        label: "Signal lost — seat held",
      });
    }
  }

  if (room.phase === "BRIEFING") {
    markers.push({
      id: "preflight-locked",
      anchor: "phase-banner",
      kind: "context",
      severity: "info",
      label: "Preflight locked — scramble arrives in the next build",
    });
    return markers;
  }

  const you = room.players.find((player) => player.id === youId);
  const crew = room.players.filter((player) => player.connected);
  const notReady = crew.filter((player) => !player.ready);

  if (!you?.ready) {
    markers.push({
      id: "you-standby",
      anchor: "ready-button",
      kind: "attention",
      severity: "attention",
      label: "Lock in when you're set",
    });
  }

  if (room.hostId === youId) {
    if (notReady.length > 0) {
      markers.push({
        id: "waiting-crew",
        anchor: "start-button",
        kind: "attention",
        severity: "attention",
        label: `Waiting on ${notReady.map((player) => player.name).join(", ")}`,
      });
    } else {
      markers.push({
        id: "all-ready",
        anchor: "start-button",
        kind: "attention",
        severity: "info",
        label: "All crew ready — launch preflight",
      });
    }
  } else if (notReady.some((player) => player.id === youId)) {
    markers.push({
      id: "commander-waiting",
      anchor: "host-badge",
      kind: "context",
      severity: "info",
      label: "Commander is waiting on you",
    });
  }

  const openSeats = MAX_PLAYERS - room.players.length;
  if (openSeats > 0) {
    markers.push({
      id: "open-seats",
      anchor: "invite-card",
      kind: "context",
      severity: "info",
      label: `${openSeats} ${openSeats === 1 ? "seat" : "seats"} open`,
    });
  }

  return markers;
}

export interface MoonMarkerInput {
  config: MissionConfig;
  draft: PlanDraft;
  players: PlanningPlayer[];
  youId: string;
}

/**
 * Moon planning markers. They point at state ("fuel below minimum", "waiting on
 * the crew") and never at which slider value would be "correct".
 */
export function getMoonMarkers(input: MoonMarkerInput): Marker[] {
  const markers: Marker[] = [];
  const score = scorePlan(input.config, input.draft);
  // Same gate as the Launch button, so markers never clear a blocked plan.
  const launch = { ok: getLaunchBlockers(input.config, input.draft).length === 0 };
  const crew = input.players.filter((player) => player.connected);
  const you = input.players.find((player) => player.id === input.youId);
  const ready = new Set(input.draft.readyPlayerIds);
  const waiting = crew.filter((player) => !ready.has(player.id));

  if (!input.draft.craftId) {
    markers.push({
      id: "moon-no-craft",
      anchor: "moon-craft",
      kind: "attention",
      severity: "attention",
      label: "Choose a lander to set the game loadout budget",
    });
  }

  const below = score.coverage.filter((item) => item.status === "below-min");
  if (below.length > 0) {
    markers.push({
      id: "moon-below-min",
      anchor: "moon-resources",
      kind: "state",
      severity: "critical",
      label:
        below.length === 1
          ? `${below[0].label} below minimum`
          : `${below.length} resources below minimum`,
    });
  }

  if (
    getMassUsed(input.config, input.draft.resources) >
    getMassBudget(input.config, input.draft.craftId)
  ) {
    markers.push({
      id: "moon-over-mass",
      anchor: "moon-status",
      kind: "state",
      severity: "critical",
      label: "Loadout over budget",
    });
  }

  if (!ready.has(input.youId)) {
    markers.push({
      id: "moon-you-standby",
      anchor: "moon-ready",
      kind: "attention",
      severity: "attention",
      label: "Lock your plan when you're set",
    });
  }

  if (you?.isHost) {
    if (waiting.length > 0) {
      markers.push({
        id: "moon-waiting-crew",
        anchor: "moon-launch",
        kind: "attention",
        severity: "attention",
        label: `Waiting on ${waiting.map((player) => player.name).join(", ")}`,
      });
    } else if (launch.ok) {
      markers.push({
        id: "moon-cleared",
        anchor: "moon-launch",
        kind: "attention",
        severity: "info",
        label: "All crew ready — launch the mission",
      });
    }
  } else if (waiting.length === 0 && launch.ok) {
    markers.push({
      id: "moon-commander-cleared",
      anchor: "moon-launch",
      kind: "context",
      severity: "info",
      label: "Commander can launch",
    });
  }

  return markers;
}
