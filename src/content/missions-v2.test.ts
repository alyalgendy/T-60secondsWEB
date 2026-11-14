import { describe, expect, it } from 'vitest';
import { MISSION_V2_CONTENT } from './missions-v2';
import { getCargoCells, getReadinessGates } from '../game/design/designLogic';
import { createMissionFlightState } from '../game/mission/setup';
import { DESIGN_SYSTEMS } from '../game/design/designLogic';
import { TUTORIAL_STEPS } from '../lib/tutorial';
import type { DesignState, MissionId, ResourceKey, SystemId } from '../shared/types';
import { hashMissionSeed, tickMission } from '../shared/sim';

function readyDesign(missionId: MissionId, rushed = false): DesignState {
  const content = MISSION_V2_CONTENT[missionId];
  const objectiveIds = content.objectives.slice(0, 2).map((objective) => objective.id);
  const window = content.launchWindows[1] ?? content.launchWindows[0];
  const missionDays =
    Math.max(
      ...objectiveIds.map(
        (id) => content.objectives.find((objective) => objective.id === id)?.durationDays ?? 0,
      ),
    ) + (window?.tripDays ?? 0);
  const lifeSupportCrates =
    Math.ceil(missionDays / content.cargoRules.daysPerLifeSupportCrate) + 1;
  const modules: Partial<Record<SystemId, string>> = {};
  for (const system of DESIGN_SYSTEMS) {
    const option = content.subsystemOptions.find(
      (candidate) => candidate.system === system && candidate.redundant,
    ) ?? content.subsystemOptions.find((candidate) => candidate.system === system);
    if (option) modules[system] = option.id;
  }
  const cargo: Record<ResourceKey, number> = {
    fuel: window?.fuelCrates ?? 0,
    power: 0,
    oxygen: lifeSupportCrates,
    water: lifeSupportCrates,
    food: lifeSupportCrates,
    shielding: 0,
    spares: 2,
  };
  expect(getCargoCells(cargo, content)).toBeLessThanOrEqual(content.cargoRules.gridCells);
  return {
    stage: 'review',
    endsAt: 0,
    objectiveIds,
    launchVehicleId: content.launchVehicles[1]?.id ?? null,
    craftId: content.spacecraft[1]?.id ?? content.spacecraft[0]?.id ?? null,
    modules,
    installedModules: modules,
    cargo,
    launchWindowId: window?.id ?? null,
    votes: {},
    ready: ['pilot'],
    ...(rushed ? { rushed: true } : {}),
  };
}

describe('Moon and Mars campaign content', () => {
  it('provides complete sourced content, markers, and tutorials', () => {
    for (const missionId of ['moon', 'mars'] as const) {
      const content = MISSION_V2_CONTENT[missionId];
      expect(content.objectives).toHaveLength(4);
      expect(content.launchVehicles).toHaveLength(2);
      expect(content.spacecraft).toHaveLength(2);
      expect(content.launchWindows.length).toBeGreaterThanOrEqual(3);
      expect(content.events.length).toBeGreaterThanOrEqual(3);
      expect(content.minimumEventCount).toBeGreaterThanOrEqual(3);

      for (const system of DESIGN_SYSTEMS) {
        expect(content.subsystemOptions.filter((option) => option.system === system).length)
          .toBeGreaterThanOrEqual(2);
      }
      for (const event of content.events) {
        expect(event.responses).toHaveLength(3);
        expect(TUTORIAL_STEPS.some((step) => step.id === event.tutorialStepId)).toBe(true);
        const research = content.eventResearch[event.id];
        expect(research?.whatReallyHappened).toHaveLength(2);
        expect(research?.source.url).toMatch(/^https:\/\//);
      }
      expect(content.analogMissions.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('lets a well-resourced design pass every Moon and Mars readiness gate', () => {
    for (const missionId of ['moon', 'mars'] as const) {
      const design = readyDesign(missionId);
      expect(getReadinessGates(design, missionId).every((gate) => gate.status !== 'red'))
        .toBe(true);
    }
  });

  it('supports crews of one through four and makes rushed plans riskier', () => {
    for (const missionId of ['iss', 'moon', 'mars'] as const) {
      for (let crewCount = 1; crewCount <= 4; crewCount += 1) {
        const crewIds = Array.from({ length: crewCount }, (_, index) => `pilot-${index}`);
        const good = createMissionFlightState(
          `ROOM${crewCount}`,
          missionId,
          readyDesign(missionId),
          crewIds,
          1,
          0,
        );
        expect(Object.keys(good.players)).toHaveLength(crewCount);
        expect(good.events.length).toBeGreaterThanOrEqual(
          MISSION_V2_CONTENT[missionId].minimumEventCount,
        );
      }
    }

    for (const missionId of ['moon', 'mars'] as const) {
      const goodDesign = readyDesign(missionId);
      const rushedDesign = readyDesign(missionId, true);
      const good = createMissionFlightState('BALANCE', missionId, goodDesign, ['pilot'], 1, 0);
      const rushed = createMissionFlightState('BALANCE', missionId, rushedDesign, ['pilot'], 1, 0);
      expect(rushed.events.length).toBeGreaterThan(good.events.length);
      expect(rushed.resourceDrainMultiplier).toBeGreaterThan(good.resourceDrainMultiplier ?? 0);
    }
  });

  it('lets a prepared team finish while a rushed design depletes fuel', () => {
    for (const missionId of ['moon', 'mars'] as const) {
      const finishEvents = (design: DesignState) => {
        const state = createMissionFlightState(
          'BALANCE',
          missionId,
          design,
          ['pilot'],
          1,
          0,
        );
        return {
          ...state,
          events: state.events.map((event) => ({
            ...event,
            status: 'resolved' as const,
            resolvedAt: event.deadlineAt - 1000,
          })),
        };
      };

      expect(tickMission(finishEvents(readyDesign(missionId)), 240_000).outcome)
        .toBe('won');
      const rushedOutcome = tickMission(
        finishEvents(readyDesign(missionId, true)),
        240_000,
      );
      expect(rushedOutcome.outcome).toBe('lost');
      expect(rushedOutcome.lostReason).toBe('fuel depleted');
    }
  });

  it('models a practiced crew winning 70–80% of attempts before retries', () => {
    const attempts = 1000;
    const perEventResolutionRate = 0.92;

    for (const missionId of ['moon', 'mars'] as const) {
      let wins = 0;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const roomCode = `PRACTICE${attempt}`;
        const state = createMissionFlightState(
          roomCode,
          missionId,
          readyDesign(missionId),
          ['pilot'],
          1,
          0,
        );
        let seed = hashMissionSeed(roomCode, `${missionId}-crew`, 1);
        const nextRandom = () => {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed / 0x100000000;
        };
        const events = state.events.map((event) =>
          nextRandom() < perEventResolutionRate
            ? { ...event, status: 'resolved' as const, resolvedAt: event.deadlineAt - 1000 }
            : event,
        );
        if (tickMission({ ...state, events }, 240_000).outcome === 'won') wins += 1;
      }

      const winRate = wins / attempts;
      expect(winRate).toBeGreaterThanOrEqual(0.7);
      expect(winRate).toBeLessThanOrEqual(0.8);
    }
  });
});
