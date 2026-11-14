import type { MissionConfig } from '../../shared/types';

/**
 * Mission 1: International Space Station (ISS).
 *
 * Resource sliders are percentages of the mission-specific reserve cap. Loadout costs
 * remain game-balance points; real ISS measurements are shown with NASA citations.
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
      unit: '%',
      min: 40,
      ideal: 70,
      max: 100,
      massPerUnit: 1,
      why: 'What the crew breathes. Tanks and backup supplies still have to fly up with you.',
    },
    {
      key: 'water',
      label: 'Water',
      unit: '%',
      min: 40,
      ideal: 70,
      max: 100,
      massPerUnit: 0.9,
      why: 'Drinking, food and washing. Station recyclers recover most of it, so you launch only the shortfall.',
    },
    {
      key: 'food',
      label: 'Food',
      unit: '%',
      min: 40,
      ideal: 75,
      max: 100,
      massPerUnit: 1.4,
      why: 'Meals for the crew. Food is not recycled on the station today, so the food supply must be delivered from Earth.',
    },
    {
      key: 'power',
      label: 'Power reserve',
      unit: '%',
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
