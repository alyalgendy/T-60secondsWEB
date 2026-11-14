import type { FlowStep, MissionId } from './types';

export const FLOW_STEPS: readonly FlowStep[] = [
  'lobby',
  'cutscene-intro',
  'cutscene-intro-to-iss',
  'cutscene-iss',
  'plan-iss',
  'decision-iss',
  'cutscene-iss-to-moon',
  'cutscene-moon',
  'plan-moon',
  'decision-moon',
  'cutscene-moon-to-mars',
  'cutscene-mars',
  'plan-mars',
  'decision-mars',
  'results',
] as const;

export const STEP_LABELS: Record<FlowStep, string> = {
  lobby: 'Lobby',
  'cutscene-intro': 'Mission briefing',
  'cutscene-intro-to-iss': 'Transit to ISS',
  'cutscene-iss': 'Arriving at ISS',
  'plan-iss': 'Mission planning · ISS',
  'decision-iss': 'Mission simulation · ISS',
  'cutscene-iss-to-moon': 'Transit to the Moon',
  'cutscene-moon': 'Arriving at the Moon',
  'plan-moon': 'Mission planning · Moon',
  'decision-moon': 'Mission simulation · Moon',
  'cutscene-moon-to-mars': 'Transit to Mars',
  'cutscene-mars': 'Arriving at Mars',
  'plan-mars': 'Mission planning · Mars',
  'decision-mars': 'Mission simulation · Mars',
  results: 'Mission results',
};

export const CUTSCENE_TITLES: Partial<Record<FlowStep, string>> = {
  'cutscene-intro': 'Mission Briefing',
  'cutscene-intro-to-iss': 'En route to the ISS',
  'cutscene-iss': 'Mission 1 · International Space Station',
  'cutscene-iss-to-moon': 'Transit · ISS to the Moon',
  'cutscene-moon': 'Mission 2 · The Moon',
  'cutscene-moon-to-mars': 'Transit · Moon to Mars',
  'cutscene-mars': 'Mission 3 · Mars',
};

/** Prefix with Vite's base so GitHub Pages (…/T-60secondsWEB/) finds the files. */
function videoUrl(file: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base.endsWith('/') ? base : `${base}/`}videos/${file}`;
}

export const CUTSCENE_VIDEOS: Partial<Record<FlowStep, string>> = {
  'cutscene-intro': videoUrl('intro.mp4'),
  'cutscene-intro-to-iss': videoUrl('introtoiss.mp4'),
  'cutscene-iss': videoUrl('iss.mp4'),
  'cutscene-iss-to-moon': videoUrl('isstomoon.mp4'),
  'cutscene-moon': videoUrl('moon.mp4'),
  'cutscene-moon-to-mars': videoUrl('moontomars.mp4'),
  'cutscene-mars': videoUrl('mars.mp4'),
};

const NEXT_STEP: Record<FlowStep, FlowStep> = {
  lobby: 'cutscene-intro',
  'cutscene-intro': 'cutscene-intro-to-iss',
  'cutscene-intro-to-iss': 'cutscene-iss',
  'cutscene-iss': 'plan-iss',
  'plan-iss': 'decision-iss',
  'decision-iss': 'cutscene-iss-to-moon',
  'cutscene-iss-to-moon': 'cutscene-moon',
  'cutscene-moon': 'plan-moon',
  'plan-moon': 'decision-moon',
  'decision-moon': 'cutscene-moon-to-mars',
  'cutscene-moon-to-mars': 'cutscene-mars',
  'cutscene-mars': 'plan-mars',
  'plan-mars': 'decision-mars',
  'decision-mars': 'results',
  results: 'results',
};

export function getNextStep(step: FlowStep): FlowStep {
  return NEXT_STEP[step];
}

export function isFlowStep(value: string | null): value is FlowStep {
  return value !== null && (FLOW_STEPS as readonly string[]).includes(value);
}

const MISSION_BY_STEP: Partial<Record<FlowStep, MissionId>> = {
  'cutscene-iss': 'iss',
  'plan-iss': 'iss',
  'decision-iss': 'iss',
  'cutscene-moon': 'moon',
  'plan-moon': 'moon',
  'decision-moon': 'moon',
  'cutscene-mars': 'mars',
  'plan-mars': 'mars',
  'decision-mars': 'mars',
};

export function missionFromStep(step: FlowStep): MissionId | null {
  return MISSION_BY_STEP[step] ?? null;
}

export function isPlanningStep(step: FlowStep): boolean {
  return step.startsWith('plan-');
}

export function isDecisionStep(step: FlowStep): boolean {
  return step.startsWith('decision-');
}

export function isCutsceneStep(step: FlowStep): boolean {
  return step.startsWith('cutscene-');
}
