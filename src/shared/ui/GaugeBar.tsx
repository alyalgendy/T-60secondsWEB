import clsx from 'clsx';
import type { CSSVars } from './cssVars';
import styles from './GaugeBar.module.css';

export type GaugeTone = 'ok' | 'warn' | 'danger' | 'info';

export interface GaugeBarProps {
  label: string;
  value: number;
  max: number;
  min?: number;
  ideal?: number;
  unit?: string;
  tone?: GaugeTone;
  compact?: boolean;
  className?: string;
}

function toneFor(
  value: number,
  min: number | undefined,
  ideal: number | undefined,
): GaugeTone {
  if (min !== undefined && value < min) return 'danger';
  if (ideal !== undefined && value < ideal) return 'warn';
  return 'ok';
}

function toneLabel(
  value: number,
  min: number | undefined,
  ideal: number | undefined,
): string {
  if (min !== undefined && value < min) return 'Below min';
  if (ideal !== undefined && value < ideal) return 'Below ideal';
  return 'OK';
}

export function GaugeBar({
  label,
  value,
  max,
  min,
  ideal,
  unit = 'units',
  tone,
  compact = false,
  className,
}: GaugeBarProps) {
  const safeMax = Math.max(1, max);
  const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const resolvedTone = tone ?? toneFor(value, min, ideal);
  const stateLabel = toneLabel(value, min, ideal);
  const minPercent = min !== undefined ? (min / safeMax) * 100 : null;
  const idealPercent = ideal !== undefined ? (ideal / safeMax) * 100 : null;

  return (
    <div
      className={clsx(
        styles.gauge,
        styles[resolvedTone],
        compact && styles.compact,
        className,
      )}
      role="progressbar"
      aria-label={`${label}: ${value} of ${max} ${unit}, ${stateLabel}`}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={styles.readout}>
          <strong>{Math.round(value * 10) / 10}</strong>
          <span className={styles.unit}> / {max} {unit}</span>
        </span>
      </div>

      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ '--fill': `${percent}%` } as CSSVars}
        />
        {minPercent !== null ? (
          <span
            className={clsx(styles.marker, styles.minMarker)}
            style={{ '--marker': `${minPercent}%` } as CSSVars}
            title={`Minimum ${min}`}
          />
        ) : null}
        {idealPercent !== null ? (
          <span
            className={clsx(styles.marker, styles.idealMarker)}
            style={{ '--marker': `${idealPercent}%` } as CSSVars}
            title={`Ideal ${ideal}`}
          />
        ) : null}
      </div>

      {!compact ? (
        <div className={styles.foot}>
          <span className={styles.state}>{stateLabel}</span>
          {min !== undefined ? <span>min {min}</span> : null}
          {ideal !== undefined ? <span>ideal {ideal}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
