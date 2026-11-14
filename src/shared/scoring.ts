import { clamp, emptyResources, RESOURCE_KEYS } from './constants';
import type {
  MissionConfig,
  MissionId,
  PlanDraft,
  PlanScore,
  ResourceKey,
} from './types';

/** Stable UI order for resource rows across planning / decision screens. */
export const RESOURCE_ORDER: readonly ResourceKey[] = RESOURCE_KEYS;

/** Short display for reserve coverage percentages and loadout points. */
export function formatUnits(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Convert an internal planning value to its displayed share of the mission cap. */
export function toReservePercent(value: number, cap: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(cap) || cap <= 0) return 0;
  return Math.round(clamp((value / cap) * 100, 0, 100));
}

/**
 * The game-balance loadout budget for a plan. When a craft is selected, its
 * capacity is the budget. Missions with no craft step use MissionConfig.massBudget.
 */
export function getMassBudget(
  config: MissionConfig,
  craftId: string | null,
): number {
  const craft = config.crafts.find((option) => option.id === craftId);
  return craft ? craft.massCapacity : config.massBudget;
}

export function getMassUsed(
  config: MissionConfig,
  resources: Record<ResourceKey, number>,
): number {
  return config.needs.reduce((total, need) => {
    const value = clamp(resources[need.key] ?? 0, 0, need.max);
    return total + value * need.massPerUnit;
  }, 0);
}

/**
 * Reasons the Launch button must stay disabled. Plain English, because the UI
 * shows these strings directly.
 */
export function getLaunchBlockers(
  config: MissionConfig,
  draft: Pick<PlanDraft, 'craftId' | 'resources'>,
): string[] {
  const blockers: string[] = [];

  if (config.crafts.length > 1 && !draft.craftId) {
    blockers.push('Choose a craft first.');
  }

  if (
    draft.craftId &&
    !config.crafts.some((craft) => craft.id === draft.craftId)
  ) {
    blockers.push('The selected craft is not available for this mission.');
  }

  const massBudget = getMassBudget(config, draft.craftId);
  const massUsed = getMassUsed(config, draft.resources);
  if (massUsed > massBudget) {
    blockers.push(
      `Loadout budget exceeded by ${Math.ceil(massUsed - massBudget)} points.`,
    );
  }

  for (const need of config.needs) {
    const value = draft.resources[need.key] ?? 0;
    if (value < need.min) {
      const minimum = toReservePercent(need.min, need.max);
      blockers.push(
        `${need.label} is below its minimum of ${minimum}${need.unit}.`,
      );
    }
  }

  return blockers;
}

/**
 * M1's scoring rules:
 * - start at 100
 * - lose points for every resource below its ideal (proportional)
 * - lose points heavily for every resource below its minimum
 * - lose points for exceeding the loadout budget
 * - small bonus for finishing with a 5-15% loadout margin
 */
export function scorePlan(
  config: MissionConfig,
  draft: Pick<PlanDraft, 'craftId' | 'resources'>,
): PlanScore {
  let score = 100;
  const problems: string[] = [];

  for (const need of config.needs) {
    const value = clamp(draft.resources[need.key] ?? 0, 0, need.max);

    if (value < need.min) {
      const span = Math.max(1, need.min);
      const shortfall = (need.min - value) / span;
      const shownValue = toReservePercent(value, need.max);
      const shownMinimum = toReservePercent(need.min, need.max);
      score -= 35 + 25 * shortfall;
      problems.push(
        `${need.label} is below the minimum (${shownValue}${need.unit} of ${shownMinimum}${need.unit}). The mission cannot launch.`,
      );
    } else if (value < need.ideal) {
      const span = Math.max(1, need.ideal - need.min);
      const shortfall = (need.ideal - value) / span;
      const shownValue = toReservePercent(value, need.max);
      const shownIdeal = toReservePercent(need.ideal, need.max);
      score -= 12 * shortfall;
      problems.push(
        `${need.label} is below the ideal level (${shownValue}${need.unit} of ${shownIdeal}${need.unit}).`,
      );
    }
  }

  const massBudget = getMassBudget(config, draft.craftId);
  const massUsed = getMassUsed(config, draft.resources);

  if (massUsed > massBudget) {
    const over = (massUsed - massBudget) / Math.max(1, massBudget);
    score -= 30 + 40 * Math.min(1, over);
    problems.push(
      `Loadout budget exceeded by ${Math.ceil(massUsed - massBudget)} points.`,
    );
  } else {
    const margin = (massBudget - massUsed) / Math.max(1, massBudget);
    if (margin >= 0.05 && margin <= 0.15) {
      score += 3;
    }
  }

  if (massUsed === 0) {
    problems.push('No resources allocated yet.');
  }

  if (config.crafts.length > 1 && !draft.craftId) {
    problems.push('No craft selected yet.');
  }

  return {
    score: Math.round(clamp(score, 0, 100)),
    massUsed: Math.round(massUsed * 10) / 10,
    massBudget,
    problems,
  };
}

/** Baseline draft used when a room's draft is first created. */
export function createInitialDraft(config: MissionConfig): PlanDraft {
  const resources = emptyResources();
  for (const need of config.needs) {
    resources[need.key] = need.min;
  }

  return {
    craftId: config.crafts.length === 1 ? config.crafts[0]?.id ?? null : null,
    resources,
    readyPlayerIds: [],
    lastEditedBy: null,
    updatedAt: Date.now(),
  };
}

export const MISSION_ORDER: readonly MissionId[] = ['iss', 'moon', 'mars'];
