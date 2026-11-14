import type { Source } from '../shared/types';

export interface EventResearchNote {
  whatReallyHappened: readonly [string, string];
  source: Source;
}

export interface AnalogMission {
  id: string;
  title: string;
  summary: string;
  source: Source;
}

export const ISS_EVENT_RESEARCH: Readonly<Record<string, EventResearchNote>> = {
  'iss-event-flare': {
    whatReallyHappened: [
      'NASA describes solar flares and related solar activity as space weather that affects astronauts in space.',
      'The solar-array alarm and repair in this game are fictional.',
    ],
    source: {
      title: 'NASA Space Weather',
      url: 'https://science.nasa.gov/heliophysics/focus-areas/space-weather/',
    },
  },
  'iss-event-comms': {
    whatReallyHappened: [
      'During Apollo 13, a shift in the High Gain Antenna signal and crackle in the radio stream were among the first clues to an onboard emergency.',
      'Our simulated communications fault is fictional and does not recreate that incident.',
    ],
    source: {
      title: 'Apollo 13: Houston, We’ve Had a Problem',
      url: 'https://www.nasa.gov/history/houston-weve-had-a-problem/',
    },
  },
  'iss-event-thermal': {
    whatReallyHappened: [
      'Apollo 13’s oxygen-tank explosion disabled fuel cells, threatening electrical power and water.',
      'The crew used the Lunar Module as a lifeboat; this game’s thermal-loop event is fictional.',
    ],
    source: {
      title: 'Apollo 13: The Successful Failure',
      url: 'https://www.nasa.gov/missions/apollo/apollo-13-the-successful-failure/',
    },
  },
};

export const ANALOG_MISSIONS: readonly AnalogMission[] = [
  {
    id: 'apollo-13',
    title: 'Apollo 13',
    summary:
      'After an oxygen-tank explosion forced the crew to abandon its planned Moon landing, the team used the Lunar Module as a lifeboat.',
    source: {
      title: 'Apollo 13: The Successful Failure',
      url: 'https://www.nasa.gov/missions/apollo/apollo-13-the-successful-failure/',
    },
  },
  {
    id: 'iss',
    title: 'International Space Station',
    summary:
      'The station is a crewed orbital laboratory for science and technology research in microgravity.',
    source: {
      title: 'ISS Station Research and Technology',
      url: 'https://www.nasa.gov/international-space-station/space-station-research-and-technology/',
    },
  },
];

export const MOON_EVENT_RESEARCH: Readonly<Record<string, EventResearchNote>> = {
  'moon-array-latch': {
    whatReallyHappened: [
      'NASA’s Lucy spacecraft launched with one solar array that did not fully deploy and latch.',
      'The flight team monitored the array and continued the mission; this lunar repair scenario is fictional.',
    ],
    source: {
      title: 'Lucy Solar Array Anomaly: Animation',
      url: 'https://svs.gsfc.nasa.gov/20366/',
    },
  },
  'moon-comms-pause': {
    whatReallyHappened: [
      'NASA reported that Voyager 1 recovered communication after a brief communications pause.',
      'The relay handover in this game is fictional and does not recreate Voyager’s anomaly.',
    ],
    source: {
      title: 'Voyager 1 Resolves Brief Communications Pause',
      url: 'https://www.jpl.nasa.gov/news/nasas-voyager-1-conserves-power-resolves-brief-communications-pause/',
    },
  },
  'moon-rover-sleep': {
    whatReallyHappened: [
      'NASA’s Mars rover Spirit stopped communicating during a harsh winter and the team tried a “sweep and beep” recovery strategy.',
      'The simulated lunar rover and its wake-up sequence are fictional.',
    ],
    source: {
      title: 'NASA’s Hibernating Mars Rover May Not Call Home',
      url: 'https://www.jpl.nasa.gov/news/nasas-hibernating-mars-rover-may-not-call-home/',
    },
  },
  'moon-rover-fender': {
    whatReallyHappened: [
      'During Apollo 17, astronauts repaired a broken lunar rover fender with maps and tape to limit dust.',
      'The repair choices in this game are simplified for play.',
    ],
    source: {
      title: 'Apollo 17 Lunar Roving Vehicle Fender Extension',
      url: 'https://airandspace.si.edu/collection-objects/maps-fender-extension-lunar-roving-vehicle-apollo-17/nasm_A19760010000',
    },
  },
};

export const MOON_ANALOG_MISSIONS: readonly AnalogMission[] = [
  {
    id: 'apollo-13-moon',
    title: 'Apollo 13',
    summary: 'The crew used the Lunar Module as a lifeboat after an oxygen-tank explosion forced the planned Moon landing to be abandoned.',
    source: {
      title: 'Apollo 13: The Successful Failure',
      url: 'https://www.nasa.gov/missions/apollo/apollo-13-the-successful-failure/',
    },
  },
  {
    id: 'apollo-17-moon',
    title: 'Apollo 17',
    summary: 'The final Apollo lunar landing included rover traverses and an improvised fender repair using maps and tape.',
    source: {
      title: 'Apollo 17 Lunar Roving Vehicle Fender Extension',
      url: 'https://airandspace.si.edu/collection-objects/maps-fender-extension-lunar-roving-vehicle-apollo-17/nasm_A19760010000',
    },
  },
];

export const MARS_EVENT_RESEARCH: Readonly<Record<string, EventResearchNote>> = {
  'mars-safe-mode': {
    whatReallyHappened: [
      'NASA’s New Horizons spacecraft entered safe mode after a 2015 anomaly while approaching Pluto, then used its backup computer to recover.',
      'The Mars arrival event is fictional and does not recreate that incident.',
    ],
    source: {
      title: 'New Horizons Team Responds to Spacecraft Anomaly',
      url: 'https://www.nasa.gov/missions/new-horizons-team-responds-to-spacecraft-anomaly/',
    },
  },
  'mars-comms-silent': {
    whatReallyHappened: [
      'NASA’s IMAGE spacecraft went silent in 2005 and was rediscovered in orbit in 2018.',
      'Engineers had to recreate tools for its old software before attempting recovery; this game’s Mars relay event is fictional.',
    ],
    source: {
      title: 'Latest Updates from NASA on IMAGE Recovery',
      url: 'https://www.nasa.gov/solar-system/latest-updates-from-nasa-on-image-recovery/',
    },
  },
  'mars-radiation-storm': {
    whatReallyHappened: [
      'NASA explains that solar energetic particles can threaten spacecraft systems and astronaut health.',
      'The shelter decision and countdown here are game-balance abstractions, not an operational forecast.',
    ],
    source: {
      title: 'Solar Storms and Flares',
      url: 'https://science.nasa.gov/sun/solar-storms-and-flares/',
    },
  },
  'mars-dust-storm': {
    whatReallyHappened: [
      'A planet-encircling dust storm in 2018 reduced sunlight reaching NASA’s solar-powered Opportunity rover.',
      'The rover stopped communicating, and NASA ended recovery efforts in 2019; this habitat scenario is fictional.',
    ],
    source: {
      title: 'Six Things About Opportunity’s Recovery Efforts',
      url: 'https://www.jpl.nasa.gov/news/six-things-about-opportunitys-recovery-efforts/',
    },
  },
  'mars-probe-stuck': {
    whatReallyHappened: [
      'NASA’s InSight heat probe stalled because the soil did not provide enough friction, and the team used the robotic arm to help.',
      'The simulated crew repair is fictional and simplified.',
    ],
    source: {
      title: 'NASA’s Mars InSight Lander to Push on Top of the Mole',
      url: 'https://www.jpl.nasa.gov/news/nasas-mars-insight-lander-to-push-on-top-of-the-mole/',
    },
  },
};

export const MARS_ANALOG_MISSIONS: readonly AnalogMission[] = [
  {
    id: 'new-horizons',
    title: 'New Horizons',
    summary: 'The spacecraft recovered from safe mode while its team prepared for a distant planetary encounter.',
    source: {
      title: 'New Horizons Team Responds to Spacecraft Anomaly',
      url: 'https://www.nasa.gov/missions/new-horizons-team-responds-to-spacecraft-anomaly/',
    },
  },
  {
    id: 'mars-opportunity',
    title: 'Mars Opportunity',
    summary: 'The solar-powered rover stopped communicating during a planet-encircling dust storm.',
    source: {
      title: 'Six Things About Opportunity’s Recovery Efforts',
      url: 'https://www.jpl.nasa.gov/news/six-things-about-opportunitys-recovery-efforts/',
    },
  },
  {
    id: 'mars-insight',
    title: 'Mars InSight',
    summary: 'The mission team used InSight’s robotic arm to help its heat probe after it stalled in the Martian soil.',
    source: {
      title: 'NASA’s Mars InSight Lander to Push on Top of the Mole',
      url: 'https://www.jpl.nasa.gov/news/nasas-mars-insight-lander-to-push-on-top-of-the-mole/',
    },
  },
];
