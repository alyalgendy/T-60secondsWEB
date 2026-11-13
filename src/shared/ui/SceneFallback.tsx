import { HudButton } from './HudButton';
import { HudPanel } from './HudPanel';
import { HudShell } from './HudShell';
import { StatusPill } from './StatusPill';
import type { FlowStep, Player } from '../types';
import { STEP_LABELS, getNextStep, missionFromStep } from '../flow';
import { MISSION_NAMES } from '../constants';
import styles from './SceneFallback.module.css';

export interface SceneFallbackProps {
  step: FlowStep;
  roomCode: string;
  me: Player;
  players: Player[];
  reason?: string;
  onSkip?: () => void;
}

export function PlaceholderScene({
  step,
  roomCode,
  me,
  players,
  reason,
  onSkip,
}: SceneFallbackProps) {
  const mission = missionFromStep(step);
  const nextStep = getNextStep(step);
  const missionName = mission ? MISSION_NAMES[mission] : 'Mission Control';

  return (
    <HudShell
      missionName={missionName}
      stepLabel={STEP_LABELS[step]}
      roomCode={roomCode}
      players={players}
      me={me}
    >
      <div className={styles.center}>
        <HudPanel title="Scene under construction" className={styles.panel}>
          <StatusPill tone="info">Team build in progress</StatusPill>
          <p className={styles.lead}>
            This step is not connected yet. The shared shell, lobby and data
            contract are ready, so the scene can be dropped into its folder and
            will appear here automatically.
          </p>
          <dl className={styles.meta}>
            <div>
              <dt>Current step</dt>
              <dd>{step}</dd>
            </div>
            <div>
              <dt>Next step</dt>
              <dd>{nextStep}</dd>
            </div>
          </dl>
          {reason ? <p className={styles.reason}>{reason}</p> : null}

          {me.isHost && onSkip ? (
            <div className={styles.actions}>
              <HudButton variant="primary" onClick={onSkip}>
                Skip step (dev)
              </HudButton>
              <span className={styles.hint}>
                Host-only. Useful while the other scenes are being built.
              </span>
            </div>
          ) : (
            <p className={styles.hint}>Waiting for the host to continue.</p>
          )}
        </HudPanel>
      </div>
    </HudShell>
  );
}

export interface LoadingSceneProps {
  label?: string;
  players?: Player[];
  me?: Player | null;
  roomCode?: string;
}

export function LoadingScene({
  label = 'Linking to mission control…',
  players = [],
  me = null,
  roomCode,
}: LoadingSceneProps) {
  return (
    <HudShell roomCode={roomCode} players={players} me={me}>
      <div className={styles.center}>
        <div className={styles.loading} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          <span>{label}</span>
        </div>
      </div>
    </HudShell>
  );
}

export interface ErrorSceneProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  players?: Player[];
  me?: Player | null;
  roomCode?: string;
}

export function ErrorScene({
  title = 'Connection problem',
  message,
  onRetry,
  players = [],
  me = null,
  roomCode,
}: ErrorSceneProps) {
  return (
    <HudShell roomCode={roomCode} players={players} me={me}>
      <div className={styles.center}>
        <HudPanel title={title} className={styles.panel}>
          <StatusPill tone="danger">Action needed</StatusPill>
          <p className={styles.lead}>{message}</p>
          {onRetry ? (
            <div className={styles.actions}>
              <HudButton variant="primary" onClick={onRetry}>
                Try again
              </HudButton>
            </div>
          ) : null}
        </HudPanel>
      </div>
    </HudShell>
  );
}
