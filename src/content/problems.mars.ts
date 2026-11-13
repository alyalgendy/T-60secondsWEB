import type { DecisionProblem } from '../shared/types';

export const marsProblems: DecisionProblem[] = [
  {
    id: 'mars-safe-mode',
    missionId: 'mars',
    title: 'Safe mode, minutes away',
    briefing:
      'A fault puts the spacecraft in safe mode just before Mars orbit insertion. Radio signals take minutes to tens of minutes each way, so the team cannot watch every step in real time. The backup computer is talking, but the main computer is off.',
    options: [
      {
        id: 'let-fault-protection-finish',
        label: 'Let fault protection finish',
        reasoning:
          'The spacecraft is designed to protect itself. Waiting costs time but avoids a command sent without full telemetry.',
        effects: { power: -4 },
        scoreDelta: 12,
        outcome:
          'The backup computer completes the recovery. The team loses a day of science, but the spacecraft is healthy for arrival.',
      },
      {
        id: 'upload-full-sequence',
        label: 'Upload a full recovery sequence now',
        reasoning:
          'A prepared sequence could restore the main computer sooner. It is long, and part of it may not fit the current fault state.',
        effects: { spares: -8, power: -6 },
        scoreDelta: -6,
        outcome:
          'Half the sequence runs, then the spacecraft rejects it. The team has to rebuild the plan and loses a spare data recorder.',
      },
      {
        id: 'coast-low-power',
        label: 'Coast on the lowest-power mode',
        reasoning:
          'Coasting saves power for arrival. It also leaves less time to check the spacecraft before the critical burn.',
        effects: { power: 5, food: -2 },
        scoreDelta: 2,
        outcome:
          'The spacecraft coasts on minimum power. The team gets less diagnostic time but saves energy for the arrival burn.',
      },
    ],
    realWorld: {
      summary:
        'On July 4, 2015, NASA\'s New Horizons lost contact with Earth while 10 days from Pluto. Its autopilot recognized a problem, switched from the main to the backup computer, entered safe mode and reinitiated contact. Because the round-trip delay was about 9 hours, full recovery was expected to take one to several days.',
      source: {
        title: 'New Horizons Team Responds to Spacecraft Anomaly',
        url: 'https://www.nasa.gov/missions/new-horizons-team-responds-to-spacecraft-anomaly/',
      },
    },
  },
  {
    id: 'mars-old-software',
    missionId: 'mars',
    title: 'Old software, silent spacecraft',
    briefing:
      'A Mars orbiter that has run for years suddenly stops answering. Its signal is weak and drifting. The team can send commands "in the blind", without knowing whether the spacecraft receives them. The orbiter carries the cure data relay.',
    options: [
      {
        id: 'rebuild-software',
        label: 'Recreate the old flight software',
        reasoning:
          'The spacecraft speaks an old software language, and the team\'s machines no longer run it. Rebuilding takes time but lets the team talk to the spacecraft properly.',
        effects: { spares: -10, power: -4 },
        scoreDelta: 12,
        outcome:
          'The rebuilt software lets the team lock on. The orbiter answers, and the cure data relay is saved.',
      },
      {
        id: 'blind-command',
        label: 'Send blind commands to the high-gain antenna',
        reasoning:
          'It might restore the link quickly. Without telemetry, no one knows whether the command worked.',
        effects: { power: -8 },
        scoreDelta: -2,
        outcome:
          'The signal does not change. A second attempt with a wider antenna beam also fails, and the team has used two days of the relay window.',
      },
      {
        id: 'backup-lander-relay',
        label: 'Switch to the lander\'s backup relay',
        reasoning:
          'The lander is close and healthy. Its relay is slower and uses power the lander needs for heating.',
        effects: { power: -12, spares: -2 },
        scoreDelta: 4,
        outcome:
          'The lander takes over the relay. Data moves slowly, and the lander has less power for the cold nights.',
      },
    ],
    realWorld: {
      summary:
        'NASA\'s IMAGE satellite went silent in 2005 and was rediscovered by an amateur astronomer in 2018. When NASA re-established contact, engineers found that the old mission software and computers no longer existed, so they had to recreate the tools needed to command it. Commands were sent "in the blind" because the team could not lock on to the spacecraft.',
      source: {
        title: 'Latest Updates from NASA on IMAGE Recovery',
        url: 'https://www.nasa.gov/solar-system/latest-updates-from-nasa-on-image-recovery/',
      },
    },
  },
  {
    id: 'mars-radiation-storm',
    missionId: 'mars',
    title: 'Radiation storm at Mars',
    briefing:
      'A radiation storm is on its way from the Sun. The crew is far from Earth\'s magnetic field and atmosphere, and the spacecraft has only a thin hull. The storm will arrive in hours, and the crew is in the middle of a surface operation.',
    options: [
      {
        id: 'shelter-water-tanks',
        label: 'Shelter beside the water tanks',
        reasoning:
          'Water is good radiation shielding. Sheltering stops the surface work and uses drinking water if the crew stays long.',
        effects: { water: -8 },
        scoreDelta: 12,
        outcome:
          'The crew shelters behind the tanks. The storm passes, the surface work resumes a day behind, and the water reserve is lower but still above minimum.',
      },
      {
        id: 'extra-shielding',
        label: 'Install extra shielding panels',
        reasoning:
          'More panels would help with future storms. They take hours to fit and leave the crew outside as the storm arrives.',
        effects: { spares: -10, shielding: -6 },
        scoreDelta: 3,
        outcome:
          'The crew fits two panels before the storm hits. The extra cover helps, but the work costs spares and time, and the crew still shelters at the end.',
      },
      {
        id: 'keep-working',
        label: 'Keep working and monitor doses',
        reasoning:
          'The cure work continues. Particle radiation can pass through the hull and human tissue, so this raises the crew\'s risk.',
        effects: { power: -4, oxygen: -6 },
        scoreDelta: -12,
        outcome:
          'The crew finishes the task, but the radiation alarm keeps sounding. The medical team restricts their work for several days.',
      },
    ],
    realWorld: {
      summary:
        'Solar eruptions can send radiation storms toward Earth and other planets. NASA says the fastest particles can cover the roughly 93 million miles from the Sun to Earth in about 30 minutes or less. The particles can pierce spacecraft hardware and pose a radiation risk to astronauts.',
      source: {
        title: 'Solar Storms and Flares',
        url: 'https://science.nasa.gov/sun/solar-storms-and-flares/',
      },
    },
  },
];

export default marsProblems;
