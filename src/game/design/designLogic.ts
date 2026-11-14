import { getMissionV2Content } from '../../content/missions-v2';
import type { MissionId, DesignState, ResourceKey, SubsystemOption, SystemId } from '../../shared/types';
import type { MissionV2Content } from '../../content/mission-v2-types';

export const DESIGN_SECONDS = 300;
export const DESIGN_SYSTEMS: readonly SystemId[] = [
  'engine',
  'solar',
  'thermal',
  'comms',
  'navigation',
  'shield',
];

export interface DesignStats {
  mass: number;
  massLimit: number;
  powerDemand: number;
  powerSupply: number;
  cost: number;
  costLimit: number;
  deltaV: number;
  requiredDeltaV: number;
  commsCoverage: number;
  lifeSupportDays: number;
  missionDays: number;
  redundancyCount: number;
  risk: number;
}

export interface ReadinessGate {
  id: string;
  label: string;
  status: 'green' | 'amber' | 'red';
  value: string;
}

export interface SegmentStatus {
  id: 'launch' | 'space' | 'ground' | 'user';
  label: string;
  complete: boolean;
}

const EMPTY_CARGO: Record<ResourceKey, number> = {
  fuel: 0,
  power: 0,
  oxygen: 0,
  water: 0,
  food: 0,
  shielding: 0,
  spares: 0,
};

const OPTION_RADAR_MAX = {
  mass: 12,
  power: 10,
  cost: 32,
} as const;

export function createInitialDesignState(now = Date.now()): DesignState {
  return {
    stage: 'concept',
    endsAt: now + DESIGN_SECONDS * 1000,
    objectiveIds: [],
    launchVehicleId: null,
    craftId: null,
    modules: {},
    installedModules: {},
    cargo: { ...EMPTY_CARGO },
    launchWindowId: null,
    votes: {},
    ready: [],
  };
}

export function getSubsystemOption(
  optionId: string | undefined,
  content: MissionV2Content = getMissionV2Content('iss'),
): SubsystemOption | undefined {
  return content.subsystemOptions.find((option) => option.id === optionId);
}

export function getCargoCells(
  cargo: Record<ResourceKey, number>,
  content: MissionV2Content = getMissionV2Content('iss'),
): number {
  return Object.values(cargo).reduce(
    (cells, count) =>
      cells + Math.ceil(Math.max(0, count) / content.cargoRules.stackLimit),
    0,
  );
}

export function calculateDesignStats(
  state: DesignState,
  content: MissionV2Content = getMissionV2Content('iss'),
): DesignStats {
  const vehicle = content.launchVehicles.find(
    (option) => option.id === state.launchVehicleId,
  );
  const craft = content.spacecraft.find((option) => option.id === state.craftId);
  const window = content.launchWindows.find(
    (option) => option.id === state.launchWindowId,
  );
  const modules = DESIGN_SYSTEMS.map((system) =>
    getSubsystemOption(state.modules[system], content),
  ).filter((option): option is SubsystemOption => option !== undefined);
  const objectives = state.objectiveIds
    .map((id) => content.objectives.find((objective) => objective.id === id))
    .filter((objective): objective is (typeof content.objectives)[number] =>
      Boolean(objective),
    );
  const crateCount = Object.values(state.cargo).reduce(
    (total, count) => total + Math.max(0, count),
    0,
  );
  const cargoMass = Object.entries(state.cargo).reduce(
    (total, [resource, count]) =>
      total +
      count *
        content.cargoRules.massPerCrate[resource as ResourceKey],
    0,
  );
  const solarOutput = modules.find((option) => option.system === 'solar')?.power ?? 0;
  const powerDemand = modules
    .filter((option) => option.system !== 'solar')
    .reduce((total, option) => total + option.power, 0);
  const lifeSupportCrates = Math.min(
    state.cargo.oxygen,
    state.cargo.water,
    state.cargo.food,
  );
  const missionDays =
    (objectives.length
      ? Math.max(...objectives.map((objective) => objective.durationDays))
      : 0) + (window?.tripDays ?? 0);
  const launchWindowFuel = window?.fuelCrates ?? 0;
  const enginePerformance =
    content.modulePerformance[state.modules.engine ?? ''];
  const commsPerformance =
    content.modulePerformance[state.modules.comms ?? ''];
  const mass = modules.reduce((total, option) => total + option.mass, 0) +
    cargoMass * 0.35 +
    objectives.reduce((total, objective) => total + objective.payloadMass, 0);
  const riskParts = [
    ...modules.map((option) => option.risk),
    vehicle?.risk,
    craft?.risk,
    window?.risk,
  ].filter((value): value is number => value !== undefined);
  const risk =
    riskParts.length > 0
      ? riskParts.reduce((total, value) => total + value, 0) / riskParts.length
      : 0.5;

  return {
    mass,
    massLimit: Math.min(vehicle?.massCapacity ?? 0, craft?.massCapacity ?? 0),
    powerDemand,
    powerSupply: (craft?.powerCapacity ?? 0) + solarOutput,
    cost:
      modules.reduce((total, option) => total + option.cost, 0) +
      (vehicle?.cost ?? 0) +
      (craft?.cost ?? 0) +
      (window?.cost ?? 0) +
      crateCount,
    costLimit: content.costLimit,
    deltaV:
      (enginePerformance?.deltaV ?? 0) +
      (window?.deltaVBonus ?? 0) -
      Math.max(0, launchWindowFuel - state.cargo.fuel) * 2,
    requiredDeltaV: content.requiredDeltaV + (objectives.length < 2 ? 2 : 0),
    commsCoverage: commsPerformance?.commsCoverage ?? 0,
    lifeSupportDays: lifeSupportCrates * content.cargoRules.daysPerLifeSupportCrate,
    missionDays,
    redundancyCount: modules.filter((option) => option.redundant).length,
    risk: Math.min(1, risk + (state.rushed ? 0.18 : 0)),
  };
}

function gateStatus(
  passes: boolean,
  close: boolean,
): ReadinessGate['status'] {
  if (!passes) return 'red';
  return close ? 'amber' : 'green';
}

export function getReadinessGates(
  state: DesignState,
  missionId: MissionId = 'iss',
): ReadinessGate[] {
  const content = getMissionV2Content(missionId);
  const stats = calculateDesignStats(state, content);
  const massMargin = stats.massLimit - stats.mass;
  const powerMargin = stats.powerSupply - stats.powerDemand;
  const costMargin = stats.costLimit - stats.cost;
  const deltaVMargin = stats.deltaV - stats.requiredDeltaV;
  const lifeSupportMargin = stats.lifeSupportDays - stats.missionDays;
  return [
    {
      id: 'mass',
      label: 'Mass',
      status: gateStatus(massMargin >= 0, massMargin < 3),
      value: `${stats.mass.toFixed(1)} / ${stats.massLimit}`,
    },
    {
      id: 'power',
      label: 'Power',
      status: gateStatus(powerMargin >= 0, powerMargin < 3),
      value: `${stats.powerSupply} / ${stats.powerDemand}`,
    },
    {
      id: 'cost',
      label: 'Cost',
      status: gateStatus(costMargin >= 0, costMargin < 30),
      value: `${stats.cost} / ${stats.costLimit}`,
    },
    {
      id: 'delta-v',
      label: 'Delta-v',
      status: gateStatus(deltaVMargin >= 0, deltaVMargin < 2),
      value: `${stats.deltaV} / ${stats.requiredDeltaV}`,
    },
    {
      id: 'comms',
      label: 'Comms',
      status: gateStatus(
        stats.commsCoverage >= content.commsThreshold,
        stats.commsCoverage < content.commsThreshold + 0.2,
      ),
      value: `${Math.round(stats.commsCoverage * 100)}% / ${Math.round(content.commsThreshold * 100)}%`,
    },
    {
      id: 'life-support',
      label: 'Life support',
      status: gateStatus(lifeSupportMargin >= 0, lifeSupportMargin < 4),
      value: `${stats.lifeSupportDays} / ${stats.missionDays} days`,
    },
    {
      id: 'redundancy',
      label: 'Redundancy',
      status: gateStatus(
        stats.redundancyCount >= content.minimumRedundantSystems,
        stats.redundancyCount === content.minimumRedundantSystems,
      ),
      value: `${stats.redundancyCount} / ${content.minimumRedundantSystems} backup systems`,
    },
    {
      id: 'cargo',
      label: 'Cargo cells',
      status: gateStatus(
        getCargoCells(state.cargo, content) <= content.cargoRules.gridCells,
        getCargoCells(state.cargo, content) >= content.cargoRules.gridCells - 2,
      ),
      value: `${getCargoCells(state.cargo, content)} / ${content.cargoRules.gridCells}`,
    },
  ];
}

export function canLaunch(
  state: DesignState,
  missionId: MissionId = 'iss',
): boolean {
  return getReadinessGates(state, missionId).every(
    (gate) => gate.status !== 'red',
  );
}

export function getSegmentChecklist(
  state: DesignState,
  missionId: MissionId = 'iss',
): SegmentStatus[] {
  const content = getMissionV2Content(missionId);
  const stats = calculateDesignStats(state, content);
  const allInstalled = DESIGN_SYSTEMS.every(
    (system) => Boolean(state.installedModules?.[system]),
  );
  return [
    { id: 'launch', label: 'Launch', complete: Boolean(state.launchVehicleId) },
    {
      id: 'space',
      label: 'Space',
      complete: Boolean(state.craftId) && allInstalled,
    },
    {
      id: 'ground',
      label: 'Ground',
      complete: stats.commsCoverage >= content.commsThreshold,
    },
    {
      id: 'user',
      label: 'User',
      complete: state.objectiveIds.length === 2,
    },
  ];
}

export function radarValues(option: SubsystemOption): number[] {
  return [
    Math.min(1, option.mass / OPTION_RADAR_MAX.mass),
    Math.min(1, option.power / OPTION_RADAR_MAX.power),
    Math.min(1, option.cost / OPTION_RADAR_MAX.cost),
    option.risk,
    option.reliability,
  ];
}

