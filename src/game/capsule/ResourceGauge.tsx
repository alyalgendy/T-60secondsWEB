import type { ResourceKey } from '../../shared/types';
import type { ResourceGaugeValue } from './types';
import styles from './CapsuleShell.module.css';

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  fuel: 'Fuel',
  power: 'Power',
  oxygen: 'Oxygen',
  water: 'Water',
  food: 'Food',
  shielding: 'Shield',
  spares: 'Spares',
};

const RESOURCE_SHORT: Record<ResourceKey, string> = {
  fuel: 'FUEL',
  power: 'PWR',
  oxygen: 'O₂',
  water: 'H₂O',
  food: 'FOOD',
  shielding: 'SHLD',
  spares: 'SPRS',
};

export const RESOURCE_ORDER: readonly ResourceKey[] = [
  'oxygen',
  'water',
  'food',
  'fuel',
  'power',
  'shielding',
  'spares',
];

export const DEFAULT_RESOURCES: Record<ResourceKey, ResourceGaugeValue> = {
  oxygen: { value: 82, maximum: 100 },
  water: { value: 74, maximum: 100 },
  food: { value: 91, maximum: 100 },
  fuel: { value: 67, maximum: 100 },
  power: { value: 88, maximum: 100 },
  shielding: { value: 100, maximum: 100 },
  spares: { value: 54, maximum: 100 },
};

export function ResourceGauge({
  resource,
  gauge,
}: {
  resource: ResourceKey;
  gauge: ResourceGaugeValue;
}) {
  const maximum = Math.max(0, gauge.maximum);
  const ratio =
    maximum > 0
      ? Math.min(1, Math.max(0, gauge.value / maximum))
      : 0;
  const percentage = Math.round(ratio * 100);
  const strokeOffset = 132 * (1 - ratio);

  return (
    <div
      className={styles.gauge}
      role="meter"
      aria-label={RESOURCE_LABELS[resource]}
      aria-valuemin={0}
      aria-valuemax={maximum}
      aria-valuenow={Math.min(maximum, Math.max(0, gauge.value))}
      data-low={ratio <= 0.2}
    >
      <svg className={styles.gaugeRing} viewBox="0 0 48 48" aria-hidden="true">
        <circle className={styles.gaugeTrack} cx="24" cy="24" r="21" />
        <circle
          className={styles.gaugeValue}
          cx="24"
          cy="24"
          r="21"
          strokeDasharray="132"
          strokeDashoffset={strokeOffset}
        />
      </svg>
      <span className={styles.gaugeShort}>{RESOURCE_SHORT[resource]}</span>
      <span className={styles.gaugePercent}>{percentage}%</span>
    </div>
  );
}
