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
import type { AnchorId, StaticAnchorId } from "./anchors";
import { isValidRoomCode } from "./room-code";
import { MAX_PLAYERS, type RoomView } from "./types";
import type { DesignState, MissionId, MissionState, Player, ResourceKey } from "@/shared/types";

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

export function getV2Markers(
  phase: "design" | "mission",
  crewCount: number,
): Marker[] {
  const anchor: StaticAnchorId = phase === "design" ? "v2-design" : "v2-mission";
  return [
    {
      id: `${phase}-crew-count`,
      anchor,
      kind: "state",
      severity: "info",
      label: `${crewCount} ${crewCount === 1 ? "crew member" : "crew members"} connected`,
    },
  ];
}

const DESIGN_STAGE_ANCHORS: Record<DesignState["stage"], StaticAnchorId> = {
  concept: "design-objectives",
  feasibility: "design-hangar",
  trade: "design-trade",
  "point-design": "design-blueprint",
  review: "design-review",
};

export function getDesignMarkers(input: {
  state: DesignState;
  playerId: string;
  players: readonly Player[];
  now: number;
  missionId?: MissionId;
}): Marker[] {
  const { state, playerId, players, now } = input;
  const crew = players.filter((player) => player.connected);
  const anchor = DESIGN_STAGE_ANCHORS[state.stage];
  const markers: Marker[] = [];

  if (state.stage === "review") {
    if (!state.ready.includes(playerId)) {
      markers.push({
        id: "design-signoff",
        anchor: "design-ready",
        kind: "attention",
        severity: "attention",
        label: "Sign off",
      });
    }
  } else {
    const topic =
      state.stage === "concept"
        ? "objectives"
        : state.stage === "feasibility"
          ? state.launchVehicleId
            ? "craft"
            : "vehicle"
          : null;
    if (topic && !state.votes[topic]?.[playerId]) {
      markers.push({
        id: `design-vote-${topic}`,
        anchor,
        kind: "attention",
        severity: "attention",
        label: "Cast vote",
      });
    }
    if (state.stage === "trade" && !state.modules.engine) {
      markers.push({
        id: "design-trade-start",
        anchor,
        kind: "attention",
        severity: "attention",
        label: "Choose systems",
      });
    }
    if (
      state.stage === "point-design" &&
      !state.votes.window?.[playerId]
    ) {
      markers.push({
        id: "design-window-vote",
        anchor: "design-window-picker",
        kind: "attention",
        severity: "attention",
        label: "Vote on launch window",
      });
    }
  }

  const ping = state.pings?.[playerId];
  if (ping && now - ping.at < 6000) {
    markers.push({
      id: `design-ping-${ping.at}`,
      anchor,
      kind: "context",
      severity: "info",
      label: `${players.find((player) => player.id === ping.from)?.name ?? "Crew"}: ${ping.message}`,
    });
  }
  if (crew.length > 0 && crew.every((player) => state.ready.includes(player.id))) {
    markers.push({
      id: "design-all-ready",
      anchor: "design-ready",
      kind: "state",
      severity: "info",
      label: "Crew ready",
    });
  }
  return markers;
}

export function getMissionMarkers(input: {
  state: MissionState;
  playerId: string;
  players: readonly Player[];
  now: number;
}): Marker[] {
  const { state, playerId, players, now } = input;
  const markers: Marker[] = [];
  const activeEvents = state.events.filter(
    (event) =>
      event.status !== "resolved" &&
      event.status !== "failed" &&
      event.startsAt <= now,
  );

  if (state.outcome === "running" && state.progress >= 0.875) {
      markers.push({
        id: "mission-clock-low",
        anchor: "mission-clock",
        kind: "state",
        severity: "attention",
        label: "Clock low",
      });
  }
  if (state.outcome === "running") {
    markers.push({
      id: "mission-trajectory-progress",
      anchor: "mission-tracker",
      kind: "state",
      severity: "info",
      label: `${Math.round(state.progress * 100)}% mission progress`,
    });
  }

  if (activeEvents.some((event) => event.status === "pending")) {
    markers.push({
      id: "mission-response-needed",
      anchor: "mission-response",
      kind: "attention",
      severity: "attention",
      label: "Response needed",
    });
  }
  if (
    activeEvents.some(
      (event) =>
        event.status === "diagnosed" &&
        event.requiresAssistSystem &&
        players.filter((player) => player.connected).length > 1 &&
        !Object.values(state.players).some(
          (missionPlayer) =>
            missionPlayer.repairing?.eventId === event.id &&
            missionPlayer.repairing.mode === "assist",
        ),
    )
  ) {
    markers.push({
      id: "mission-crew-assist",
      anchor: "mission-map",
      kind: "attention",
      severity: "attention",
      label: "Crew assist",
    });
  }
  if (
    activeEvents.some(
      (event) =>
        event.status === "diagnosed" &&
        event.requiresSpare &&
        !event.spareDelivered,
    )
  ) {
    markers.push({
      id: "mission-spare-needed",
      anchor: "mission-map",
      kind: "state",
      severity: "attention",
      label: "Spare needed",
    });
  }

  const lowResources = (Object.keys(state.resources) as ResourceKey[]).filter(
    (resource) => {
      const maximum = state.resourceMax?.[resource] ?? 0;
      return (
        maximum > 0 &&
        state.resources[resource] > 0 &&
        state.resources[resource] / maximum <= 0.25
      );
    },
  );
  for (const resource of lowResources) {
    markers.push({
      id: `mission-resource-${resource}`,
      anchor: "mission-resource",
      kind: "state",
      severity: "critical",
      label: `${resource[0]!.toUpperCase()}${resource.slice(1)} low`,
    });
  }

  if (state.outcome === "won") {
    markers.push({
      id: "mission-won",
      anchor: "mission-debrief",
      kind: "state",
      severity: "info",
      label: "Mission won",
    });
  } else if (state.outcome === "lost") {
    markers.push({
      id: `mission-lost-${playerId}`,
      anchor: "mission-debrief",
      kind: "state",
      severity: "critical",
      label: "Mission lost",
    });
  }
  if (state.outcome !== "running" && state.events.length > 0) {
    markers.push({
      id: "mission-replay-events",
      anchor: "mission-replay",
      kind: "attention",
      severity: "info",
      label: "Review event timeline",
    });
  }
  return markers;
}

export function getCampaignMarkers(
  outcomes: Partial<Record<MissionId, MissionState | null>>,
): Marker[] {
  const missionIds: readonly MissionId[] = ["iss", "moon", "mars"];
  const complete = missionIds.every((id) => outcomes[id] !== undefined);
  if (!complete) {
    return [{
      id: "campaign-records-pending",
      anchor: "campaign-ending",
      kind: "context",
      severity: "info",
      label: "Receiving flight records",
    }];
  }
  const delivered = missionIds.every((id) => outcomes[id]?.outcome === "won");
  return [{
    id: delivered ? "campaign-cure-delivered" : "campaign-not-delivered",
    anchor: "campaign-ending",
    kind: "state",
    severity: delivered ? "info" : "critical",
    label: delivered ? "Cure delivered" : "Campaign incomplete",
  }];
}
