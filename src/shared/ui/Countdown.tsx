import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './Countdown.module.css';

export interface CountdownProps {
  seconds: number;
  label?: string;
  onComplete?: () => void;
  className?: string;
}

export function Countdown({
  seconds,
  label = 'Time left',
  onComplete,
  className,
}: CountdownProps) {
  const [remaining, setRemaining] = useState(seconds);
  const completedRef = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    completedRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }
    const timer = window.setTimeout(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, onComplete]);

  return (
    <div className={clsx(styles.wrap, remaining === 0 && styles.done, className)}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} aria-live="polite" aria-atomic="true">
        {String(remaining).padStart(2, '0')}
      </span>
    </div>
  );
}
