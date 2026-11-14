import { getMissionV2Content } from '../../content/missions-v2';
import type {
  DesignState,
  MissionEvent,
  MissionId,
  MissionState,
  ResourceKey,
  SystemId,
} from '../../shared/types';
import {
  createMissionState,
  hashMissionSeed,
  MISSION_SECONDS,
  type MissionIntentContext,
  type MissionResponseOption,
} from '../../shared/sim';
import { calculateDesignStats } from '../design/designLogic';

const RESOURCE_KEYS: readonly ResourceKey[] = [
  'fuel',
  'power',
  'oxygen',
  'water',
  'food',
  'shielding',
  'spares',
];

export function getMissionResources(
  design: DesignState,
  missionId: MissionId,
): Record<ResourceKey, number> {
  const content = getMissionV2Content(missionId);
  const stats = calculateDesignStats(design, content);
  const values: Record<ResourceKey, number> = {
    fuel: design.cargo.fuel * 10,
    power: (design.cargo.power + Math.ceil(stats.powerSupply / 5)) * 10,
    oxygen: design.cargo.oxygen * 10,
    water: design.cargo.water * 10,
    food: design.cargo.food * 10,
    shielding: design.cargo.shielding * 10,
    spares: design.cargo.spares,
  };
  return Object.fromEntries(
    RESOURCE_KEYS.map((resource) => [
      resource,
      Math.max(0, values[resource]),
    ]),
  ) as Record<ResourceKey, number>;
}

export function getMissionRedundantSystems(
  design: DesignState,
  missionId: MissionId,
): SystemId[] {
  const content = getMissionV2Content(missionId);
  const installed = design.installedModules ?? design.modules;
  return Object.values(installed)
    .map((id) => content.subsystemOptions.find((option) => option.id === id))
    .filter((option): option is (typeof content.subsystemOptions)[number] =>
      Boolean(option?.redundant),
    )
    .map((option) => option.system);
}

export function createMissionFlightState(
  roomCode: string,
  missionId: MissionId,
  design: DesignState,
  playerIds: readonly string[],
  attempt = 1,
  now = Date.now(),
): MissionState {
  const content = getMissionV2Content(missionId);
  const stats = calculateDesignStats(design, content);
  const launchWindow = content.launchWindows.find(
    (window) => window.id === design.launchWindowId,
  );
  const crewRisk = Math.max(0, playerIds.length - 1) / 3;
  return createMissionState({
    seed: hashMissionSeed(roomCode, missionId, attempt),
    risk: stats.risk,
    missionDays: stats.missionDays,
    fuelBurnMultiplier: launchWindow ? launchWindow.fuelCrates / 3 : 1,
    resourceDrainMultiplier:
      content.resourceDrainMultiplier * (design.rushed ? 1.45 : 1),
    minimumEventCount: content.minimumEventCount,
    schedulingRisk:
      content.minimumEventCount > 0
        ? stats.risk
        : Math.max(stats.risk, crewRisk),
    templates: content.events,
    now,
    durationSeconds: MISSION_SECONDS,
    attempt,
    playerIds,
    resources: getMissionResources(design, missionId),
  });
}

export function getMissionFixtureForEvent(
  event: Pick<MissionEvent, 'id'>,
  missionId: MissionId,
) {
  const content = getMissionV2Content(missionId);
  return content.events.find((fixture) =>
    event.id.startsWith(`${fixture.id}-`),
  );
}

export function getMissionResponsesForEvent(
  event: MissionEvent,
  design: DesignState,
  state: MissionState,
  missionId: MissionId,
) {
  const fixture = getMissionFixtureForEvent(event, missionId);
  if (!fixture) return [];
  const redundantSystems = new Set(
    getMissionRedundantSystems(design, missionId),
  );
  return fixture.responses.filter(
    (response) =>
      (!response.requiresRedundancy ||
        redundantSystems.has(response.requiresRedundancy)) &&
      (!response.requiresSpare || state.resources.spares > 0),
  );
}

export function getMissionIntentContext(
  state: MissionState,
  design: DesignState,
  missionId: MissionId,
  activePlayerIds?: readonly string[],
): MissionIntentContext {
  const responsesByEvent: Record<string, readonly MissionResponseOption[]> = {};
  for (const event of state.events) {
    const fixture = getMissionFixtureForEvent(event, missionId);
    if (!fixture) continue;
    responsesByEvent[event.id] = fixture.responses.map((response) => ({
      id: response.id,
      correct: response.correct,
      ...(response.requiresSpare ? { requiresSpare: true } : {}),
      ...(response.requiresRedundancy
        ? { requiresRedundancy: response.requiresRedundancy }
        : {}),
      ...(response.requiresAssistSystem
        ? { requiresAssistSystem: response.requiresAssistSystem }
        : {}),
      ...(response.repairSeconds
        ? { repairSeconds: response.repairSeconds }
        : {}),
      ...(response.degradedSave ? { degradedSave: true } : {}),
    }));
  }
  return {
    responsesByEvent,
    redundantSystems: getMissionRedundantSystems(design, missionId),
    ...(activePlayerIds ? { activePlayerIds } : {}),
  };
}

export function createISSFlightState(
  roomCode: string,
  design: DesignState,
  playerIds: readonly string[],
  attempt = 1,
  now = Date.now(),
): MissionState {
  return createMissionFlightState(roomCode, 'iss', design, playerIds, attempt, now);
}

export function getISSFixtureForEvent(event: Pick<MissionEvent, 'id'>) {
  return getMissionFixtureForEvent(event, 'iss');
}

export function getISSResponsesForEvent(
  event: MissionEvent,
  design: DesignState,
  state: MissionState,
) {
  return getMissionResponsesForEvent(event, design, state, 'iss');
}

export function getISSIntentContext(
  state: MissionState,
  design: DesignState,
  activePlayerIds?: readonly string[],
): MissionIntentContext {
  return getMissionIntentContext(state, design, 'iss', activePlayerIds);
}

export function getISSMissionResources(
  design: DesignState,
): Record<ResourceKey, number> {
  return getMissionResources(design, 'iss');
}

export function getISSRedundantSystems(design: DesignState): SystemId[] {
  return getMissionRedundantSystems(design, 'iss');
}
