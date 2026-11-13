import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './HudPanel.module.css';

export interface HudPanelProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  scroll?: boolean;
}

export function HudPanel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  scroll = false,
}: HudPanelProps) {
  return (
    <section className={clsx(styles.panel, className)}>
      <span className={clsx(styles.corner, styles.tl)} aria-hidden="true" />
      <span className={clsx(styles.corner, styles.tr)} aria-hidden="true" />
      <span className={clsx(styles.corner, styles.bl)} aria-hidden="true" />
      <span className={clsx(styles.corner, styles.br)} aria-hidden="true" />

      {title || actions ? (
        <header className={styles.header}>
          <div className={styles.titles}>
            {title ? <h2 className={styles.title}>{title}</h2> : null}
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </header>
      ) : null}

      <div
        className={clsx(styles.body, scroll && styles.scroll, bodyClassName)}
      >
        {children}
      </div>
    </section>
  );
}
