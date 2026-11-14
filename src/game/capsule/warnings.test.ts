import { describe, expect, it } from 'vitest';
import { CAPSULE_DEMO_SCENARIOS } from './demoScenarios';
import { getCapsuleMarkers, selectPrimaryWarning } from './warnings';
import type { CapsuleWarning } from './types';

describe('capsule warnings', () => {
  it('covers every warning level and window effect in the demo cycle', () => {
    const pairs = new Set(
      CAPSULE_DEMO_SCENARIOS.map(
        (scenario) => `${scenario.level}:${scenario.effect}`,
      ),
    );

    expect(pairs.size).toBe(24);
    expect(CAPSULE_DEMO_SCENARIOS).toHaveLength(24);
  });

  it('selects the most severe active warning and derives attention markers', () => {
    const advisory: CapsuleWarning = {
      id: 'advisory',
      level: 'advisory',
      system: 'comms',
      effect: 'static',
      issuedAt: 200,
    };
    const critical: CapsuleWarning = {
      id: 'critical',
      level: 'critical',
      system: 'thermal',
      effect: 'thermal',
      issuedAt: 100,
    };
    const activeWarning = selectPrimaryWarning([advisory, critical]);

    expect(activeWarning?.id).toBe('critical');
    expect(
      getCapsuleMarkers({
        warning: activeWarning,
        resources: { oxygen: { value: 5, maximum: 100 } },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          anchor: 'capsule-warning',
          severity: 'critical',
        }),
        expect.objectContaining({
          anchor: 'capsule-resources',
          label: 'Oxygen low',
          severity: 'critical',
        }),
      ]),
    );
  });
});
