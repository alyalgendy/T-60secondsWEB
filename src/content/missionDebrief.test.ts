import { describe, expect, it } from 'vitest';
import { ANALOG_MISSIONS, ISS_EVENT_RESEARCH } from './missionDebrief';
import {
  MISSION_TRAJECTORIES,
  TRAJECTORY_NOTE,
} from './trajectories';

describe('mission visual and debrief content', () => {
  it('includes two sourced real-world sentences for each ISS event', () => {
    expect(Object.keys(ISS_EVENT_RESEARCH)).toHaveLength(3);
    for (const note of Object.values(ISS_EVENT_RESEARCH)) {
      expect(note.whatReallyHappened).toHaveLength(2);
      expect(note.source.url).toMatch(/^https:\/\//);
    }
  });

  it('lists sourced analog missions and illustrative trajectories for every destination', () => {
    expect(ANALOG_MISSIONS.length).toBeGreaterThanOrEqual(2);
    expect(ANALOG_MISSIONS.every((mission) => mission.source.url.startsWith('https://'))).toBe(true);
    expect(TRAJECTORY_NOTE.toLowerCase()).toContain('not to scale');
    expect(Object.values(MISSION_TRAJECTORIES).every((trajectory) => trajectory.points.length > 1)).toBe(true);
  });
});
