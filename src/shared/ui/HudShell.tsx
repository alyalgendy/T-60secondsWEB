import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import type { Player } from '../types';
import { PlayerBadge } from './PlayerBadge';
import styles from './HudShell.module.css';

export interface HudShellProps {
  children: ReactNode;
  missionName?: string;
  stepLabel?: string;
  roomCode?: string;
  players?: Player[];
  me?: Player | null;
  className?: string;
}

/**
 * Every scene renders inside HudShell. It owns the page chrome: brand, mission
 * name, current step, room code and the four player badges.
 */
export function HudShell({
  children,
  missionName = 'Mission Control',
  stepLabel,
  roomCode,
  players = [],
  me,
  className,
}: HudShellProps) {
  const [copied, setCopied] = useState(false);

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
        <div className={styles.brand}>
          <span className={styles.mark}>T-60</span>
          <span className={styles.brandText}>NASA Space Apps</span>
        </div>

        <div className={styles.mission}>
          <span className={styles.missionName}>{missionName}</span>
          {stepLabel ? <span className={styles.step}>{stepLabel}</span> : null}
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
