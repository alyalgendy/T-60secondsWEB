import { describe, expect, it } from 'vitest';
import type { DesignState, Player } from '../../shared/types';
import {
  canLaunch,
  createInitialDesignState,
  getCargoCells,
  getReadinessGates,
} from './designLogic';
import { assignMissionRoles, rolesForPlayer } from './roles';
import { resolveObjectivePair, resolveSingleChoice } from './voting';

function players(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${index + 1}`,
    name: `Player ${index + 1}`,
    color: '#ffffff',
    joinOrder: index,
    isHost: index === 0,
    connected: true,
  }));
}

function reviewDesign(): DesignState {
  return {
    ...createInitialDesignState(0),
    stage: 'review',
    objectiveIds: ['iss-observe', 'iss-life-science'],
    launchVehicleId: 'iss-lv-heavy',
    craftId: 'iss-craft-lab',
    modules: {
      engine: 'engine-chemical',
      solar: 'solar-fixed',
      thermal: 'thermal-active',
      comms: 'comms-array',
      navigation: 'navigation-dual',
      shield: 'shield-light',
    },
    installedModules: {
      engine: 'engine-chemical',
      solar: 'solar-fixed',
      thermal: 'thermal-active',
      comms: 'comms-array',
      navigation: 'navigation-dual',
      shield: 'shield-light',
    },
    cargo: {
      fuel: 3,
      power: 0,
      oxygen: 5,
      water: 5,
      food: 5,
      shielding: 0,
      spares: 1,
    },
    launchWindowId: 'iss-window-transfer',
  };
}

describe('ISS design support', () => {
  it('round-robins all roles across one through four connected players', () => {
    for (let count = 1; count <= 4; count += 1) {
      const crew = players(count);
      const assignments = assignMissionRoles(crew);
      expect(Object.keys(assignments)).toHaveLength(4);
      expect(Object.values(assignments)).toEqual(
        Array.from({ length: 4 }, (_, index) => crew[index % count]?.id),
      );
      for (const player of crew) {
        expect(rolesForPlayer(player.id, assignments).length).toBeGreaterThan(0);
      }
    }
  });

  it('uses the Mission Lead to break a single-choice tie', () => {
    expect(
      resolveSingleChoice(
        { 'player-1': 'heavy', 'player-2': 'compact' },
        ['player-1', 'player-2'],
        ['compact', 'heavy'],
        'player-1',
      ),
    ).toBe('heavy');
  });

  it('selects two tied objectives by the Lead ballot', () => {
    expect(
      resolveObjectivePair(
        {
          'player-1': 'iss-observe|iss-orbital-assembly',
          'player-2': 'iss-observe|iss-comms-test',
          'player-3': 'iss-life-science|iss-orbital-assembly',
          'player-4': 'iss-life-science|iss-comms-test',
        },
        ['player-1', 'player-2', 'player-3', 'player-4'],
        [
          'iss-observe',
          'iss-life-science',
          'iss-comms-test',
          'iss-orbital-assembly',
        ],
        'player-1',
      ),
    ).toEqual(['iss-observe', 'iss-orbital-assembly']);
  });

  it('allows stackable cargo and clears a balanced ISS readiness review', () => {
    expect(
      getCargoCells({
        fuel: 4,
        power: 0,
        oxygen: 5,
        water: 5,
        food: 5,
        shielding: 0,
        spares: 1,
      }),
    ).toBe(9);
    const design = reviewDesign();
    expect(getReadinessGates(design).every((gate) => gate.status !== 'red')).toBe(true);
    expect(canLaunch(design)).toBe(true);
  });
});
