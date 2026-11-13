import type { MissionIncident } from './incidents';

export const issProblems: MissionIncident[] = [
  {
    id: 'iss-micrometeoroid',
    missionId: 'iss',
    title: 'Pebble strike at 20,000 km/h',
    met: 'MET 00:18',
    metMinutes: 18,
    severity: 'warning',
    phase: 'Low Earth orbit · solar array inspection',
    alarm: 'IMPACT DETECTED · ARRAY 2B',
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
    id: 'iss-proton-storm',
    missionId: 'iss',
    title: 'Proton storm blind spot',
    met: 'MET 02:15',
    metMinutes: 135,
    severity: 'caution',
    phase: 'Low Earth orbit · docked cargo operations',
    alarm: 'SPACE WEATHER · PROTON FLUX RISING',
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
    id: 'iss-radiation-shelter',
    missionId: 'iss',
    title: 'Radiation storm incoming',
    met: 'MET 07:40',
    metMinutes: 460,
    severity: 'warning',
    phase: 'Low Earth orbit · spacewalk preparation',
    alarm: 'RADIATION ALERT · SHELTER NOW',
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
  {
    id: 'iss-ammonia-leak',
    missionId: 'iss',
    title: 'Ammonia plume on the truss',
    met: 'MET 12:05',
    metMinutes: 725,
    severity: 'critical',
    phase: 'Low Earth orbit · port truss cooling loop',
    alarm: 'AMMONIA LEAK · LOOP A PRESSURE FALLING',
    briefing:
      'A camera on the station\'s port truss shows a white plume venting from a radiator connection. Ammonia coolant pressure is falling, and the loop carries heat away from half the station. The crew can close the loop remotely, but that takes a radiator offline. A spacewalk to replace the hose would take hours to prepare.',
    options: [
      {
        id: 'isolate-loop',
        label: 'Isolate the leaking loop',
        reasoning:
          'Closing the valves should stop the leak and protect the rest of the cooling system. It also leaves the station on a single loop with less margin.',
        effects: { power: -8, spares: -2 },
        scoreDelta: 12,
        outcome:
          'The crew closes the loop valves and the plume stops. One radiator is offline; the station runs on its backup loop with a narrower margin until the next resupply.',
      },
      {
        id: 'emergency-spacewalk',
        label: 'Send an emergency spacewalk',
        reasoning:
          'A close inspection could find and replace the failed hose. It takes hours outside and uses oxygen and spares the crew may need later.',
        effects: { oxygen: -10, spares: -8 },
        scoreDelta: 6,
        outcome:
          'The EVA crew finds a cracked jumper hose and replaces it. The leak stops, but the crew spends oxygen and most of a day outside.',
      },
      {
        id: 'monitor-loop',
        label: 'Keep the loop running',
        reasoning:
          'The station keeps full cooling while the crew watches the pressure. Ammonia is toxic, and a line that keeps losing coolant may fail completely.',
        effects: { power: -14, water: -6 },
        scoreDelta: -10,
        outcome:
          'Pressure keeps falling. The crew shuts down experiments and isolates the loop anyway, now with less coolant and a bigger cleanup.',
      },
    ],
    realWorld: {
      summary:
        'The ISS uses ammonia in its external cooling loops. From 2011 to 2017, crews and ground teams tracked external ammonia leaks. In May 2013, astronauts made an unplanned spacewalk after flakes were seen near a pump module. Later, NASA\'s Robotic External Leak Locator helped trace a persistent leak to radiator jumper hoses, which were isolated and replaced.',
      source: {
        title: 'ISS Port 1 External Cooling System Ammonia Leak',
        url: 'https://ntrs.nasa.gov/citations/20190029027',
      },
    },
  },
  {
    id: 'iss-debris-arm',
    missionId: 'iss',
    title: 'A hole in the robotic arm',
    met: 'MET 26:30',
    metMinutes: 1590,
    severity: 'caution',
    phase: 'Low Earth orbit · robotic arm inspection',
    alarm: 'DEBRIS IMPACT · CANADARM2 BOOM B',
    briefing:
      'During a routine inspection, the crew finds a small hole in the boom of the station\'s robotic arm. The arm still moves and the joint sensors read normal, but no one knows whether the impact damaged a cable inside. The arm is scheduled to capture a cargo craft in 36 hours.',
    options: [
      {
        id: 'inspect-and-continue',
        label: 'Inspect with cameras and keep working',
        reasoning:
          'Photos and a low-load test can show whether the arm is safe. Keeping the arm in service protects the cargo schedule, but the damage stays in use.',
        effects: { spares: -2 },
        scoreDelta: 12,
        outcome:
          'The arm passes a low-load test. Operators photograph the hole at every shift and keep it in service for the cargo capture.',
      },
      {
        id: 'ground-the-arm',
        label: 'Ground the arm and use the backup',
        reasoning:
          'Taking the arm out of service avoids loading a damaged boom. The backup arm is slower to set up and the capture may slip.',
        effects: { fuel: -8, spares: -6 },
        scoreDelta: 4,
        outcome:
          'The backup arm takes over. The cargo capture moves one orbit later, but the damaged boom is not loaded.',
      },
      {
        id: 'full-speed',
        label: 'Run the arm at full speed',
        reasoning:
          'The arm is still working, so the schedule can stay on plan. A damaged cable or joint could fail under a heavy load.',
        effects: { power: -6, spares: -4 },
        scoreDelta: -12,
        outcome:
          'The arm completes one more move, then a joint fault appears. The crew grounds it until a spare boom section arrives.',
      },
    ],
    realWorld: {
      summary:
        'On May 12, 2021, a routine inspection found a hole in the boom of Canadarm2 on the International Space Station. The Canadian Space Agency called it a "lucky strike" because the arm, only about 35 cm (14 in) wide, kept working. NASA and CSA continued operations while gathering data on the impact.',
      source: {
        title: 'Space Station Robotic Arm Hit by Orbital Debris',
        url: 'https://www.space.com/space-station-robot-arm-orbital-debris-strike',
      },
    },
  },
];

export default issProblems;
