import type { DecisionProblem, MissionId } from '../shared/types';
import issProblems from './problems.iss';
import moonProblems from './problems.moon';
import marsProblems from './problems.mars';

/**
 * Decision content is authored as a pool, not as a fixed three-step run.
 *
 * M1 should seed `DecisionState.problemIds` with
 * `incidentsForPlan(missionId, plan.score)` so that a plan with thin margins
 * triggers more incidents than a plan with wide margins.
 */

export type IncidentSeverity = 'caution' | 'warning' | 'critical';

export interface MissionIncident extends DecisionProblem {
  /** Mission Elapsed Time shown to the crew, for example "MET 03:12". */
  met: string;
  /** Minutes since mission start. Used for ordering and time jumps. */
  metMinutes: number;
  severity: IncidentSeverity;
  /** Where the crew is and what they were doing when the alarm hit. */
  phase: string;
  /** Short alarm line shown above the incident title. */
  alarm: string;
}

export interface MissionTimeline {
  startLabel: string;
  endLabel: string;
}

export interface PlanRisk {
  count: number;
  label: string;
  tone: 'ok' | 'warn' | 'danger';
  detail: string;
}

export const MISSION_TIMELINES: Record<MissionId, MissionTimeline> = {
  iss: { startLabel: 'Launch', endLabel: 'Return to Earth' },
  moon: { startLabel: 'Launch', endLabel: 'Return to Earth' },
  mars: { startLabel: 'Launch', endLabel: 'Return to Earth' },
};

export const INCIDENT_POOLS: Record<MissionId, MissionIncident[]> = {
  iss: issProblems,
  moon: moonProblems,
  mars: marsProblems,
};

/**
 * 0-100 plan score -> number of incidents during that mission.
 * Wide margins absorb faults; thin margins let more faults reach the crew.
 */
export function incidentCountForScore(score: number): number {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  if (safeScore >= 85) return 2;
  if (safeScore >= 65) return 3;
  if (safeScore >= 45) return 4;
  return 5;
}

export function planRiskFor(score: number): PlanRisk {
  const count = incidentCountForScore(score);
  if (count === 2) {
    return {
      count,
      label: 'Steady margins',
      tone: 'ok',
      detail: 'Wide margins absorb most faults before they reach the crew.',
    };
  }
  if (count === 3) {
    return {
      count,
      label: 'Workable margins',
      tone: 'warn',
      detail: 'Some slack remains, but faults can still stack up.',
    };
  }
  if (count === 4) {
    return {
      count,
      label: 'Thin margins',
      tone: 'warn',
      detail: 'Low reserves leave little room for error.',
    };
  }
  return {
    count,
    label: 'Critical margins',
    tone: 'danger',
    detail: 'Almost no margin remains; faults keep reaching the crew.',
  };
}

/** Sorted chronologically, with no duplicate events. */
export function incidentPoolFor(missionId: MissionId): MissionIncident[] {
  return [...(INCIDENT_POOLS[missionId] ?? [])].sort(
    (first, second) => first.metMinutes - second.metMinutes,
  );
}

/**
 * Picks a chronological spread from the mission pool. The first incident
 * always happens; extra incidents fill the gaps when the plan is weaker.
 */
export function incidentsForPlan(
  missionId: MissionId,
  planScore: number,
): MissionIncident[] {
  const pool = incidentPoolFor(missionId);
  const count = Math.min(incidentCountForScore(planScore), pool.length);
  if (count <= 0) return [];
  if (count >= pool.length) return pool;

  const picked = new Set<number>();
  for (let position = 0; position < count; position += 1) {
    const index =
      count === 1 ? 0 : Math.round((position * (pool.length - 1)) / (count - 1));
    picked.add(index);
  }

  return [...picked]
    .sort((first, second) => first - second)
    .map((index) => pool[index]!)
    .filter((incident): incident is MissionIncident => incident !== undefined);
}

export function findIncident(
  missionId: MissionId,
  incidentId: string,
): MissionIncident | undefined {
  return INCIDENT_POOLS[missionId]?.find((incident) => incident.id === incidentId);
}
