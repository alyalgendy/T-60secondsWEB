import type { Fact } from '../types';
import styles from './FactCard.module.css';

export interface FactCardProps {
  fact: Fact;
  /** Optional 0-based position, rendered as a small "Fact 01" label. */
  index?: number;
}

export function FactCard({ fact, index }: FactCardProps) {
  const label =
    typeof index === 'number' ? `Fact ${String(index + 1).padStart(2, '0')}` : null;

  return (
    <article className={styles.card}>
      {label ? (
        <span className={styles.index} aria-hidden="true">
          {label}
        </span>
      ) : null}
      <p className={styles.text}>{fact.text}</p>
      <a
        className={styles.source}
        href={fact.source.url}
        target="_blank"
        rel="noreferrer"
      >
        {fact.source.title}
        <span aria-hidden="true"> ↗</span>
        <span className={styles.srOnly}> (opens in a new tab)</span>
      </a>
    </article>
  );
}
