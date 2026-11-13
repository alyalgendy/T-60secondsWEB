import type { MissionIncident } from './incidents';

export const moonProblems: MissionIncident[] = [
  {
    id: 'moon-array-latch',
    missionId: 'moon',
    title: 'Solar array will not latch',
    met: 'MET 00:42',
    metMinutes: 42,
    severity: 'caution',
    phase: 'Translunar coast · power check',
    alarm: 'ARRAY DEPLOY · LATCH NOT CONFIRMED',
    briefing:
      'A lunar cargo lander has arrived in orbit, but one of its solar arrays did not fully deploy and latch. The array still makes power, just less than planned, so the lander cannot start its descent with a comfortable power margin. The team has one pass over the ground station to choose.',
    options: [
      {
        id: 'use-as-is',
        label: 'Use the array as it is',
        reasoning:
          'The array is making some power. Starting the descent now avoids a long wait, but the margin is thin.',
        effects: { power: -10 },
        scoreDelta: 2,
        outcome:
          'The lander starts its descent with a reduced power margin. It reaches the surface, but the low battery limits the first day of work.',
      },
      {
        id: 'gentle-burn',
        label: 'Shake it loose with a gentle burn',
        reasoning:
          'A small thrust could free the latch. It also pushes the lander off its planned path and uses fuel.',
        effects: { fuel: -8, power: -2 },
        scoreDelta: 9,
        outcome:
          'The array swings open and latches. The burn costs fuel and shifts the landing site slightly, but power is back to plan.',
      },
      {
        id: 'wait-for-window',
        label: 'Wait for the next launch window',
        reasoning:
          'Waiting keeps the lander safe and gives the team time to study the array. It also delays the cure work by weeks.',
        effects: { power: -6, food: -4 },
        scoreDelta: -2,
        outcome:
          'The lander waits in orbit. Engineers work out a safer deployment sequence, but the surface mission starts later and the crew eats into its food reserve.',
      },
    ],
    realWorld: {
      summary:
        'NASA\'s Lucy spacecraft launched in October 2021. Shortly after launch, one of its solar arrays failed to fully deploy and latch shut, putting the mission at risk. For months, the flight operations team worked to address the issue, and Lucy continued its journey to the Jupiter Trojans.',
      source: {
        title: 'Lucy Solar Array Anomaly: Animation',
        url: 'https://svs.gsfc.nasa.gov/20366/',
      },
    },
  },
  {
    id: 'moon-comms-pause',
    missionId: 'moon',
    title: 'Silence from the relay',
    met: 'MET 03:18',
    metMinutes: 198,
    severity: 'warning',
    phase: 'Lunar orbit · relay handover',
    alarm: 'COMM LOSS · RELAY SILENT',
    briefing:
      'A communications relay in lunar orbit stops answering. It was healthy an hour ago. The last telemetry showed a power reboot, and now the relay is silent. The next crewed landing depends on this relay to talk to Earth.',
    options: [
      {
        id: 'wait-and-listen',
        label: 'Wait and listen',
        reasoning:
          'Waiting keeps the team from sending a bad command blind. It also uses up the landing window.',
        effects: { power: -4 },
        scoreDelta: 12,
        outcome:
          'After 48 hours the relay answers on its own. One group of thrusters had dropped offline and its backup took over, exactly as the fault protection was designed to do.',
      },
      {
        id: 'blind-reset',
        label: 'Send a reset command blind',
        reasoning:
          'A reset might wake the relay now. Without a signal, the team cannot see whether the command arrived.',
        effects: { spares: -6 },
        scoreDelta: -4,
        outcome:
          'The relay receives the reset but restarts in the same fault. The team loses a spare controller card and still has to wait.',
      },
      {
        id: 'backup-relay',
        label: 'Switch the landing to the backup relay',
        reasoning:
          'The backup relay is healthy, but it has a narrower antenna and less power.',
        effects: { power: -12, fuel: -4 },
        scoreDelta: 4,
        outcome:
          'The landing moves to the backup relay. The link is slower and uses more power, but the landing schedule holds.',
      },
    ],
    realWorld: {
      summary:
        'On Oct. 18-19, 2026, NASA\'s Deep Space Network could not detect a signal from Voyager 1, about 16 billion miles away. The signal returned on Oct. 20. Engineers found that one group of thrusters had gone offline and backups had turned on automatically. Voyager\'s fault protection had put the spacecraft into a safe, stable configuration.',
      source: {
        title: 'NASA\'s Voyager 1 Conserves Power, Resolves Brief Communications Pause',
        url: 'https://www.jpl.nasa.gov/news/nasas-voyager-1-conserves-power-resolves-brief-communications-pause/',
      },
    },
  },
  {
    id: 'moon-apollo13',
    missionId: 'moon',
    title: 'Oxygen tank rupture',
    met: 'MET 06:55',
    metMinutes: 415,
    severity: 'critical',
    phase: 'Translunar coast · cryo stir',
    alarm: 'CRITICAL · OXYGEN TANK 2 RUPTURE',
    briefing:
      'Two days from Earth, a sharp bang shakes the spacecraft. Oxygen tank 2 in the service module has ruptured, and the crew is losing oxygen, electrical power and propulsion. The lunar landing is off. The crew must find a way around the Moon and back to Earth.',
    options: [
      {
        id: 'lm-lifeboat',
        label: 'Use the lunar module as a lifeboat',
        reasoning:
          'The lunar module has its own oxygen, power and engine. Powering down the command module saves its remaining supplies for re-entry.',
        effects: { oxygen: -8, power: -6, water: -4 },
        scoreDelta: 15,
        outcome:
          'The crew moves into the lunar module and powers down the command module. The lander becomes the crew\'s lifeboat for the trip home.',
      },
      {
        id: 'continue-to-land',
        label: 'Continue to the Moon and land',
        reasoning:
          'The landing hardware is still attached and the surface mission is the goal. The lunar module is sized for two people on the surface, not three people for a return trip.',
        effects: { oxygen: -14, power: -12 },
        scoreDelta: -20,
        outcome:
          'The crew keeps the landing option open too long. With oxygen falling, they abort and swing around the Moon with even less margin than before.',
      },
      {
        id: 'direct-return',
        label: 'Fire the main engine for a direct return',
        reasoning:
          'A quick burn could point the spacecraft home. The explosion damaged the service module, and the main engine may not be usable.',
        effects: { fuel: -16, power: -6 },
        scoreDelta: -10,
        outcome:
          'The service module engine is not trusted after the explosion. The crew uses the lunar module engine to set up a free-return path instead.',
      },
    ],
    realWorld: {
      summary:
        'Apollo 13 was 56 hours into its mission on April 13, 1970, when oxygen tank 2 exploded. The crew lost all oxygen in about three hours and used the lunar module as a lifeboat. They looped around the Moon on a free-return trajectory and returned safely.',
      source: {
        title: 'Apollo 13 Accident',
        url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/ap13acc.html',
      },
    },
  },
  {
    id: 'moon-dormant-rover',
    missionId: 'moon',
    title: 'Rover goes quiet for the night',
    met: 'Day 3 · 00:20',
    metMinutes: 4340,
    severity: 'caution',
    phase: 'Lunar surface · rover night watch',
    alarm: 'ROVER LOSS · NO CARRIER',
    briefing:
      'A small rover on the Moon stops calling home as the two-week lunar night begins. Its batteries are cold, and the team thinks it has entered a low-power hibernation. The rover may wake when the Sun returns, but its clock may have stopped.',
    options: [
      {
        id: 'sweep-and-beep',
        label: 'Sweep and beep',
        reasoning:
          'Send a wake-up ping and listen for a reply. It is cheap on the ground but may find nothing.',
        effects: { power: -2 },
        scoreDelta: 12,
        outcome:
          'No answer at first. Weeks later, the rover answers and starts a new wake timer every four hours, just as its fault protection was designed to do.',
      },
      {
        id: 'remote-heaters',
        label: 'Keep the heaters on remotely',
        reasoning:
          'Warm batteries are more likely to wake. Heating a silent rover drains the power it needs to survive.',
        effects: { power: -14 },
        scoreDelta: -7,
        outcome:
          'The rover\'s battery drains further. When the Sun returns, it wakes late and with less power for science.',
      },
      {
        id: 'write-off',
        label: 'Write off the rover and move on',
        reasoning:
          'The team saves time and power for the landing. It also gives up on a rover that might still be alive.',
        effects: { spares: -2 },
        scoreDelta: -2,
        outcome:
          'The team moves on. The rover wakes on its own weeks later, but no one is listening for it at first, and its science data is lost.',
      },
    ],
    realWorld: {
      summary:
        'NASA\'s Mars Exploration Rover Spirit went silent on March 22, 2010, during a harsh Martian winter. The team expected hibernation and used a "sweep and beep" technique to try to reach it. If its battery lost too much power, Spirit\'s clock could stop in a "mission-clock fault"; the rover was designed to wake and listen every four hours.',
      source: {
        title: 'NASA\'s Hibernating Mars Rover May Not Call Home',
        url: 'https://www.jpl.nasa.gov/news/nasas-hibernating-mars-rover-may-not-call-home/',
      },
    },
  },
  {
    id: 'moon-apollo17-fender',
    missionId: 'moon',
    title: 'The rover loses a fender',
    met: 'Day 4 · 00:10',
    metMinutes: 5770,
    severity: 'caution',
    phase: 'Lunar surface · rover traverse 2',
    alarm: 'ROVER DAMAGE · REAR FENDER LOST',
    briefing:
      'On the second rover traverse, a rear fender tears away and lunar dust sprays over the astronauts and the rover\'s batteries. The rover still drives, but dust is coating the suits and radiators. The next geology stop is six kilometres away.',
    options: [
      {
        id: 'map-fender',
        label: 'Tape maps over the opening',
        reasoning:
          'A quick field repair can keep most dust off the crew and equipment. It uses maps and tape, but the rover keeps its range.',
        effects: { spares: -4 },
        scoreDelta: 12,
        outcome:
          'The crew tapes four lunar maps over the fender. The repair holds, and the rover reaches the next stop with far less dust.',
      },
      {
        id: 'slow-return',
        label: 'Drive slowly and skip the stop',
        reasoning:
          'Slowing down reduces the dust cloud. It also cuts the science time and uses more power for the longer drive.',
        effects: { power: -8, food: -2 },
        scoreDelta: 2,
        outcome:
          'The rover crawls back to the lander. The crew skips the stop and spends hours cleaning dust from the suits.',
      },
      {
        id: 'full-speed',
        label: 'Keep driving at full speed',
        reasoning:
          'The schedule stays intact. Dust can clog the rover and coat the crew\'s suits and radiators.',
        effects: { spares: -4, water: -6 },
        scoreDelta: -12,
        outcome:
          'Dust coats the rover and suits. The crew aborts the traverse early and spends the rest of the day cleaning equipment.',
      },
    ],
    realWorld: {
      summary:
        'During Apollo 17 in December 1972, the lunar roving vehicle\'s rear fender broke. Astronauts Eugene Cernan and Harrison Schmitt taped four lunar maps over the opening to keep dust off themselves and the rover. The maps are now in the Smithsonian collection.',
      source: {
        title: 'Maps, Fender Extension, Lunar Roving Vehicle, Apollo 17',
        url: 'https://airandspace.si.edu/collection-objects/maps-fender-extension-lunar-roving-vehicle-apollo-17/nasm_A19760010000',
      },
    },
  },
];

export default moonProblems;
