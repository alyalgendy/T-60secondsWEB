import clsx from 'clsx';
import type { Player } from '../types';
import { PlayerBadge } from './PlayerBadge';
import styles from './ReadyBar.module.css';

export interface ReadyBarProps {
  players: Player[];
  readyPlayerIds: string[];
  meId?: string;
  className?: string;
}

export function ReadyBar({
  players,
  readyPlayerIds,
  meId,
  className,
}: ReadyBarProps) {
  const readyCount = players.filter((player) =>
    readyPlayerIds.includes(player.id),
  ).length;
  const allReady = players.length > 0 && readyCount === players.length;

  return (
    <div
      className={clsx(styles.wrap, allReady && styles.allReady, className)}
      aria-live="polite"
    >
      <div className={styles.head}>
        <span className={styles.title}>Locked in</span>
        <span className={styles.count}>
          {readyCount} / {players.length}
        </span>
      </div>
      <div className={styles.list}>
        {players.map((player) => {
          const ready = readyPlayerIds.includes(player.id);
          return (
            <span
              key={player.id}
              className={clsx(
                styles.slot,
                ready && styles.ready,
                player.id === meId && styles.me,
              )}
            >
              <PlayerBadge player={player} size="sm" showName />
              <span className={styles.state} aria-label={ready ? 'Locked in' : 'Not ready'}>
                {ready ? '✓' : '○'}
              </span>
            </span>
          );
        })}
      </div>
      <p className={styles.note}>
        {allReady
          ? 'Everyone is ready. The host can launch.'
          : 'Everyone must lock their plan before launch.'}
      </p>
    </div>
  );
}
