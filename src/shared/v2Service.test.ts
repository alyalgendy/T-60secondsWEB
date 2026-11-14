import { describe, expect, it } from 'vitest';
import {
  enqueueMissionIntent,
  removeMissionIntent,
  startMission,
  subscribeDesign,
  subscribeMissionIntents,
  subscribeMissionPositions,
  updateDesign,
  updateMission,
  writeDesign,
  writeMissionPosition,
} from './v2Service';
import type { DesignState, MissionState, ResourceKey, SystemId } from './types';

function missionState(): MissionState {
  const resources: Record<ResourceKey, number> = {
    fuel: 20,
    power: 20,
    oxygen: 20,
    water: 20,
    food: 20,
    shielding: 10,
    spares: 1,
  };
  const systems = Object.fromEntries(
    (['engine', 'solar', 'thermal', 'comms', 'navigation', 'shield'] as const).map(
      (system: SystemId) => [system, { health: 100, status: 'ok' as const }],
    ),
  ) as MissionState['systems'];
  return {
    attempt: 1,
    startedAt: 1,
    progress: 0,
    systems,
    resources,
    players: { p1: { x: 50, y: 80, carrying: null } },
    events: [],
    outcome: 'running',
  };
}

describe('V2 mock state service', () => {
  it('publishes typed design state locally without Firebase', async () => {
    const design: DesignState = {
      stage: 'concept',
      endsAt: 300,
      objectiveIds: [],
      launchVehicleId: null,
      craftId: null,
      modules: {},
      cargo: {
        fuel: 0,
        power: 0,
        oxygen: 0,
        water: 0,
        food: 0,
        shielding: 0,
        spares: 0,
      },
      launchWindowId: null,
      votes: {},
      ready: [],
    };
    const received: (DesignState | null)[] = [];
    const unsubscribe = subscribeDesign(
      'MOCK',
      'iss',
      true,
      (state) => received.push(state),
    );

    await writeDesign('MOCK', 'iss', true, design);
    unsubscribe();

    expect(received).toEqual([null, design]);
  });

  it('applies separate mock edits against the latest shared design', async () => {
    const design: DesignState = {
      stage: 'concept',
      endsAt: 300,
      objectiveIds: [],
      launchVehicleId: null,
      craftId: null,
      modules: {},
      cargo: {
        fuel: 0,
        power: 0,
        oxygen: 0,
        water: 0,
        food: 0,
        shielding: 0,
        spares: 0,
      },
      launchWindowId: null,
      votes: {},
      ready: [],
    };
    await writeDesign('MERGE', 'iss', true, design);
    await updateDesign('MERGE', 'iss', true, (current) => ({
      ...design,
      ...(current ?? {}),
      votes: { ...(current?.votes ?? {}), objectives: { p1: 'a|b' } },
    }));
    const latest = await updateDesign('MERGE', 'iss', true, (current) => ({
      ...design,
      ...(current ?? {}),
      ready: ['p2'],
    }));

    expect(latest.votes.objectives).toEqual({ p1: 'a|b' });
    expect(latest.ready).toEqual(['p2']);
  });

  it('keeps mission state host-editable and transports client positions and intents', async () => {
    const state = missionState();
    let receivedIntentIds: string[] = [];
    const receivedPositions: Record<string, { x: number; y: number }>[] = [];
    const stopIntents = subscribeMissionIntents(
      'MISSION',
      'iss',
      true,
      (intents) => {
        receivedIntentIds = intents.map((intent) => intent.id);
      },
    );
    const stopPositions = subscribeMissionPositions(
      'MISSION',
      true,
      (positions) => receivedPositions.push(positions),
    );

    await startMission('MISSION', 'iss', true, state);
    const updated = await updateMission('MISSION', 'iss', true, (current) => ({
      ...current,
      progress: 0.25,
    }));
    const intentId = await enqueueMissionIntent('MISSION', 'iss', true, {
      playerId: 'p1',
      attempt: 1,
      createdAt: 2,
      action: { kind: 'pickup-spare' },
    });
    await writeMissionPosition('MISSION', 'p1', true, { x: 23, y: 70 });

    expect(updated.progress).toBe(0.25);
    expect(receivedIntentIds).toContain(intentId);
    expect(receivedPositions.at(-1)?.p1).toEqual({ x: 23, y: 70 });

    await removeMissionIntent('MISSION', 'iss', true, intentId);
    stopIntents();
    stopPositions();
    expect(receivedIntentIds).not.toContain(intentId);
  });
});
