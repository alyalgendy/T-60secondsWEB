import { describe, expect, it } from 'vitest';
import type { DesignState, ResourceKey, RoleId, SystemId } from '../../shared/types';
import { tickMission } from '../../shared/sim';
import { createISSFlightState, getISSMissionResources } from './setup';

const cargo: Record<ResourceKey, number> = {
  fuel: 4,
  power: 0,
  oxygen: 6,
  water: 6,
  food: 6,
  shielding: 1,
  spares: 2,
};

const modules: Partial<Record<SystemId, string>> = {
  engine: 'engine-efficient',
  solar: 'solar-fixed',
  thermal: 'thermal-active',
  comms: 'comms-array',
  navigation: 'navigation-dual',
  shield: 'shield-layered',
};

function design(
  launchWindowId = 'iss-window-early',
  fuelCrates = 4,
): DesignState {
  return {
    stage: 'review',
    endsAt: 0,
    roleAssignments: {
      lead: 'p1',
      'power-thermal': 'p1',
      'propulsion-structures': 'p1',
      'comms-avionics': 'p1',
    } satisfies Record<RoleId, string>,
    objectiveIds: ['iss-observe', 'iss-life-science'],
    launchVehicleId: 'iss-lv-heavy',
    craftId: 'iss-craft-lab',
    modules,
    installedModules: modules,
    cargo: { ...cargo, fuel: fuelCrates },
    launchWindowId,
    votes: {},
    ready: ['p1'],
  };
}

describe('ISS flight setup', () => {
  it('starts with resources from the shared cargo design', () => {
    expect(getISSMissionResources(design())).toMatchObject({
      fuel: 40,
      oxygen: 60,
      water: 60,
      food: 60,
      spares: 2,
    });
  });

  it('carries launch-window trip time and fuel use into the mission clock', () => {
    const early = createISSFlightState('EARLY', design(), ['p1'], 1, 0);
    const economy = createISSFlightState(
      'ECONOMY',
      design('iss-window-economy', 2),
      ['p1'],
      1,
      0,
    );

    expect(early.missionDays).toBe(26);
    expect(economy.missionDays).toBe(36);
    expect(early.resources.fuel).toBe(40);
    expect(economy.resources.fuel).toBe(20);
    expect(early.fuelBurnMultiplier).toBeGreaterThan(
      economy.fuelBurnMultiplier ?? 0,
    );

    const halfway = tickMission(early, 120_000);
    const economyHalfway = tickMission(economy, 120_000);
    expect(halfway.progress).toBe(0.5);
    expect(halfway.resources.fuel).toBeLessThan(early.resources.fuel);
    expect(early.resources.fuel - halfway.resources.fuel).toBeGreaterThan(
      economy.resources.fuel - economyHalfway.resources.fuel,
    );
  });

  it('scales event count for cooperative crews while keeping risk design-based', () => {
    const solo = createISSFlightState('ROOM1', design(), ['p1'], 1, 0);
    const crewOfThree = createISSFlightState(
      'ROOM3',
      design(),
      ['p1', 'p2', 'p3'],
      1,
      0,
    );
    const crewOfFour = createISSFlightState(
      'ROOM4',
      design(),
      ['p1', 'p2', 'p3', 'p4'],
      1,
      0,
    );

    expect(solo.events).toHaveLength(1);
    expect(crewOfThree.events).toHaveLength(2);
    expect(crewOfFour.events).toHaveLength(3);
    expect(crewOfFour.risk).toBe(solo.risk);
    expect(crewOfFour.events[0]).not.toHaveProperty('responses');
  });

  it('can finish an ISS attempt after every scheduled event is resolved', () => {
    const initial = createISSFlightState('ROOM1', design(), ['p1'], 1, 0);
    const resolved = {
      ...initial,
      events: initial.events.map((event) => ({
        ...event,
        status: 'resolved' as const,
        resolvedAt: event.deadlineAt - 1000,
      })),
    };

    expect(tickMission(resolved, 240_000).outcome).toBe('won');
  });
});
