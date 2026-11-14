import type { MissionConfig } from "@/game/planning";

/**
 * Moon / Artemis surface sortie.
 *
 * Resource sliders are percentages of the mission-specific reserve cap. Lander
 * capacity and cost are game-balance points, not real spacecraft figures.
 *
 * Facts reflect NASA's published Artemis plan as of late 2026: Artemis III is a
 * crewed demonstration in low Earth orbit; lunar landings begin with Artemis IV.
 */
export const missionConfig: MissionConfig = {
  id: "moon",
  title: "Artemis Surface Sortie",
  destination: "Lunar South Pole",
  goal: "Land the crew near the lunar South Pole, cache supplies for the Moon Base, and bring everyone back to lunar orbit.",
  durationDays: 14,
  massBudget: 84, // fallback budget = smallest lander
  needs: [
    {
      key: "fuel",
      label: "Fuel",
      unit: "%",
      min: 60,
      ideal: 90,
      max: 110,
      massPerUnit: 0.42,
      why: "Descent and ascent burns. Run out and the crew cannot leave the surface.",
    },
    {
      key: "shielding",
      label: "Shielding",
      unit: "%",
      min: 18,
      ideal: 30,
      max: 45,
      massPerUnit: 0.62,
      why: "No atmosphere and no global magnetic field: mass is what stands between the crew and solar radiation.",
    },
    {
      key: "power",
      label: "Power",
      unit: "%",
      min: 25,
      ideal: 40,
      max: 50,
      massPerUnit: 0.3,
      why: "The Sun stays low at the South Pole. Long shadows make every battery and solar panel count.",
    },
    {
      key: "oxygen",
      label: "Oxygen",
      unit: "%",
      min: 20,
      ideal: 30,
      max: 40,
      massPerUnit: 0.22,
      why: "Cabin air for the whole stay, plus reserve for a leak or a stuck hatch.",
    },
    {
      key: "water",
      label: "Water",
      unit: "%",
      min: 18,
      ideal: 28,
      max: 38,
      massPerUnit: 0.26,
      why: "Drinking water, cooling, and the ice-prospecting experiment itself.",
    },
    {
      key: "food",
      label: "Food",
      unit: "%",
      min: 16,
      ideal: 26,
      max: 34,
      massPerUnit: 0.18,
      why: "Two weeks on the surface. Every meal is mass you must land.",
    },
    {
      key: "spares",
      label: "Spares",
      unit: "%",
      min: 8,
      ideal: 16,
      max: 22,
      massPerUnit: 0.32,
      why: "Lunar dust damages seals and filters. A spare is cheaper than an early return.",
    },
  ],
  crafts: [
    {
      id: "starship-hls",
      name: "Starship HLS",
      description:
        "SpaceX's Human Landing System concept for Artemis. The game profile gives it the largest loadout budget, paired with the highest game cost and risk.",
      massCapacity: 108,
      crewCapacity: 4,
      risk: "high",
      cost: 32,
      pros: [
        "Biggest bay: full shielding plus spare supplies for the surface phase",
        "Largest loadout margin if the crew over-provisions",
      ],
      cons: [
        "Needs several tanker flights before it can leave Earth orbit",
        "Highest game-point cost, and the riskiest option in the roster",
      ],
      source: {
        title: "NASA — Human Landing System",
        url: "https://www.nasa.gov/humans-in-space/human-landing-system/",
      },
    },
    {
      id: "blue-moon",
      name: "Blue Moon",
      description:
        "Blue Origin's Human Landing System concept. Game profile: the balanced option — enough bay for every resource line at its ideal, without the top-end risk.",
      massCapacity: 96,
      crewCapacity: 4,
      risk: "medium",
      cost: 22,
      pros: [
        "Lower game-point cost than Starship HLS",
        "Bay fits every resource line at its ideal level",
      ],
      cons: [
        "Smaller bay than Starship HLS",
        "A new lander still has to reach the Moon for the first time",
      ],
      source: {
        title: "NASA — Human Landing System",
        url: "https://www.nasa.gov/humans-in-space/human-landing-system/",
      },
    },
    {
      id: "gateway-staged",
      name: "Gateway-staged lander",
      description:
        "A game concept built around NASA's real Gateway station: a small lander meets the crew in lunar orbit, where supplies are already cached.",
      massCapacity: 84,
      crewCapacity: 4,
      risk: "low",
      cost: 14,
      pros: [
        "Lowest game-point cost of the three",
        "Supplies cached at Gateway reduce launch-day pressure",
      ],
      cons: [
        "Smallest bay: the crew must leave some resource lines below ideal",
        "Depends on Gateway being ready and staffed",
      ],
      source: {
        title: "NASA — Gateway",
        url: "https://www.nasa.gov/mission/gateway/",
      },
    },
  ],
  facts: [
    {
      text: "NASA's current Artemis plan makes Artemis III a 2027 crewed demonstration in low Earth orbit. Lunar landings begin with Artemis IV.",
      source: {
        title: "NASA — Artemis III",
        url: "https://www.nasa.gov/mission/artemis-iii/",
      },
    },
    {
      text: "Permanently shadowed regions near the lunar poles can preserve water ice. NASA missions have found evidence of these materials, but their distribution is complex.",
      source: {
        title: "NASA — The Lunar South Pole Region",
        url: "https://www.nasa.gov/reference/moonbase-environment/",
      },
    },
    {
      text: "At the South Pole the Sun stays low on the horizon. Sunlit ridges can generate solar power for long stretches, while nearby crater floors stay dark and can reach about −334°F (−203°C).",
      source: {
        title: "NASA — The Lunar South Pole Region",
        url: "https://www.nasa.gov/reference/moonbase-environment/",
      },
    },
  ],
};

export const moonFacts = missionConfig.facts;
export default missionConfig;
