import type { MissionConfig } from '../../shared/types';

/**
 * Mission 1: International Space Station (ISS).
 *
 * Units: every amount, mass and budget below is a *game unit* chosen for balance,
 * not a real kilogram figure. Real values are only quoted inside `facts`, where a
 * NASA source is attached.
 *
 * TODO(verify): resource bands, mass costs and the 260-unit budget are game-balance
 * values written by M2. They are deliberately forgiving because this is the first
 * mission that teaches the planning mechanics. Confirm them with the team before
 * the balance pass. TODO(verify): 90-day stay is a game value as well.
 */
export const missionConfig: MissionConfig = {
  id: 'iss',
  title: 'Mission 01 · International Space Station',
  destination: 'Low Earth orbit · about 400 km above Earth',
  goal: 'Fly a crew to the International Space Station and keep them alive and working for 90 days.',
  durationDays: 90,

  // Used only when a mission has no craft step; the selected craft's capacity wins.
  massBudget: 260,

  needs: [
    {
      key: 'oxygen',
      label: 'Oxygen',
      unit: 'units',
      min: 40,
      ideal: 70,
      max: 100,
      massPerUnit: 1,
      why: 'What the crew breathes. Tanks and backup supplies still have to fly up with you.',
    },
    {
      key: 'water',
      label: 'Water',
      unit: 'units',
      min: 40,
      ideal: 70,
      max: 100,
      massPerUnit: 0.9,
      why: 'Drinking, food and washing. Station recyclers recover most of it, so you launch only the shortfall.',
    },
    {
      key: 'food',
      label: 'Food',
      unit: 'units',
      min: 40,
      ideal: 75,
      max: 100,
      massPerUnit: 1.4,
      why: 'Meals for the crew. Food is not recycled on the station today, so every unit is launched from Earth.',
    },
    {
      key: 'power',
      label: 'Power reserve',
      unit: 'units',
      min: 45,
      ideal: 70,
      max: 100,
      massPerUnit: 0.6,
      why: 'Electricity for life support and experiments. The solar arrays supply most of it; this covers batteries and adapters.',
    },
  ],

  // A single craft means the chooser is hidden and Crew Dragon is auto-selected.
  crafts: [
    {
      id: 'crew-dragon',
      name: 'Crew Dragon',
      description:
        'A commercial crew capsule that launches on Falcon 9 and docks to the station automatically.',
      massCapacity: 260,
      crewCapacity: 4,
      pros: [
        'Carries the whole crew in one flight',
        'Docks automatically, so the crew arrives rested',
      ],
      cons: ['Small cargo bay, so heavy supplies need a separate resupply flight'],
      source: {
        title: 'NASA · Commercial Crew Program Overview',
        url: 'https://www.nasa.gov/humans-in-space/commercial-space/commercial-crew-program/commercial-crew-program-overview/',
      },
    },
  ],

  facts: [
    {
      text: 'People have lived on the station without a break since November 2000. It circles Earth about every 90 minutes, so the crew sees 16 sunrises and sunsets a day.',
      source: {
        title: 'NASA · International Space Station Facts and Figures',
        url: 'https://www.nasa.gov/international-space-station/space-station-facts-and-figures/',
      },
    },
    {
      text: 'Life support recycles the crew’s water. NASA has demonstrated recovery of up to 98% of the water on station, so most of it keeps circulating instead of being launched from Earth.',
      source: {
        title: 'NASA · Water Recovery Milestone on the ISS',
        url: 'https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/',
      },
    },
    {
      text: 'Eight solar arrays generate 75 to 90 kilowatts of power for life support, experiments and the station’s systems.',
      source: {
        title: 'NASA · International Space Station Facts and Figures',
        url: 'https://www.nasa.gov/international-space-station/space-station-facts-and-figures/',
      },
    },
  ],
};

export default missionConfig;
