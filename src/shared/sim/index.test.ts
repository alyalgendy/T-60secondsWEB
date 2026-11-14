import { describe, expect, it } from 'vitest';
import {
  calculateDesignStats,
  calculateRisk,
  applyMissionIntent,
  canRetryMission,
  checkReadinessGates,
  createMissionState,
  drainResources,
  evaluateMissionOutcome,
  hashMissionSeed,
  scheduleEvents,
  tickMission,
  type DesignStats,
} from './index';
import type {
  MissionEvent,
  MissionIntent,
  MissionState,
  ResourceKey,
  SystemId,
  SubsystemOption,
} from '../types';
import { CABIN_STATIONS } from './index';
import { ISS_EVENTS } from '../../content/iss-v2';

const options: SubsystemOption[] = [
  {
    id: 'solar-small',
    system: 'solar',
    label: 'Small array',
    icon: 'solar',
    mass: 3,
    power: 4,
    cost: 10,
    risk: 0.2,
    reliability: 0.8,
  },
  {
    id: 'comms-backup',
    system: 'comms',
    label: 'Relay array',
    icon: 'comms',
    mass: 2,
    power: 3,
    cost: 12,
    risk: 0.1,
    reliability: 0.9,
    redundant: true,
  },
];

const emptyResources: Record<ResourceKey, number> = {
  fuel: 8,
  power: 10,
  oxygen: 10,
  water: 10,
  food: 10,
  shielding: 2,
  spares: 2,
};

const emptySystems = (): MissionState['systems'] => ({
  engine: { health: 100, status: 'ok' },
  solar: { health: 100, status: 'ok' },
  thermal: { health: 100, status: 'ok' },
  comms: { health: 100, status: 'ok' },
  navigation: { health: 100, status: 'ok' },
  shield: { health: 100, status: 'ok' },
});

const missionResources = (): Record<ResourceKey, number> => ({
  fuel: 80,
  power: 80,
  oxygen: 80,
  water: 80,
  food: 80,
  shielding: 20,
  spares: 2,
});

function event(
  status: MissionEvent['status'] = 'pending',
  patch: Partial<MissionEvent> = {},
): MissionEvent {
  return {
    id: 'comms-1',
    system: 'comms',
    level: 'warning',
    startsAt: 0,
    deadlineAt: 60_000,
    status,
    windowEffect: 'static',
    repairRequired: 5,
    ...patch,
  };
}

function runningState(
  events: MissionEvent[] = [],
  playerIds = ['p1', 'p2'],
): MissionState {
  return {
    attempt: 1,
    startedAt: 0,
    lastTickAt: 0,
    progress: 0,
    systems: emptySystems(),
    resources: missionResources(),
    resourceMax: missionResources(),
    players: Object.fromEntries(
      playerIds.map((id) => [id, { x: 50, y: 80, carrying: null }]),
    ),
    events,
    outcome: 'running',
  };
}

function intent(
  id: string,
  playerId: string,
  action: MissionIntent['action'],
) {
  return { id, playerId, attempt: 1, createdAt: 0, action };
}

describe('pure mission simulation', () => {
  it('aggregates selected subsystem trade values and evaluates launch gates', () => {
    const modules: Partial<Record<SystemId, string>> = {
      solar: 'solar-small',
      comms: 'comms-backup',
    };
    const stats = calculateDesignStats(modules, options);

    expect(stats).toMatchObject({
      mass: 5,
      power: 7,
      cost: 22,
      redundantSystems: 1,
    });
    expect(stats.risk).toBeCloseTo(0.15);
    expect(stats.reliability).toBeCloseTo(0.85);
    expect(
      checkReadinessGates(stats, {
        maxMass: 5,
        maxPower: 8,
        maxCost: 22,
        minimumReliability: 0.8,
        minimumRedundantSystems: 1,
      }).every((gate) => gate.passed),
    ).toBe(true);
  });

  it('adds rushed-design risk within the supported range', () => {
    const stats: DesignStats = {
      mass: 0,
      power: 0,
      cost: 0,
      risk: 0.9,
      reliability: 0.9,
      redundantSystems: 0,
    };

    expect(calculateRisk(stats, true)).toBe(1);
    expect(calculateRisk({ ...stats, risk: -1 })).toBe(0);
  });

  it('schedules reproducible events and drains resources without negatives', () => {
    const templates = [
      { id: 'flare', system: 'solar' as const, level: 'warning' as const, windowEffect: 'flare' as const },
      { id: 'static', system: 'comms' as const, level: 'caution' as const, windowEffect: 'static' as const },
      { id: 'thermal', system: 'thermal' as const, level: 'critical' as const, windowEffect: 'thermal' as const },
    ];
    expect(scheduleEvents(123, 0.8, templates, 240, 100)).toEqual(
      scheduleEvents(123, 0.8, templates, 240, 100),
    );
    expect(drainResources(emptyResources, { oxygen: 2, power: 1 }, 6)).toMatchObject({
      oxygen: 0,
      power: 4,
      food: 10,
    });
  });

  it('overlaps high-risk ISS events without exposing response answers in state', () => {
    const scheduled = scheduleEvents(123, 1, ISS_EVENTS, 240_000, 10_000);
    expect(scheduled).toHaveLength(3);
    expect(scheduled[0]?.deadlineAt).toBeGreaterThan(scheduled[1]?.startsAt ?? Infinity);
    expect(scheduled[0]).not.toHaveProperty('responses');
    expect(scheduled[0]).not.toHaveProperty('tutorialStepId');
  });

  it('reports loss before victory and wins only after all events resolve', () => {
    const base = {
      progress: 1,
      systems: emptySystems(),
      resources: { ...emptyResources },
      events: [
        {
          id: 'event-1',
          system: 'comms' as const,
          level: 'caution' as const,
          startsAt: 10,
          deadlineAt: 70,
          status: 'resolved' as const,
          windowEffect: 'static' as const,
        },
      ],
    };

    expect(evaluateMissionOutcome(base, 100)).toEqual({ outcome: 'won' });
    expect(
      evaluateMissionOutcome({
        ...base,
        resources: { ...emptyResources, oxygen: 0 },
      }, 100),
    ).toEqual({ outcome: 'lost', lostReason: 'oxygen depleted' });
    expect(
      evaluateMissionOutcome({
        ...base,
        events: [{ ...base.events[0]!, status: 'pending' }],
      }, 20),
    ).toEqual({ outcome: 'running' });
    expect(
      evaluateMissionOutcome({
        ...base,
        events: [{ ...base.events[0]!, status: 'pending' }],
      }, 70),
    ).toEqual({ outcome: 'lost', lostReason: 'comms event unresolved' });
  });

  it('creates a reproducible mission seed and a win after the full clock', () => {
    const seed = hashMissionSeed('ABCDE', 'iss', 2);
    expect(seed).toBe(hashMissionSeed('abcde', 'iss', 2));
    expect(seed).not.toBe(hashMissionSeed('ABCDE', 'iss', 3));
    const initial = createMissionState({
      seed,
      risk: 0,
      templates: [],
      now: 10_000,
      durationSeconds: 240,
      attempt: 1,
      playerIds: ['p1'],
      resources: missionResources(),
    });

    expect(tickMission(initial, 250_000).outcome).toBe('won');
  });

  it('fails when an event deadline expires unresolved', () => {
    const state = runningState([event()]);
    const result = tickMission(state, 60_000);
    expect(result.events[0]?.status).toBe('failed');
    expect(result).toMatchObject({
      outcome: 'lost',
      lostReason: 'comms event unresolved',
    });
  });

  it('fails when a critical resource reaches zero', () => {
    const state = runningState();
    const depleted = {
      ...state,
      resources: { ...state.resources, oxygen: 0 },
    };
    expect(tickMission(depleted, 0)).toMatchObject({
      outcome: 'lost',
      lostReason: 'oxygen depleted',
    });
  });

  it('drains a poorly allocated mission until a critical resource is depleted', () => {
    const resources = { ...missionResources(), oxygen: 10 };
    const state = {
      ...runningState(),
      resources,
      resourceMax: resources,
    };
    expect(tickMission(state, 125_000)).toMatchObject({
      outcome: 'lost',
      lostReason: 'oxygen depleted',
    });
  });

  it('fails when a system health reaches zero', () => {
    const state = runningState();
    const damaged = {
      ...state,
      systems: {
        ...state.systems,
        thermal: { health: 0, status: 'failed' as const },
      },
    };
    expect(tickMission(damaged, 0)).toMatchObject({
      outcome: 'lost',
      lostReason: 'thermal system failed',
    });
  });

  it('penalizes a wrong diagnosis and shortens the event deadline', () => {
    const state = runningState([event()]);
    const next = applyMissionIntent(
      state,
      intent('wrong', 'p1', { kind: 'diagnose', eventId: 'comms-1', responseId: 'bad' }),
      { responsesByEvent: { 'comms-1': [{ id: 'bad', correct: false }] } },
      10_000,
    );
    expect(next.systems.comms).toMatchObject({ health: 80, status: 'degraded' });
    expect(next.events[0]).toMatchObject({
      wrongDiagnoses: 1,
      deadlineAt: 45_000,
      status: 'pending',
    });
  });

  it('can destroy a system through repeated wrong diagnoses', () => {
    let state = runningState([event()]);
    for (let index = 0; index < 5; index += 1) {
      state = applyMissionIntent(
        state,
        intent(`wrong-${index}`, 'p1', {
          kind: 'diagnose',
          eventId: 'comms-1',
          responseId: 'bad',
        }),
        { responsesByEvent: { 'comms-1': [{ id: 'bad', correct: false }] } },
        1_000,
      );
    }
    expect(state.systems.comms).toMatchObject({ health: 0, status: 'failed' });
    expect(state).toMatchObject({
      outcome: 'lost',
      lostReason: 'comms system failed',
    });
  });

  it('saves an event in degraded mode only with the required backup', () => {
    const state = runningState([
      event('pending', { id: 'thermal-1', system: 'thermal' }),
    ]);
    const next = applyMissionIntent(
      state,
      intent('backup', 'p1', {
        kind: 'diagnose',
        eventId: 'thermal-1',
        responseId: 'switch-backup',
      }),
      {
        responsesByEvent: {
          'thermal-1': [
            {
              id: 'switch-backup',
              correct: true,
              requiresRedundancy: 'thermal',
              degradedSave: true,
            },
          ],
        },
        redundantSystems: ['thermal'],
      },
      1000,
    );
    expect(next.events[0]).toMatchObject({
      status: 'resolved',
      diagnosedBy: 'p1',
    });
    expect(next.systems.thermal.status).toBe('degraded');
  });

  it('never writes undefined fields when diagnosing (Firebase rejects them)', () => {
    const state = runningState([event('pending')]);
    const next = applyMissionIntent(
      state,
      intent('diag', 'p1', {
        kind: 'diagnose',
        eventId: 'comms-1',
        responseId: 'reroute',
      }),
      { responsesByEvent: { 'comms-1': [{ id: 'reroute', correct: true }] } },
      1000,
    );
    expect(next.events[0].status).toBe('diagnosed');
    const undefinedKeys = Object.entries(next.events[0])
      .filter(([, value]) => value === undefined)
      .map(([key]) => key);
    expect(undefinedKeys).toEqual([]);
  });

  it('requires a delivered spare and a second player at the assist station', () => {
    const state = runningState([
      event('diagnosed', {
        requiresSpare: true,
        requiresAssistSystem: 'navigation',
        diagnosedBy: 'p1',
      }),
    ]);
    const p1AtStorage = {
      ...state,
      players: {
        ...state.players,
        p1: { x: CABIN_STATIONS.storage.x, y: CABIN_STATIONS.storage.y, carrying: null },
        p2: {
          x: CABIN_STATIONS.navigation.x,
          y: CABIN_STATIONS.navigation.y,
          carrying: null,
        },
      },
    };
    const pickedUp = applyMissionIntent(
      p1AtStorage,
      intent('pick', 'p1', { kind: 'pickup-spare' }),
      { responsesByEvent: {} },
      0,
    );
    const atStation = tickMission(pickedUp, 0, {
      p1: CABIN_STATIONS.comms,
      p2: CABIN_STATIONS.navigation,
    });
    const delivered = applyMissionIntent(
      atStation,
      intent('deliver', 'p1', { kind: 'deliver-spare', eventId: 'comms-1' }),
      { responsesByEvent: {} },
      0,
    );
    const repairing = applyMissionIntent(
      delivered,
      intent('repair', 'p1', {
        kind: 'repair-start',
        eventId: 'comms-1',
        mode: 'repair',
        station: 'comms',
      }),
      { responsesByEvent: {} },
      0,
    );
    const assisting = applyMissionIntent(
      repairing,
      intent('assist', 'p2', {
        kind: 'repair-start',
        eventId: 'comms-1',
        mode: 'assist',
        station: 'navigation',
      }),
      { responsesByEvent: {} },
      0,
    );

    expect(assisting.resources.spares).toBe(1);
    expect(tickMission(assisting, 5_000).events[0]).toMatchObject({
      status: 'resolved',
      repairedBy: ['p1', 'p2'],
    });
  });

  it('allows two retries after a failed attempt', () => {
    expect(canRetryMission({ ...runningState(), outcome: 'lost', attempt: 1 })).toBe(true);
    expect(canRetryMission({ ...runningState(), outcome: 'lost', attempt: 2 })).toBe(true);
    expect(canRetryMission({ ...runningState(), outcome: 'lost', attempt: 3 })).toBe(false);
  });
});
