/**
 * Mission planning domain — pure and framework-free (no React, Firebase or DOM).
 *
 * Every mission scene (ISS, Moon, Mars) shares these types and helpers. Resource
 * values are reserve-cap coverage percentages; loadout capacity and cost are game
 * balance points, not spacecraft mass.
 */

export type MissionId = "iss" | "moon" | "mars";

export type ResourceKey =
  | "fuel"
  | "power"
  | "oxygen"
  | "water"
  | "food"
  | "shielding"
  | "spares";

export type ResourceValues = Record<ResourceKey, number>;

export interface Source {
  title: string;
  url: string;
}

export interface Fact {
  text: string;
  source: Source;
}

export interface ResourceNeed {
  key: ResourceKey;
  label: string;
  /** Display unit for the reserve coverage percentage. */
  unit: string;
  /** Below this percentage the mission cannot launch. */
  min: number;
  /** At or above this percentage the resource is safe. */
  ideal: number;
  /** Slider maximum percentage. */
  max: number;
  /** Game loadout points spent per percentage point carried. */
  massPerUnit: number;
  /** One-line "why it matters". */
  why: string;
}

export type CraftRisk = "low" | "medium" | "high";

export interface CraftOption {
  id: string;
  name: string;
  description: string;
  /** Game-balance loadout capacity; not a real vehicle mass. */
  massCapacity: number;
  crewCapacity: number;
  pros: string[];
  cons: string[];
  source?: Source;
  /** Game-balance only. Real vehicles do not have a single "risk score". */
  risk?: CraftRisk;
  /** Game-balance cost, shown to the crew. Not a real price. */
  cost?: number;
}

export interface MissionConfig {
  id: MissionId;
  title: string;
  destination: string;
  /** One sentence. */
  goal: string;
  durationDays: number;
  /** Fallback game-balance loadout budget when no craft is selected yet. */
  massBudget: number;
  needs: ResourceNeed[];
  crafts: CraftOption[];
  facts: Fact[];
}

export interface PlanDraft {
  craftId: string | null;
  resources: ResourceValues;
  readyPlayerIds: string[];
  lastEditedBy: string | null;
  updatedAt: number;
}

export interface MissionPlan {
  missionId: MissionId;
  craftId: string | null;
  resources: ResourceValues;
  massUsed: number;
  massBudget: number;
  score: number;
  lockedAt: number;
}

export interface PlanningPlayer {
  id: string;
  name: string;
  color: string;
  /** 0-3, used for turn order later in the mission. */
  joinOrder: number;
  isHost: boolean;
  connected: boolean;
}

export interface PlanningSceneProps {
  roomCode: string;
  me: PlanningPlayer;
  players: PlanningPlayer[];
  missionId: MissionId;
  draft: PlanDraft;
  updateDraft: (
    patch: Partial<Pick<PlanDraft, "craftId" | "resources">>,
  ) => Promise<void>;
  toggleReady: () => Promise<void>;
  launch: (plan: MissionPlan) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export type CoverageStatus = "below-min" | "tight" | "safe";

export interface ResourceCoverage {
  key: ResourceKey;
  label: string;
  unit: string;
  value: number;
  min: number;
  ideal: number;
  max: number;
  status: CoverageStatus;
  /** 0-1 progress from min to ideal. Used for bar fills. */
  ratio: number;
}

export interface PlanScore {
  score: number;
  massUsed: number;
  massBudget: number;
  /** Player-facing reasons the plan is not launchable. Empty when it is. */
  problems: string[];
  coverage: ResourceCoverage[];
}

export interface LaunchCheck {
  ok: boolean;
  reasons: string[];
}

export const EMPTY_RESOURCES: ResourceValues = {
  fuel: 0,
  power: 0,
  oxygen: 0,
  water: 0,
  food: 0,
  shielding: 0,
  spares: 0,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getCraft(
  config: MissionConfig,
  craftId: string | null,
): CraftOption | null {
  if (!craftId) return null;
  return config.crafts.find((craft) => craft.id === craftId) ?? null;
}

export function massBudgetFor(
  config: MissionConfig,
  craftId: string | null,
): number {
  return getCraft(config, craftId)?.massCapacity ?? config.massBudget;
}

export function massUsedFor(
  config: MissionConfig,
  resources: ResourceValues,
): number {
  return Math.round(
    config.needs.reduce(
      (total, need) => total + (resources[need.key] ?? 0) * need.massPerUnit,
      0,
    ),
  );
}

export function coverageFor(
  config: MissionConfig,
  resources: ResourceValues,
): ResourceCoverage[] {
  return config.needs.map((need) => {
    const value = resources[need.key] ?? 0;
    const span = Math.max(0, need.ideal - need.min);
    const ratio = span === 0 ? (value >= need.min ? 1 : 0) : clamp((value - need.min) / span, 0, 1);
    const status: CoverageStatus =
      value < need.min ? "below-min" : value < need.ideal ? "tight" : "safe";

    return {
      key: need.key,
      label: need.label,
      unit: need.unit,
      value,
      min: need.min,
      ideal: need.ideal,
      max: need.max,
      status,
      ratio,
    };
  });
}

const RISK_MODIFIER: Record<CraftRisk, number> = {
  low: 3,
  medium: 0,
  high: -4,
};

/**
 * Plan score, 0-100. Coverage is the bulk of it; overspending the loadout budget
 * and choosing a higher-risk lander both cost points.
 */
export function scorePlan(
  config: MissionConfig,
  draft: Pick<PlanDraft, "craftId" | "resources">,
): PlanScore {
  const coverage = coverageFor(config, draft.resources);
  const massUsed = massUsedFor(config, draft.resources);
  const massBudget = massBudgetFor(config, draft.craftId);
  const craft = getCraft(config, draft.craftId);

  const problems: string[] = [];
  if (!craft) problems.push("Choose a lander first.");

  const coverageScore =
    coverage.reduce((total, item) => {
      if (item.status === "below-min") return total;
      if (item.status === "safe") return total + 1;
      return total + 0.4 + 0.6 * item.ratio;
    }, 0) / Math.max(1, coverage.length);

  let score = coverageScore * 100;
  score += RISK_MODIFIER[craft?.risk ?? "medium"];

  if (massUsed > massBudget) {
    score -= 30;
    problems.push(
      `Loadout is ${massUsed} / ${massBudget} points — over budget by ${massUsed - massBudget} points.`,
    );
  }

  for (const item of coverage) {
    if (item.status === "below-min") {
      const valuePercent = Math.round((item.value / Math.max(1, item.max)) * 100);
      const minPercent = Math.round((item.min / Math.max(1, item.max)) * 100);
      problems.push(
        `${item.label} is below minimum (${valuePercent}${item.unit} / ${minPercent}${item.unit}).`,
      );
    }
  }

  return {
    score: clamp(Math.round(score), 0, 100),
    massUsed,
    massBudget,
    problems,
    coverage,
  };
}

/** Launch gate: craft chosen, loadout within budget, every reserve at its minimum. */
export function checkLaunch(
  config: MissionConfig,
  draft: Pick<PlanDraft, "craftId" | "resources">,
): LaunchCheck {
  const score = scorePlan(config, draft);
  return { ok: score.problems.length === 0, reasons: score.problems };
}

export function planFromDraft(
  config: MissionConfig,
  draft: Pick<PlanDraft, "craftId" | "resources">,
  now = Date.now(),
): MissionPlan {
  const score = scorePlan(config, draft);
  return {
    missionId: config.id,
    craftId: draft.craftId,
    resources: { ...draft.resources },
    massUsed: score.massUsed,
    massBudget: score.massBudget,
    score: score.score,
    lockedAt: now,
  };
}
