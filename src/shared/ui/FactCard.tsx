import type { Fact } from '../types';
import styles from './FactCard.module.css';

export interface FactCardProps {
  fact: Fact;
}

export function FactCard({ fact }: FactCardProps) {
  return (
    <article className={styles.card}>
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
