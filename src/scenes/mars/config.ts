import type { MissionConfig } from '../../shared/types';

/**
 * Mars planning config.
 *
 * All resource amounts, mass values and budgets are game units, not kilograms.
 * The only real-world numbers shown to players come from the cited NASA facts.
 */
export const missionConfig: MissionConfig = {
  id: 'mars',
  title: 'Mars Cure Run',
  destination: 'Mars',
  goal: 'Land the cure reactor on Mars and keep the crew alive through the longest, most exposed leg of the journey.',
  // TODO(verify): real Mars transfers depend on the launch window. 210 is a
  // game-balance round number for this mission, not a quoted NASA duration.
  durationDays: 210,
  massBudget: 440,
  needs: [
    {
      key: 'fuel',
      label: 'Fuel',
      unit: 'units',
      min: 55,
      ideal: 85,
      max: 100,
      massPerUnit: 1.2,
      why: 'Course corrections and the arrival burn use the most fuel.',
    },
    {
      key: 'power',
      label: 'Power',
      unit: 'units',
      min: 50,
      ideal: 80,
      max: 100,
      massPerUnit: 0.9,
      why: 'Dust storms can dim the solar arrays for weeks.',
    },
    {
      key: 'oxygen',
      label: 'Oxygen',
      unit: 'units',
      min: 60,
      ideal: 90,
      max: 100,
      massPerUnit: 0.8,
      why: 'The crew breathes it every day for 210 days.',
    },
    {
      key: 'water',
      label: 'Water',
      unit: 'units',
      min: 55,
      ideal: 85,
      max: 100,
      massPerUnit: 1,
      why: 'Drinking, food and cooling all need water.',
    },
    {
      key: 'food',
      label: 'Food',
      unit: 'units',
      min: 60,
      ideal: 90,
      max: 100,
      massPerUnit: 0.7,
      why: 'No resupply ship can reach Mars in time.',
    },
    {
      key: 'shielding',
      label: 'Shielding',
      unit: 'units',
      min: 65,
      ideal: 95,
      max: 100,
      massPerUnit: 1.4,
      why: 'Mars has no global magnetic field to block radiation.',
    },
    {
      key: 'spares',
      label: 'Spares',
      unit: 'units',
      min: 45,
      ideal: 75,
      max: 100,
      massPerUnit: 0.8,
      why: 'At Mars, a replacement part is months away.',
    },
  ],
  crafts: [
    {
      id: 'pathfinder-hauler',
      name: 'Pathfinder Hauler',
      description:
        'A roomy transfer craft built for long cargo runs. It gives the crew the most mass to work with, at the cost of a heavier fuel load.',
      massCapacity: 460,
      crewCapacity: 4,
      pros: ['Largest mass budget', 'Room for four crew'],
      cons: ['Heavier fuel load', 'Slower to turn around'],
    },
    {
      id: 'dust-runner',
      name: 'Dust Runner',
      description:
        'A stripped-down craft with low fuel needs. Its tight mass budget leaves little room for error.',
      massCapacity: 400,
      crewCapacity: 3,
      pros: ['Low fuel demand', 'Fast transit'],
      cons: ['Tightest mass budget', 'Fewer spare slots'],
    },
    {
      id: 'shielded-long-haul',
      name: 'Shielded Long-Haul',
      description:
        'A craft with a thick shielding shell and large water tanks. It protects the crew well, but its structure eats into the cargo budget.',
      massCapacity: 440,
      crewCapacity: 4,
      pros: ['Extra radiation shielding', 'Large water tanks'],
      cons: ['Heavy structure', 'Fewer spare slots'],
    },
  ],
  facts: [
    {
      text: 'Mars is about 142 million miles (228 million kilometers) from the Sun on average. Sunlight takes about 13 minutes to reach it.',
      source: {
        title: 'NASA · Mars: Facts',
        url: 'https://science.nasa.gov/mars/facts/',
      },
    },
    {
      text: 'Dust storms can cover much of Mars, and it can take months for all the dust to settle afterward.',
      source: {
        title: 'NASA · Mars: Facts',
        url: 'https://science.nasa.gov/mars/facts/',
      },
    },
    {
      text: 'Mars has no global magnetic field today. Its thin atmosphere offers little protection from meteorites, asteroids and comets.',
      source: {
        title: 'NASA · Mars: Facts',
        url: 'https://science.nasa.gov/mars/facts/',
      },
    },
  ],
};

export default missionConfig;
