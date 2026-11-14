import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { GAME_NAME } from '../constants';
import type { Player } from '../types';
import { PlayerBadge } from './PlayerBadge';
import styles from './HudShell.module.css';

export interface HudShellProps {
  children: ReactNode;
  missionName?: string;
  /** Alias used by some mission scenes. */
  missionTitle?: string;
  stepLabel?: string;
  roomCode?: string;
  players?: Player[];
  me?: Player | null;
  headerAside?: ReactNode;
  className?: string;
}

/**
 * Every scene renders inside HudShell. It owns the page chrome: brand, mission
 * name, current step, room code and the four player badges.
 */
export function HudShell({
  children,
  missionName,
  missionTitle,
  stepLabel,
  roomCode,
  players = [],
  me,
  headerAside,
  className,
}: HudShellProps) {
  const [copied, setCopied] = useState(false);
  const resolvedName = missionName ?? missionTitle ?? 'Mission Control';

  const copyCode = () => {
    if (!roomCode) return;
    void navigator.clipboard
      ?.writeText(roomCode)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => setCopied(false));
  };

  return (
    <div className={clsx(styles.shell, className)}>
      <header className={styles.topbar}>
        <div className={styles.brand} aria-label={GAME_NAME}>
          <span className={styles.mark}>T -60</span>
          <span className={styles.brandText}>seconds</span>
        </div>

        <div className={styles.mission}>
          <span className={styles.missionName}>{resolvedName}</span>
          {stepLabel ? <span className={styles.step}>{stepLabel}</span> : null}
          {headerAside}
        </div>

        <div className={styles.meta}>
          {roomCode ? (
            <button
              type="button"
              className={styles.code}
              onClick={copyCode}
              aria-label={`Copy room code ${roomCode}`}
            >
              <span className={styles.codeLabel}>Room</span>
              <strong>{roomCode}</strong>
              <span className={styles.codeAction}>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          ) : null}
          <div className={styles.players} aria-label="Players in this room">
            {players.map((player) => (
              <PlayerBadge
                key={player.id}
                player={player}
                showName={false}
                muted={me ? player.id !== me.id : false}
              />
            ))}
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>
      <div className={styles.scanlines} aria-hidden="true" />
    </div>
  );
}
