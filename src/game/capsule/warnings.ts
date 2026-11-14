import type { Marker } from '../../lib/markers';
import type { StaticAnchorId } from '../../lib/anchors';
import type {
  CapsuleResources,
  CapsuleWarning,
  WarningLevel,
} from './types';
import type { ResourceKey } from '../../shared/types';

const LEVEL_PRIORITY: Record<WarningLevel, number> = {
  advisory: 0,
  caution: 1,
  warning: 2,
  critical: 3,
};

const SYSTEM_LABELS: Record<CapsuleWarning['system'], string> = {
  engine: 'Engine',
  solar: 'Solar',
  thermal: 'Thermal',
  comms: 'Comms',
  navigation: 'Navigation',
  shield: 'Shield',
};

const RESOURCE_KEYS: readonly ResourceKey[] = [
  'fuel',
  'power',
  'oxygen',
  'water',
  'food',
  'shielding',
  'spares',
];

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  fuel: 'Fuel',
  power: 'Power',
  oxygen: 'Oxygen',
  water: 'Water',
  food: 'Food',
  shielding: 'Shielding',
  spares: 'Spares',
};

export function selectPrimaryWarning(
  warnings: readonly CapsuleWarning[],
): CapsuleWarning | null {
  return (
    [...warnings].sort(
      (left, right) =>
        LEVEL_PRIORITY[right.level] - LEVEL_PRIORITY[left.level] ||
        right.issuedAt - left.issuedAt,
    )[0] ?? null
  );
}

export function getCapsuleMarkers(input: {
  warning: CapsuleWarning | null;
  resources: CapsuleResources;
  tutorialStep?: {
    anchor: StaticAnchorId;
    index: number;
    total: number;
  };
}): Marker[] {
  const markers: Marker[] = [];

  if (input.warning) {
    const severity =
      input.warning.level === 'advisory'
        ? 'info'
        : input.warning.level === 'caution'
          ? 'attention'
          : 'critical';
    markers.push({
      id: `capsule-${input.warning.id}`,
      anchor: 'capsule-warning',
      kind: 'state',
      severity,
      label: `${input.warning.level} ${SYSTEM_LABELS[input.warning.system]}`,
    });
  }

  for (const resource of RESOURCE_KEYS) {
    const gauge = input.resources[resource];
    if (!gauge || gauge.maximum <= 0) continue;
    const ratio = gauge.value / gauge.maximum;
    if (ratio > 0.2) continue;
    markers.push({
      id: `capsule-resource-${resource}`,
      anchor: 'capsule-resources',
      kind: 'state',
      severity: ratio <= 0.1 ? 'critical' : 'attention',
      label: `${RESOURCE_LABELS[resource]} low`,
    });
  }

  if (input.tutorialStep) {
    markers.push({
      id: `capsule-guide-${input.tutorialStep.index}`,
      anchor: input.tutorialStep.anchor,
      kind: 'context',
      severity: 'info',
      label: `Guide ${input.tutorialStep.index} of ${input.tutorialStep.total}`,
    });
  }

  return markers;
}
