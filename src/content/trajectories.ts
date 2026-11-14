import type { MissionId } from '../shared/types';

export type TrajectoryPoint = readonly [number, number, number];

export interface MissionTrajectory {
  label: string;
  points: readonly TrajectoryPoint[];
}

export const TRAJECTORY_NOTE = 'Illustrative, not to scale.';

export const MISSION_TRAJECTORIES: Readonly<Record<MissionId, MissionTrajectory>> = {
  iss: {
    label: 'Earth orbit',
    points: [
      [2.62, 0, 0],
      [2.55, 0.19, 0],
      [2.36, 0.31, 0],
      [2.12, 0.34, 0],
      [1.91, 0.26, 0],
      [1.8, 0.08, 0],
      [1.86, -0.13, 0],
      [2.04, -0.28, 0],
      [2.28, -0.32, 0],
      [2.5, -0.22, 0],
      [2.62, 0, 0],
    ],
  },
  moon: {
    label: 'Earth–Moon transfer',
    points: [
      [2, 0, 0],
      [2.1, 0.14, 0],
      [2.23, 0.27, 0],
      [2.38, 0.37, 0],
      [2.54, 0.42, 0],
      [2.7, 0.4, 0],
      [2.84, 0.34, 0],
      [2.97, 0.25, 0],
      [3.08, 0.14, 0],
      [3.16, 0, 0],
    ],
  },
  mars: {
    label: 'Earth–Mars transfer',
    points: [
      [2, 0, 0],
      [2.18, 0.39, 0],
      [2.39, 0.73, 0],
      [2.63, 1.02, 0],
      [2.9, 1.24, 0],
      [3.19, 1.38, 0],
      [3.48, 1.42, 0],
      [3.75, 1.35, 0],
      [3.98, 1.18, 0],
      [4.17, 0.93, 0],
      [4.3, 0.63, 0],
      [4.36, 0.31, 0],
      [4.38, 0, 0],
    ],
  },
};

export const SOLAR_SYSTEM_ORBITS = [
  { id: 'earth', radius: 2, color: 0x3c9bff },
  { id: 'mars', radius: 4.38, color: 0xff765f },
] as const;

export const TRAJECTORY_BODIES = {
  sun: { position: [0, 0, 0] as TrajectoryPoint, radius: 0.24, color: 0xffc64a },
  earth: { position: [2, 0, 0] as TrajectoryPoint, radius: 0.14, color: 0x4eaaff },
  moon: { position: [3.16, 0, 0] as TrajectoryPoint, radius: 0.08, color: 0xb9c9d8 },
  mars: { position: [4.38, 0, 0] as TrajectoryPoint, radius: 0.12, color: 0xff725e },
};
