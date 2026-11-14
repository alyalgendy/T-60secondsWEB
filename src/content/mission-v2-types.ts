import type {
  LaunchVehicle,
  LaunchWindow,
  MissionEventFixture,
  MissionObjective,
  Spacecraft,
} from './iss-v2';
import type { AnalogMission, EventResearchNote } from './missionDebrief';
import type { ResourceKey, SubsystemOption, SystemId } from '../shared/types';

export interface MissionV2Content {
  id: 'iss' | 'moon' | 'mars';
  name: string;
  goal: string;
  objectives: readonly MissionObjective[];
  launchVehicles: readonly LaunchVehicle[];
  spacecraft: readonly Spacecraft[];
  launchWindows: readonly LaunchWindow[];
  cargoRules: {
    gridCells: number;
    stackLimit: number;
    daysPerLifeSupportCrate: number;
    massPerCrate: Readonly<Record<ResourceKey, number>>;
  };
  cargoCrates: readonly ResourceKey[];
  modulePerformance: Readonly<
    Record<string, { deltaV?: number; commsCoverage?: number }>
  >;
  subsystemOptions: readonly SubsystemOption[];
  events: readonly MissionEventFixture[];
  eventResearch: Readonly<Record<string, EventResearchNote>>;
  analogMissions: readonly AnalogMission[];
  requiredDeltaV: number;
  commsThreshold: number;
  costLimit: number;
  minimumRedundantSystems: number;
  resourceDrainMultiplier: number;
  minimumEventCount: number;
}

export const DEFAULT_CARGO_CRATES: readonly ResourceKey[] = [
  'food',
  'water',
  'oxygen',
  'fuel',
  'spares',
];

export const DEFAULT_CARGO_RULES: MissionV2Content['cargoRules'] = {
  gridCells: 15,
  stackLimit: 3,
  daysPerLifeSupportCrate: 6,
  massPerCrate: {
    fuel: 2,
    power: 1,
    oxygen: 1,
    water: 1,
    food: 1,
    shielding: 2,
    spares: 1,
  },
};

export function getCargoCellsForContent(
  cargo: Record<ResourceKey, number>,
  content: MissionV2Content,
): number {
  return Object.values(cargo).reduce(
    (cells, count) =>
      cells + Math.ceil(Math.max(0, count) / content.cargoRules.stackLimit),
    0,
  );
}

export type DesignFixtureContent = Pick<
  MissionV2Content,
  | 'objectives'
  | 'launchVehicles'
  | 'spacecraft'
  | 'launchWindows'
  | 'cargoRules'
  | 'cargoCrates'
  | 'modulePerformance'
  | 'subsystemOptions'
  | 'requiredDeltaV'
  | 'commsThreshold'
  | 'costLimit'
  | 'minimumRedundantSystems'
>;

export type SimulationFixtureContent = Pick<
  MissionV2Content,
  | 'id'
  | 'resourceDrainMultiplier'
  | 'minimumEventCount'
  | 'events'
  | 'launchWindows'
  | 'subsystemOptions'
>;

export type { SystemId };
