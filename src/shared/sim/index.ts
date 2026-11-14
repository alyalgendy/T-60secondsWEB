import type {
  MissionEvent,
  MissionIntent,
  MissionPosition,
  MissionState,
  MissionPlayerState,
  ResourceKey,
  SubsystemOption,
  SystemId,
} from '../types';

export interface DesignStats {
  mass: number;
  power: number;
  cost: number;
  risk: number;
  reliability: number;
  redundantSystems: number;
}

export interface DesignLimits {
  maxMass: number;
  maxPower: number;
  maxCost: number;
  minimumReliability: number;
  minimumRedundantSystems: number;
}

export interface ReadinessGate {
  id: keyof DesignLimits;
  passed: boolean;
}

export interface EventTemplate {
  id: string;
  system: SystemId;
  level: MissionEvent['level'];
  windowEffect: MissionEvent['windowEffect'];
  repairSeconds?: number;
  requiresSpare?: boolean;
  requiresAssistSystem?: SystemId;
}

export interface MissionResponseOption {
  id: string;
  correct: boolean;
  requiresSpare?: boolean;
  requiresRedundancy?: SystemId;
  requiresAssistSystem?: SystemId;
  repairSeconds?: number;
  degradedSave?: boolean;
}

export interface MissionStartOptions {
  seed: number;
  risk: number;
  schedulingRisk?: number;
  missionDays?: number;
  fuelBurnMultiplier?: number;
  resourceDrainMultiplier?: number;
  minimumEventCount?: number;
  templates: readonly EventTemplate[];
  now: number;
  durationSeconds: number;
  attempt: number;
  playerIds: readonly string[];
  resources: Record<ResourceKey, number>;
}

export interface MissionIntentContext {
  responsesByEvent: Readonly<Record<string, readonly MissionResponseOption[]>>;
  redundantSystems?: readonly SystemId[];
  activePlayerIds?: readonly string[];
}

export type MissionOutcome = {
  outcome: MissionState['outcome'];
  lostReason?: string;
};

export const MISSION_SECONDS = 240;
export const EVENT_SECONDS = 60;
export const MISSION_RESOURCE_RATES: Readonly<Partial<Record<ResourceKey, number>>> = {
  fuel: 0.08,
  power: 0.08,
  oxygen: 0.08,
  water: 0.08,
  food: 0.08,
  shielding: 0.02,
};

export const CABIN_STATIONS: Readonly<
  Record<SystemId | 'storage' | 'airlock', MissionPosition>
> = {
  engine: { x: 25, y: 70 },
  solar: { x: 75, y: 35 },
  thermal: { x: 25, y: 35 },
  comms: { x: 75, y: 70 },
  navigation: { x: 50, y: 30 },
  shield: { x: 50, y: 72 },
  storage: { x: 12, y: 84 },
  airlock: { x: 88, y: 84 },
};

const STATION_RADIUS = 13;
const RESOURCE_KEYS: readonly ResourceKey[] = [
  'fuel',
  'power',
  'oxygen',
  'water',
  'food',
  'shielding',
  'spares',
];
const SYSTEM_IDS: readonly SystemId[] = [
  'engine',
  'solar',
  'thermal',
  'comms',
  'navigation',
  'shield',
];
const CRITICAL_RESOURCES: readonly ResourceKey[] = [
  'oxygen',
  'water',
  'food',
  'fuel',
  'power',
];

export function calculateDesignStats(
  modules: Partial<Record<SystemId, string>>,
  options: readonly SubsystemOption[],
): DesignStats {
  const selected = Object.values(modules)
    .map((id) => options.find((option) => option.id === id))
    .filter((option): option is SubsystemOption => option !== undefined);
  const count = selected.length;

  return selected.reduce(
    (stats, option) => ({
      mass: stats.mass + option.mass,
      power: stats.power + option.power,
      cost: stats.cost + option.cost,
      risk: stats.risk + option.risk / Math.max(count, 1),
      reliability: stats.reliability + option.reliability / Math.max(count, 1),
      redundantSystems: stats.redundantSystems + Number(option.redundant === true),
    }),
    {
      mass: 0,
      power: 0,
      cost: 0,
      risk: 0,
      reliability: 0,
      redundantSystems: 0,
    },
  );
}

export function checkReadinessGates(
  stats: DesignStats,
  limits: DesignLimits,
): ReadinessGate[] {
  return [
    { id: 'maxMass', passed: stats.mass <= limits.maxMass },
    { id: 'maxPower', passed: stats.power <= limits.maxPower },
    { id: 'maxCost', passed: stats.cost <= limits.maxCost },
    {
      id: 'minimumReliability',
      passed: stats.reliability >= limits.minimumReliability,
    },
    {
      id: 'minimumRedundantSystems',
      passed: stats.redundantSystems >= limits.minimumRedundantSystems,
    },
  ];
}

export function calculateRisk(stats: DesignStats, rushed = false): number {
  const risk = stats.risk + (rushed ? 0.15 : 0);
  return Math.min(1, Math.max(0, risk));
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function hashMissionSeed(
  roomCode: string,
  missionId: string,
  attempt: number,
): number {
  const value = `${roomCode.toUpperCase()}:${missionId}:${attempt}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function scheduleEvents(
  seed: number,
  risk: number,
  templates: readonly EventTemplate[],
  missionDuration: number,
  now: number,
  minimumEventCount = 0,
): MissionEvent[] {
  if (templates.length === 0 || missionDuration <= 0) return [];
  const normalizedRisk = Math.min(1, Math.max(0, risk));
  const riskScaledCount =
    minimumEventCount > 0
      ? minimumEventCount + Math.floor(normalizedRisk * templates.length)
      : Math.ceil(normalizedRisk * templates.length);
  const count = Math.min(
    templates.length,
    Math.max(minimumEventCount, riskScaledCount),
  );
  if (count === 0) return [];

  const random = seededRandom(seed);
  const shuffled = [...templates];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }

  return shuffled.slice(0, count).map((template, index) => {
    const spacing = (index + 1) / (count + 1);
    const compression = 1 - 0.45 * normalizedRisk;
    const startsAt = now + Math.floor(missionDuration * spacing * compression);
    return {
      id: `${template.id}-${index + 1}`,
      system: template.system,
      level: template.level,
      windowEffect: template.windowEffect,
      startsAt,
      deadlineAt: startsAt + EVENT_SECONDS * 1000,
      repairRequired: template.repairSeconds ?? 8,
      repairProgress: 0,
      wrongDiagnoses: 0,
      ...(template.requiresSpare ? { requiresSpare: true } : {}),
      ...(template.requiresAssistSystem
        ? { requiresAssistSystem: template.requiresAssistSystem }
        : {}),
      status: 'pending',
    };
  });
}

export function createMissionState(options: MissionStartOptions): MissionState {
  const players: Record<string, MissionPlayerState> = {};
  options.playerIds.forEach((playerId, index) => {
    players[playerId] = {
      x: 44 + (index % 4) * 4,
      y: 84,
      carrying: null,
    };
  });
  const systems = Object.fromEntries(
    SYSTEM_IDS.map((system) => [system, { health: 100, status: 'ok' as const }]),
  ) as MissionState['systems'];
  const events = scheduleEvents(
    options.seed,
    options.schedulingRisk ?? options.risk,
    options.templates,
    options.durationSeconds * 1000,
    options.now,
    options.minimumEventCount,
  );
  const initial: MissionState = {
    attempt: options.attempt,
    startedAt: options.now,
    lastTickAt: options.now,
    seed: options.seed,
    risk: options.risk,
    missionDays: options.missionDays ?? 0,
    fuelBurnMultiplier: options.fuelBurnMultiplier ?? 1,
    resourceDrainMultiplier: options.resourceDrainMultiplier ?? 1,
    progress: 0,
    systems,
    resources: Object.fromEntries(
      RESOURCE_KEYS.map((resource) => [
        resource,
        Math.max(0, options.resources[resource] ?? 0),
      ]),
    ) as Record<ResourceKey, number>,
    resourceMax: { ...options.resources },
    players,
    events,
    outcome: 'running',
  };
  const outcome = evaluateMissionOutcome(initial, options.now);
  return { ...initial, ...outcome };
}

export function drainResources(
  resources: Record<ResourceKey, number>,
  ratesPerSecond: Partial<Record<ResourceKey, number>>,
  elapsedSeconds: number,
): Record<ResourceKey, number> {
  const elapsed = Math.max(0, elapsedSeconds);
  const next = { ...resources };
  for (const [resource, rate] of Object.entries(ratesPerSecond) as [
    ResourceKey,
    number,
  ][]) {
    next[resource] = Math.max(0, resources[resource] - rate * elapsed);
  }
  return next;
}

function distance(first: MissionPosition, second: MissionPosition): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function isNear(
  player: MissionPlayerState,
  station: keyof typeof CABIN_STATIONS,
): boolean {
  return distance(player, CABIN_STATIONS[station]) <= STATION_RADIUS;
}

export function syncMissionPositions(
  state: MissionState,
  positions: Readonly<Record<string, MissionPosition>>,
): MissionState {
  let changed = false;
  const players = { ...state.players };
  for (const [playerId, position] of Object.entries(positions)) {
    const player = players[playerId];
    if (
      player &&
      Number.isFinite(position.x) &&
      Number.isFinite(position.y) &&
      (player.x !== position.x || player.y !== position.y)
    ) {
      players[playerId] = { ...player, x: position.x, y: position.y };
      changed = true;
    }
  }
  return changed ? { ...state, players } : state;
}

export function evaluateMissionOutcome(
  state: Pick<MissionState, 'progress' | 'systems' | 'resources' | 'events'>,
  now: number,
): MissionOutcome {
  const failedEvent = state.events.find((event) => event.status === 'failed');
  if (failedEvent) {
    return { outcome: 'lost', lostReason: `${failedEvent.system} event unresolved` };
  }
  const expiredEvent = state.events.find(
    (event) =>
      event.status !== 'resolved' &&
      event.startsAt <= now &&
      event.deadlineAt <= now,
  );
  if (expiredEvent) {
    return { outcome: 'lost', lostReason: `${expiredEvent.system} event unresolved` };
  }

  for (const resource of CRITICAL_RESOURCES) {
    if (state.resources[resource] <= 0) {
      return { outcome: 'lost', lostReason: `${resource} depleted` };
    }
  }

  const failedSystem = Object.entries(state.systems).find(
    ([, system]) => system.status === 'failed' || system.health <= 0,
  );
  if (failedSystem) {
    return { outcome: 'lost', lostReason: `${failedSystem[0]} system failed` };
  }

  if (
    state.progress >= 1 &&
    state.events.every((event) => event.status === 'resolved')
  ) {
    return { outcome: 'won' };
  }

  return { outcome: 'running' };
}

export function tickMission(
  state: MissionState,
  now: number,
  positions: Readonly<Record<string, MissionPosition>> = {},
  activePlayerIds?: readonly string[],
): MissionState {
  if (state.outcome !== 'running') return state;

  const elapsedSeconds = Math.max(0, (now - (state.lastTickAt ?? state.startedAt)) / 1000);
  const positionedState = syncMissionPositions(state, positions);
  const players = { ...positionedState.players };

  const systems = { ...state.systems };
  const activePlayers = activePlayerIds
    ? new Set(activePlayerIds)
    : new Set(Object.keys(players));
  const drainScale =
    Math.max(0, state.resourceDrainMultiplier ?? 1) *
    (1 + Math.max(0, state.risk ?? 0) * 0.25);
  const resourceRates = { ...MISSION_RESOURCE_RATES };
  for (const resource of Object.keys(resourceRates) as ResourceKey[]) {
    resourceRates[resource] =
      (resourceRates[resource] ?? 0) * drainScale;
  }
  resourceRates.fuel =
    (MISSION_RESOURCE_RATES.fuel ?? 0) *
    Math.max(0, state.fuelBurnMultiplier ?? 1) *
    drainScale;
  const resources = drainResources(state.resources, resourceRates, elapsedSeconds);
  const events = state.events.map((event) => ({ ...event }));
  for (const event of events) {
    if (
      event.status !== 'resolved' &&
      event.startsAt <= now &&
      event.deadlineAt <= now
    ) {
      event.status = 'failed';
    }
    if (event.status !== 'diagnosed' || elapsedSeconds <= 0) continue;

    const repairers = Object.entries(players).filter(
      ([playerId, player]) =>
        activePlayers.has(playerId) &&
        player.repairing?.eventId === event.id &&
        player.repairing.mode === 'repair' &&
        player.repairing.station === event.system &&
        isNear(player, event.system),
    );
    const assistants = event.requiresAssistSystem
      ? Object.entries(players).filter(
          ([playerId, player]) =>
            activePlayers.has(playerId) &&
            player.repairing?.eventId === event.id &&
            player.repairing.mode === 'assist' &&
            player.repairing.station === event.requiresAssistSystem &&
            isNear(player, event.requiresAssistSystem!),
        )
      : [];
    const needsAssist =
      Boolean(event.requiresAssistSystem) && activePlayers.size > 1;
    if (
      repairers.length === 0 ||
      (needsAssist && assistants.length === 0) ||
      (event.requiresSpare && !event.spareDelivered)
    ) {
      continue;
    }

    const durationFactor = event.requiresAssistSystem && !needsAssist ? 2 : 1;
    event.repairProgress =
      (event.repairProgress ?? 0) + elapsedSeconds / durationFactor;
    if (event.repairProgress >= (event.repairRequired ?? 8)) {
      event.status = 'resolved';
      event.resolvedAt = now;
      event.repairedBy = [
        ...new Set([
          ...repairers.map(([playerId]) => playerId),
          ...assistants.map(([playerId]) => playerId),
        ]),
      ];
      const system = systems[event.system];
      systems[event.system] = {
        health: Math.min(100, system.health + 10),
        status: system.health > 0 ? 'ok' : 'failed',
      };
      for (const [playerId, player] of Object.entries(players)) {
        if (player.repairing?.eventId === event.id) {
          const { repairing: _repairing, ...rest } = player;
          players[playerId] = rest;
        }
      }
    }
  }

  const next: MissionState = {
    ...state,
    lastTickAt: now,
    progress: Math.min(
      1,
      Math.max(0, (now - state.startedAt) / (MISSION_SECONDS * 1000)),
    ),
    systems,
    resources,
    players,
    events,
  };
  return { ...next, ...evaluateMissionOutcome(next, now) };
}

function withProcessedIntent(state: MissionState, intentId: string): MissionState {
  return {
    ...state,
    processedIntentIds: [...(state.processedIntentIds ?? []), intentId].slice(-256),
  };
}

export function applyMissionIntent(
  state: MissionState,
  intent: MissionIntent,
  context: MissionIntentContext,
  now: number,
): MissionState {
  if (
    state.outcome !== 'running' ||
    state.attempt !== intent.attempt ||
    !state.players[intent.playerId] ||
    (context.activePlayerIds &&
      !context.activePlayerIds.includes(intent.playerId)) ||
    state.processedIntentIds?.includes(intent.id)
  ) {
    return state;
  }

  const player = state.players[intent.playerId]!;
  const { action } = intent;
  if (action.kind === 'repair-stop') {
    if (!player.repairing) return withProcessedIntent(state, intent.id);
    const players = { ...state.players };
    const { repairing: _repairing, ...rest } = player;
    players[intent.playerId] = rest;
    return withProcessedIntent({ ...state, players }, intent.id);
  }

  if (action.kind === 'pickup-spare') {
    if (player.carrying || state.resources.spares <= 0 || !isNear(player, 'storage')) {
      return withProcessedIntent(state, intent.id);
    }
    return withProcessedIntent(
      {
        ...state,
        players: {
          ...state.players,
          [intent.playerId]: { ...player, carrying: 'spare' },
        },
      },
      intent.id,
    );
  }

  const event = state.events.find((candidate) => candidate.id === action.eventId);
  if (!event || event.startsAt > now || event.deadlineAt <= now) {
    return withProcessedIntent(state, intent.id);
  }

  if (action.kind === 'diagnose') {
    if (event.status !== 'pending') return withProcessedIntent(state, intent.id);
    const response = context.responsesByEvent[event.id]?.find(
      (candidate) => candidate.id === action.responseId,
    );
    if (
      !response ||
      (response.requiresSpare && state.resources.spares < 1) ||
      (response.requiresRedundancy &&
        !context.redundantSystems?.includes(response.requiresRedundancy))
    ) {
      return withProcessedIntent(state, intent.id);
    }
    if (!response.correct) {
      const health = Math.max(0, state.systems[event.system].health - 20);
      const systems = {
        ...state.systems,
        [event.system]: {
          health,
          status: health <= 0 ? 'failed' as const : 'degraded' as const,
        },
      };
      const events = state.events.map((candidate) =>
        candidate.id === event.id
          ? {
              ...candidate,
              deadlineAt: Math.max(now + 1000, candidate.deadlineAt - 15_000),
              wrongDiagnoses: (candidate.wrongDiagnoses ?? 0) + 1,
            }
          : candidate,
      );
      const next = withProcessedIntent({ ...state, systems, events }, intent.id);
      return { ...next, ...evaluateMissionOutcome(next, now) };
    }

    const events = state.events.map((candidate) =>
      candidate.id === event.id
        ? {
            ...candidate,
            status: response.degradedSave ? 'resolved' as const : 'diagnosed' as const,
            diagnosedBy: intent.playerId,
            ...(response.degradedSave
              ? { repairedBy: [intent.playerId], resolvedAt: now }
              : {}),
            requiresSpare: response.requiresSpare ?? candidate.requiresSpare,
            requiresAssistSystem:
              response.requiresAssistSystem ?? candidate.requiresAssistSystem,
            repairRequired: response.repairSeconds ?? candidate.repairRequired,
          }
        : candidate,
    );
    const systems = response.degradedSave
      ? {
          ...state.systems,
          [event.system]: {
            ...state.systems[event.system],
            status: 'degraded' as const,
          },
        }
      : state.systems;
    return withProcessedIntent({ ...state, events, systems }, intent.id);
  }

  if (action.kind === 'deliver-spare') {
    if (
      player.carrying !== 'spare' ||
      event.status !== 'diagnosed' ||
      !event.requiresSpare ||
      event.spareDelivered ||
      !isNear(player, event.system)
    ) {
      return withProcessedIntent(state, intent.id);
    }
    return withProcessedIntent(
      {
        ...state,
        resources: { ...state.resources, spares: Math.max(0, state.resources.spares - 1) },
        players: {
          ...state.players,
          [intent.playerId]: { ...player, carrying: null },
        },
        events: state.events.map((candidate) =>
          candidate.id === event.id ? { ...candidate, spareDelivered: true } : candidate,
        ),
      },
      intent.id,
    );
  }

  if (event.status !== 'diagnosed') return withProcessedIntent(state, intent.id);
  if (action.mode === 'repair') {
    if (action.station !== event.system || !isNear(player, event.system)) {
      return withProcessedIntent(state, intent.id);
    }
  } else if (
    !event.requiresAssistSystem ||
    action.station !== event.requiresAssistSystem ||
    !isNear(player, event.requiresAssistSystem)
  ) {
    return withProcessedIntent(state, intent.id);
  }

  return withProcessedIntent(
    {
      ...state,
      players: {
        ...state.players,
        [intent.playerId]: {
          ...player,
          repairing: {
            eventId: event.id,
            mode: action.mode,
            station: action.station,
          },
        },
      },
    },
    intent.id,
  );
}

export function canRetryMission(state: MissionState): boolean {
  return state.outcome === 'lost' && state.attempt < 3;
}
