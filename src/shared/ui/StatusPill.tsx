import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './StatusPill.module.css';

export type StatusTone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

export interface StatusPillProps {
  tone?: StatusTone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const DEFAULT_ICON: Record<StatusTone, string> = {
  ok: '✓',
  warn: '!',
  danger: '×',
  info: 'i',
  neutral: '·',
};

export function StatusPill({
  tone = 'info',
  children,
  icon,
  className,
}: StatusPillProps) {
  const styleTone = tone === 'neutral' ? 'info' : tone;
  return (
    <span className={clsx(styles.pill, styles[styleTone], className)}>
      <span className={styles.icon} aria-hidden="true">
        {icon ?? DEFAULT_ICON[tone]}
      </span>
      {children}
    </span>
  );
}
