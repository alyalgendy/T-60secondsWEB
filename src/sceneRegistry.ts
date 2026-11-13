import { lazy, type LazyExoticComponent } from 'react';
import type {
  BaseSceneProps,
  CutsceneProps,
  DecisionProblem,
  DecisionSceneProps,
  MissionConfig,
  MissionId,
  PlanningSceneProps,
  ResultsSceneProps,
} from './shared/types';

/**
 * Props a scene module can receive. Each real scene narrows this to its own
 * contract (PlanningSceneProps, CutsceneProps, DecisionSceneProps or
 * ResultsSceneProps). The registry stays loose so M2-M4 can add a folder
 * without editing App.tsx.
 */
export type RegisteredSceneProps = BaseSceneProps &
  Partial<
    PlanningSceneProps & CutsceneProps & DecisionSceneProps & ResultsSceneProps
  >;

export type SceneComponent = React.ComponentType<RegisteredSceneProps>;
export type LazyScene = LazyExoticComponent<SceneComponent>;

const sceneModules = import.meta.glob<{ default: SceneComponent }>(
  './scenes/*/index.tsx',
);

const sceneCache = new Map<string, LazyScene>();

/**
 * Finds src/scenes/<folder>/index.tsx. Returns null when the scene does not
 * exist yet, so the router can show a placeholder instead of failing the build.
 */
export function getSceneComponent(folder: string): LazyScene | null {
  const loader = sceneModules[`./scenes/${folder}/index.tsx`];
  if (!loader) return null;

  const cached = sceneCache.get(folder);
  if (cached) return cached;

  const component = lazy(loader);
  sceneCache.set(folder, component);
  return component;
}

type ConfigModule = {
  missionConfig?: MissionConfig;
  default?: MissionConfig;
};

const configModules = import.meta.glob<ConfigModule>('./scenes/*/config.ts', {
  eager: true,
});

export function getMissionConfig(missionId: MissionId): MissionConfig | null {
  const module = configModules[`./scenes/${missionId}/config.ts`];
  return module?.missionConfig ?? module?.default ?? null;
}

type ProblemModule = {
  default?: DecisionProblem[];
  problems?: DecisionProblem[];
};

const problemModules = import.meta.glob<ProblemModule>(
  './content/problems.*.ts',
  { eager: true },
);

export function getProblems(missionId: MissionId): DecisionProblem[] {
  const module = problemModules[`./content/problems.${missionId}.ts`];
  return module?.default ?? module?.problems ?? [];
}
