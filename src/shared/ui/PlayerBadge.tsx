import clsx from 'clsx';
import type { Player } from '../types';
import type { CSSVars } from './cssVars';
import styles from './PlayerBadge.module.css';

export interface PlayerBadgeProps {
  player: Player;
  showName?: boolean;
  size?: 'sm' | 'md';
  muted?: boolean;
  className?: string;
}

export function PlayerBadge({
  player,
  showName = false,
  size = 'md',
  muted = false,
  className,
}: PlayerBadgeProps) {
  const initial = player.name.trim().charAt(0).toUpperCase() || '?';
  const label = `${player.name}${player.isHost ? ', host' : ''}${
    player.connected ? '' : ', disconnected'
  }`;

  return (
    <span
      className={clsx(
        styles.badge,
        styles[size],
        muted && styles.muted,
        !player.connected && styles.offline,
        className,
      )}
      style={{ '--player-color': player.color } as CSSVars}
      title={label}
      aria-label={label}
    >
      <span className={styles.avatar} aria-hidden="true">
        {initial}
      </span>
      {showName ? <span className={styles.name}>{player.name}</span> : null}
      {player.isHost ? (
        <span className={styles.host} aria-label="Host">
          HOST
        </span>
      ) : null}
      <span
        className={clsx(styles.dot, player.connected ? styles.online : styles.off)}
        aria-hidden="true"
      />
    </span>
  );
}
