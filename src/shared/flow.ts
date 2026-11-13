import type { FlowStep, MissionId } from './types';

export const FLOW_STEPS: readonly FlowStep[] = [
  'lobby',
  'cutscene-intro',
  'cutscene-iss',
  'plan-iss',
  'decision-iss',
  'cutscene-moon',
  'plan-moon',
  'decision-moon',
  'cutscene-mars',
  'plan-mars',
  'decision-mars',
  'results',
] as const;

export const STEP_LABELS: Record<FlowStep, string> = {
  lobby: 'Lobby',
  'cutscene-intro': 'Briefing',
  'cutscene-iss': 'Cutscene · ISS',
  'plan-iss': 'Plan · ISS',
  'decision-iss': 'Decision · ISS',
  'cutscene-moon': 'Cutscene · Moon',
  'plan-moon': 'Plan · Moon',
  'decision-moon': 'Decision · Moon',
  'cutscene-mars': 'Cutscene · Mars',
  'plan-mars': 'Plan · Mars',
  'decision-mars': 'Decision · Mars',
  results: 'Results',
};

export const CUTSCENE_TITLES: Partial<Record<FlowStep, string>> = {
  'cutscene-intro': 'Mission Briefing',
  'cutscene-iss': 'Mission 1 · International Space Station',
  'cutscene-moon': 'Mission 2 · The Moon',
  'cutscene-mars': 'Mission 3 · Mars',
};

export const CUTSCENE_VIDEOS: Partial<Record<FlowStep, string>> = {
  'cutscene-intro': '/videos/intro.mp4',
  'cutscene-iss': '/videos/iss.mp4',
  'cutscene-moon': '/videos/moon.mp4',
  'cutscene-mars': '/videos/mars.mp4',
};

const NEXT_STEP: Record<FlowStep, FlowStep> = {
  lobby: 'cutscene-intro',
  'cutscene-intro': 'cutscene-iss',
  'cutscene-iss': 'plan-iss',
  'plan-iss': 'decision-iss',
  'decision-iss': 'cutscene-moon',
  'cutscene-moon': 'plan-moon',
  'plan-moon': 'decision-moon',
  'decision-moon': 'cutscene-mars',
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

export function missionFromStep(step: FlowStep): MissionId | null {
  if (step.endsWith('-iss')) return 'iss';
  if (step.endsWith('-moon')) return 'moon';
  if (step.endsWith('-mars')) return 'mars';
  return null;
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
