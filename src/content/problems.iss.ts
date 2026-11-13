import type { DecisionProblem } from '../shared/types';

export const issProblems: DecisionProblem[] = [
  {
    id: 'iss-proton-storm',
    missionId: 'iss',
    title: 'Proton storm blind spot',
    briefing:
      'A solar flare has thrown a proton storm toward Earth. The uncrewed cargo craft docked at the station uses star cameras to hold its attitude, and the storm is filling those cameras with false stars. The craft has entered safe mode, but its solar panels must stay pointed at the Sun. The crew has one pass over the ground station to choose a recovery plan.',
    options: [
      {
        id: 'wait-safe-mode',
        label: 'Wait in safe mode',
        reasoning:
          'Safe mode protects the craft and keeps the solar panels facing the Sun. It also pauses cargo work and science until the storm fades.',
        effects: { power: -6 },
        scoreDelta: 12,
        outcome:
          'The craft stays safe, but the cargo schedule slips by two days. Once the proton stream fades, the star cameras see real stars again and the team brings the craft back online.',
      },
      {
        id: 'reset-cameras',
        label: 'Reset the star cameras now',
        reasoning:
          'A quick reset could restore attitude control. But while the cameras are off, the craft has no star fix in the middle of a storm.',
        effects: { spares: -10, power: -4 },
        scoreDelta: -6,
        outcome:
          'The reset works for an hour, then the false stars return. The crew uses a spare camera module and still has to wait out the storm.',
      },
      {
        id: 'inertial-units',
        label: 'Fly on the inertial units',
        reasoning:
          'Inertial units do not look at stars, so the storm cannot blind them. They drift over time and draw more power.',
        effects: { power: -12, fuel: -4 },
        scoreDelta: 4,
        outcome:
          'The craft holds attitude on inertial units. Drift forces a small correction burn, but the star cameras stay off until the storm passes and no spare parts are spent.',
      },
    ],
    realWorld: {
      summary:
        'In November 2000, a proton storm from a large solar flare hit NASA\'s Stardust spacecraft. Protons electrified pixels in its star cameras, creating false stars. Stardust entered standby mode and kept its solar panels toward the Sun. The team left it in standby until the threat passed, then reset the first star camera on Nov. 11; it recovered completely.',
      source: {
        title: 'Stardust Spacecraft Encounters Solar Flare',
        url: 'https://www.jpl.nasa.gov/news/stardust-spacecraft-encounters-solar-flare/',
      },
    },
  },
  {
    id: 'iss-micrometeoroid',
    missionId: 'iss',
    title: 'Pebble strike at 20,000 km/h',
    briefing:
      'A small impact shakes a solar array on the station. The array still makes power, but the station starts to rock slowly and one temperature reading drops by a degree. The crew does not know whether the array was damaged or whether a coolant line was nicked.',
    options: [
      {
        id: 'stabilize-and-watch',
        label: 'Stabilize and keep working',
        reasoning:
          'Use the thrusters to stop the rocking, then watch temperatures. It costs fuel but avoids a spacewalk.',
        effects: { fuel: -8 },
        scoreDelta: 10,
        outcome:
          'The thrusters settle the station in under an hour. Temperatures stay normal, so the crew keeps the array online and continues the science program.',
      },
      {
        id: 'spacewalk-inspection',
        label: 'Send a crew to inspect',
        reasoning:
          'A spacewalk gives a close look at the array. It takes hours, exposes the crew to risk, and uses oxygen and spares.',
        effects: { oxygen: -8, spares: -6 },
        scoreDelta: 5,
        outcome:
          'The inspection finds a small pit but no broken coolant line. The crew patches it, and the station keeps full power without waiting for a resupply.',
      },
      {
        id: 'power-down-array',
        label: 'Power down the array and wait',
        reasoning:
          'Turning the array off protects it from further damage. It also cuts the station\'s power margin until the next resupply.',
        effects: { power: -14 },
        scoreDelta: -4,
        outcome:
          'The station runs on its other arrays. The damaged array is fine but stays offline until the next resupply, costing the crew two weeks of experiment time.',
      },
    ],
    realWorld: {
      summary:
        'In September 1967, NASA\'s Mariner IV was flying between Earth and Mars when it crossed a stream of micrometeoroids. The spacecraft was hit by at least 17 pieces in seven minutes. It rocked, but its attitude control system fired small nitrogen thrusters and stabilized it. No loss of solar-panel power was noted, and the spacecraft was not damaged.',
      source: {
        title: 'Mariner IV Crosses Path with Micrometeoroids',
        url: 'https://www.jpl.nasa.gov/news/mariner-iv-crosses-path-with-micrometeoroids/',
      },
    },
  },
  {
    id: 'iss-radiation-shelter',
    missionId: 'iss',
    title: 'Radiation storm incoming',
    briefing:
      'A radiation storm is arriving at Earth. The fastest particles can cross the Sun-Earth distance in about 30 minutes, and they can pass through spacecraft walls and human tissue. The crew is outside the station\'s best-shielded section, and a spacewalk is scheduled in 20 minutes.',
    options: [
      {
        id: 'shelter-now',
        label: 'Shelter in the best-shielded module',
        reasoning:
          'The crew gets behind the most mass on the station, but the spacewalk and some experiments stop.',
        effects: { power: -6, food: -2 },
        scoreDelta: 12,
        outcome:
          'The crew shelters and the storm passes. The spacewalk moves to a later orbit. The crew is safe, and the station loses a little science time.',
      },
      {
        id: 'finish-spacewalk',
        label: 'Finish the spacewalk first',
        reasoning:
          'The spacewalk is already prepared and finishing it saves time. It also leaves the crew outside during the most intense particles.',
        effects: { oxygen: -8, power: -2 },
        scoreDelta: -14,
        outcome:
          'The crew finishes quickly, but the radiation alarm sounds while they are outside. Everyone returns safely, and the medical team restricts their work for several days.',
      },
      {
        id: 'shelter-in-cargo-craft',
        label: 'Shelter in the docked cargo craft',
        reasoning:
          'The docked craft has extra supplies around it and could serve as a storm shelter. Moving the crew there takes time and uses fuel to keep both craft aligned.',
        effects: { fuel: -10, spares: -2 },
        scoreDelta: 3,
        outcome:
          'The crew takes shelter in the cargo craft. It stays attached; the crew decides undocking during a storm is not worth the risk.',
      },
    ],
    realWorld: {
      summary:
        'Solar eruptions can send radiation storms toward Earth. NASA says the fastest particles can cover the roughly 93 million miles from the Sun in about 30 minutes or less. They can pierce satellite hardware, degrade solar panels and damage circuits, and they pose a radiation risk to astronauts in space.',
      source: {
        title: 'Solar Storms and Flares',
        url: 'https://science.nasa.gov/sun/solar-storms-and-flares/',
      },
    },
  },
];

export default issProblems;
