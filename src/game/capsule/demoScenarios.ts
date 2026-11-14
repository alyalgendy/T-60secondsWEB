import { SYSTEMS } from './demoSystems';
import { WARNING_LEVELS, WINDOW_EFFECTS, type WarningInput } from './types';

export const CAPSULE_DEMO_SCENARIOS: WarningInput[] =
  WARNING_LEVELS.flatMap((level) =>
    WINDOW_EFFECTS.map((effect) => ({
      level,
      effect,
      system: SYSTEMS[effect],
      countdownSeconds: 60,
    })),
  );
