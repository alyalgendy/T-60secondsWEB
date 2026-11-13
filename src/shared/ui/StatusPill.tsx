import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './StatusPill.module.css';

export type StatusTone = 'ok' | 'warn' | 'danger' | 'info';

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
};

export function StatusPill({
  tone = 'info',
  children,
  icon,
  className,
}: StatusPillProps) {
  return (
    <span className={clsx(styles.pill, styles[tone], className)}>
      <span className={styles.icon} aria-hidden="true">
        {icon ?? DEFAULT_ICON[tone]}
      </span>
      {children}
    </span>
  );
}
