import type { ResourceKey, SubsystemOption, SystemId } from '../shared/types';

export interface MissionObjective {
  id: string;
  label: string;
  payload: string;
  durationDays: number;
  payloadMass: number;
}

export interface LaunchVehicle {
  id: string;
  label: string;
  massCapacity: number;
  cost: number;
  risk: number;
  reliability: number;
  incompatibleObjectives?: { objectiveId: string; reason: string }[];
}

export interface Spacecraft {
  id: string;
  label: string;
  massCapacity: number;
  powerCapacity: number;
  cost: number;
  risk: number;
  reliability: number;
  incompatibleObjectives?: { objectiveId: string; reason: string }[];
}

export interface LaunchWindow {
  id: string;
  label: string;
  tripDays: number;
  deltaVBonus: number;
  fuelCrates: number;
  cost: number;
  risk: number;
}

export interface MissionEventFixture {
  id: string;
  tutorialStepId: string;
  system: SystemId;
  level: 'caution' | 'warning' | 'critical';
  windowEffect:
    | 'flare'
    | 'micrometeoroid'
    | 'static'
    | 'thermal'
    | 'engine'
    | 'powerdip';
  repairSeconds: number;
  responses: readonly MissionResponseFixture[];
}

export interface MissionResponseFixture {
  id: string;
  label: string;
  correct: boolean;
  requiresSpare?: boolean;
  requiresRedundancy?: SystemId;
  requiresAssistSystem?: SystemId;
  repairSeconds?: number;
  degradedSave?: boolean;
}

export const ISS_OBJECTIVES: MissionObjective[] = [
  {
    id: 'iss-observe',
    label: 'Observe Earth',
    payload: 'Earth imaging package',
    durationDays: 12,
    payloadMass: 2,
  },
  {
    id: 'iss-life-science',
    label: 'Study life',
    payload: 'Microgravity lab kit',
    durationDays: 18,
    payloadMass: 3,
  },
  {
    id: 'iss-comms-test',
    label: 'Test relay links',
    payload: 'Relay beacon kit',
    durationDays: 15,
    payloadMass: 2,
  },
  {
    id: 'iss-orbital-assembly',
    label: 'Assemble platform',
    payload: 'Assembly tool kit',
    durationDays: 20,
    payloadMass: 4,
  },
];

export const ISS_LAUNCH_VEHICLES: LaunchVehicle[] = [
  {
    id: 'iss-lv-compact',
    label: 'Compact lifter',
    massCapacity: 38,
    cost: 44,
    risk: 0.22,
    reliability: 0.82,
    incompatibleObjectives: [
      {
        objectiveId: 'iss-orbital-assembly',
        reason: 'Payload exceeds game-balance capacity',
      },
    ],
  },
  {
    id: 'iss-lv-heavy',
    label: 'Heavy lifter',
    massCapacity: 48,
    cost: 68,
    risk: 0.14,
    reliability: 0.93,
  },
];

export const ISS_SPACECRAFT: Spacecraft[] = [
  {
    id: 'iss-craft-compact',
    label: 'Ranger capsule',
    massCapacity: 38,
    powerCapacity: 16,
    cost: 31,
    risk: 0.2,
    reliability: 0.86,
    incompatibleObjectives: [
      {
        objectiveId: 'iss-life-science',
        reason: 'Payload needs a lab craft (game balance)',
      },
      {
        objectiveId: 'iss-orbital-assembly',
        reason: 'Assembly kit exceeds game-balance capacity',
      },
    ],
  },
  {
    id: 'iss-craft-lab',
    label: 'Pioneer lab',
    massCapacity: 48,
    powerCapacity: 24,
    cost: 49,
    risk: 0.12,
    reliability: 0.94,
  },
];

export const ISS_LAUNCH_WINDOWS: LaunchWindow[] = [
  {
    id: 'iss-window-early',
    label: 'Early window',
    tripDays: 8,
    deltaVBonus: 3,
    fuelCrates: 4,
    cost: 32,
    risk: 0.2,
  },
  {
    id: 'iss-window-transfer',
    label: 'Transfer window',
    tripDays: 12,
    deltaVBonus: 2,
    fuelCrates: 3,
    cost: 24,
    risk: 0.13,
  },
  {
    id: 'iss-window-economy',
    label: 'Economy window',
    tripDays: 18,
    deltaVBonus: 1,
    fuelCrates: 2,
    cost: 16,
    risk: 0.17,
  },
];

export const ISS_CARGO_RULES = {
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
} as const;

export const ISS_MODULE_PERFORMANCE: Record<
  string,
  { deltaV?: number; commsCoverage?: number }
> = {
  'engine-chemical': { deltaV: 7 },
  'engine-efficient': { deltaV: 5 },
  'comms-basic': { commsCoverage: 0.58 },
  'comms-array': { commsCoverage: 0.92 },
};

export const ISS_SUBSYSTEM_OPTIONS: SubsystemOption[] = [
  { id: 'engine-chemical', system: 'engine', label: 'Chemical drive', icon: 'engine', mass: 8, power: 1, cost: 20, risk: 0.25, reliability: 0.82 },
  { id: 'engine-efficient', system: 'engine', label: 'Efficient drive', icon: 'engine', mass: 5, power: 3, cost: 28, risk: 0.18, reliability: 0.9 },
  { id: 'solar-fixed', system: 'solar', label: 'Fixed arrays', icon: 'solar', mass: 4, power: 5, cost: 12, risk: 0.2, reliability: 0.84 },
  { id: 'solar-deployable', system: 'solar', label: 'Deployable arrays', icon: 'solar', mass: 6, power: 9, cost: 19, risk: 0.29, reliability: 0.78 },
  { id: 'thermal-passive', system: 'thermal', label: 'Passive control', icon: 'thermal', mass: 2, power: 1, cost: 8, risk: 0.24, reliability: 0.8 },
  { id: 'thermal-active', system: 'thermal', label: 'Active control', icon: 'thermal', mass: 4, power: 4, cost: 15, risk: 0.16, reliability: 0.91, redundant: true },
  { id: 'comms-basic', system: 'comms', label: 'Basic radio', icon: 'comms', mass: 1, power: 2, cost: 7, risk: 0.31, reliability: 0.76 },
  { id: 'comms-array', system: 'comms', label: 'Relay array', icon: 'comms', mass: 3, power: 4, cost: 14, risk: 0.14, reliability: 0.93, redundant: true },
  { id: 'navigation-optical', system: 'navigation', label: 'Optical nav', icon: 'navigation', mass: 2, power: 2, cost: 10, risk: 0.22, reliability: 0.83 },
  { id: 'navigation-dual', system: 'navigation', label: 'Dual nav', icon: 'navigation', mass: 3, power: 3, cost: 17, risk: 0.12, reliability: 0.95, redundant: true },
  { id: 'shield-light', system: 'shield', label: 'Light shield', icon: 'shield', mass: 3, power: 0, cost: 8, risk: 0.3, reliability: 0.77 },
  { id: 'shield-layered', system: 'shield', label: 'Layered shield', icon: 'shield', mass: 6, power: 0, cost: 16, risk: 0.13, reliability: 0.94, redundant: true },
];

export const ISS_EVENTS: MissionEventFixture[] = [
  {
    id: 'iss-event-flare',
    tutorialStepId: 'mission-event-flare',
    system: 'solar',
    level: 'warning',
    windowEffect: 'flare',
    repairSeconds: 8,
    responses: [
      { id: 'shed-load', label: 'Shed noncritical load', correct: true },
      { id: 'reorient-array', label: 'Reorient the array', correct: false },
      {
        id: 'replace-panel',
        label: 'Replace panel section',
        correct: true,
        requiresSpare: true,
        repairSeconds: 5,
      },
    ],
  },
  {
    id: 'iss-event-comms',
    tutorialStepId: 'mission-event-comms',
    system: 'comms',
    level: 'caution',
    windowEffect: 'static',
    repairSeconds: 10,
    responses: [
      {
        id: 'reroute-signal',
        label: 'Reroute the signal',
        correct: true,
        requiresAssistSystem: 'navigation',
      },
      {
        id: 'replace-antenna',
        label: 'Replace antenna',
        correct: true,
        requiresSpare: true,
        repairSeconds: 6,
      },
      { id: 'boost-amplifier', label: 'Boost amplifier', correct: false },
    ],
  },
  {
    id: 'iss-event-thermal',
    tutorialStepId: 'mission-event-thermal',
    system: 'thermal',
    level: 'critical',
    windowEffect: 'thermal',
    repairSeconds: 12,
    responses: [
      {
        id: 'switch-backup',
        label: 'Switch backup loop',
        correct: true,
        requiresRedundancy: 'thermal',
        degradedSave: true,
      },
      {
        id: 'vent-loop',
        label: 'Vent the loop',
        correct: true,
        requiresSpare: true,
        requiresAssistSystem: 'solar',
      },
      { id: 'reset-sensor', label: 'Reset sensor', correct: false },
    ],
  },
];

export const ISS_CARGO_CRATES: readonly ResourceKey[] = [
  'food',
  'water',
  'oxygen',
  'fuel',
  'spares',
];
