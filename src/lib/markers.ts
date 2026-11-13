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
