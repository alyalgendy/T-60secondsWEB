import type { MissionId } from '../shared/types';
import {
  ISS_CARGO_CRATES,
  ISS_CARGO_RULES,
  ISS_EVENTS,
  ISS_LAUNCH_VEHICLES,
  ISS_LAUNCH_WINDOWS,
  ISS_MODULE_PERFORMANCE,
  ISS_OBJECTIVES,
  ISS_SPACECRAFT,
  ISS_SUBSYSTEM_OPTIONS,
} from './iss-v2';
import { ANALOG_MISSIONS, ISS_EVENT_RESEARCH } from './missionDebrief';
import type { MissionV2Content } from './mission-v2-types';
import { MARS_V2_CONTENT } from './mars-v2';
import { MOON_V2_CONTENT } from './moon-v2';

export const ISS_V2_CONTENT: MissionV2Content = {
  id: 'iss',
  name: 'ISS',
  goal: 'Keep the station and its crew running through flight events.',
  objectives: ISS_OBJECTIVES,
  launchVehicles: ISS_LAUNCH_VEHICLES,
  spacecraft: ISS_SPACECRAFT,
  launchWindows: ISS_LAUNCH_WINDOWS,
  cargoRules: ISS_CARGO_RULES,
  cargoCrates: ISS_CARGO_CRATES,
  modulePerformance: ISS_MODULE_PERFORMANCE,
  subsystemOptions: ISS_SUBSYSTEM_OPTIONS,
  events: ISS_EVENTS,
  eventResearch: ISS_EVENT_RESEARCH,
  analogMissions: ANALOG_MISSIONS,
  requiredDeltaV: 6,
  commsThreshold: 0.6,
  costLimit: 260,
  minimumRedundantSystems: 1,
  resourceDrainMultiplier: 1,
  minimumEventCount: 0,
};

export const MISSION_V2_CONTENT: Readonly<Record<MissionId, MissionV2Content>> = {
  iss: ISS_V2_CONTENT,
  moon: MOON_V2_CONTENT,
  mars: MARS_V2_CONTENT,
};

export function getMissionV2Content(missionId: MissionId): MissionV2Content {
  return MISSION_V2_CONTENT[missionId];
}
