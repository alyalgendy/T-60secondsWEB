# Decision problem content

One file per mission:

- `problems.iss.ts`
- `problems.moon.ts`
- `problems.mars.ts`

Each file exports a default `DecisionProblem[]` (at least 3 problems). The
router discovers the files automatically. Example:

```ts
import type { DecisionProblem } from '../shared/types';

const problems: DecisionProblem[] = [
  {
    id: 'iss-flare-1',
    missionId: 'iss',
    title: 'A solar flare is coming',
    briefing: '…',
    options: [
      {
        id: 'wait',
        label: 'Wait and monitor',
        reasoning: '…',
        effects: { power: -2, oxygen: -1 },
        scoreDelta: 2,
        outcome: '…',
      },
      // exactly 3 options
    ],
    realWorld: {
      summary: '…',
      source: { title: 'NASA — …', url: 'https://…' },
    },
  },
];

export default problems;
```

Rules:

- Exactly 3 options per problem, with different trade-offs. No obviously
  correct option at first glance.
- `effects` are game units. Negative numbers remove units. Only include keys
  the problem actually affects.
- `scoreDelta` is between -20 and +20.
- `realWorld.source` must be a real NASA or ESA page you have opened and read.
  Do not invent details the page does not state.
- Keep the schema strict: the game reads these objects directly.
