import { useId } from 'react';
import clsx from 'clsx';
import type { Player, ResourceNeed } from '../types';
import type { CSSVars } from './cssVars';
import { toReservePercent } from '../scoring';
import { PlayerBadge } from './PlayerBadge';
import { StatusPill, type StatusTone } from './StatusPill';
import styles from './ResourceSlider.module.css';

export interface ResourceSliderProps {
  need: ResourceNeed;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  editor?: Player | null;
  meId?: string;
  className?: string;
}

function toneFor(need: ResourceNeed, value: number): StatusTone {
  if (value < need.min) return 'danger';
  if (value < need.ideal) return 'warn';
  return 'ok';
}

const TONE_COLOR: Record<StatusTone, string> = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  info: 'var(--accent)',
  neutral: 'var(--text-dim)',
};

export function ResourceSlider({
  need,
  value,
  onChange,
  disabled = false,
  editor,
  meId,
  className,
}: ResourceSliderProps) {
  const inputId = useId();
  const whyId = `${inputId}-why`;
  const tone = toneFor(need, value);
  const percent = toReservePercent(value, need.max);
  const minimum = toReservePercent(need.min, need.max);
  const ideal = toReservePercent(need.ideal, need.max);
  const showEditor = editor && editor.id !== meId;

  return (
    <div className={clsx(styles.row, disabled && styles.disabled, className)}>
      <div className={styles.head}>
        <label className={styles.label} htmlFor={inputId}>
          {need.label}
        </label>
        <div className={styles.right}>
          {showEditor ? (
            <span className={styles.editor}>
              <PlayerBadge player={editor} size="sm" />
              <span>edited</span>
            </span>
          ) : null}
          <StatusPill tone={tone}>
            {tone === 'ok' ? 'Ready' : tone === 'warn' ? 'Low' : 'Critical'}
          </StatusPill>
          <span className={styles.value}>
            {percent}
            <span className={styles.unit}>{need.unit}</span>
          </span>
        </div>
      </div>

      <input
        id={inputId}
        className={styles.range}
        type="range"
        min={0}
        max={need.max}
        step={1}
        value={value}
        disabled={disabled}
        aria-describedby={whyId}
        aria-valuetext={`${percent}${need.unit} of this mission's reserve cap. Minimum ${minimum}${need.unit}, ideal ${ideal}${need.unit}.`}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        style={
          {
            '--fill': `${percent}%`,
            '--tone': TONE_COLOR[tone],
          } as CSSVars
        }
      />

      <div className={styles.scale} aria-hidden="true">
        <span>0{need.unit}</span>
        <span>min {minimum}{need.unit}</span>
        <span>ideal {ideal}{need.unit}</span>
        <span>100{need.unit}</span>
      </div>

      <p className={styles.why} id={whyId}>
        {need.why}
      </p>
    </div>
  );
}
