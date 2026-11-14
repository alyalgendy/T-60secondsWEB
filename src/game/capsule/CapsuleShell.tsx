import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { MarkerSlot } from '../../components/MarkerBadge';
import type { TutorialStep } from '../../lib/tutorial';
import type { MissionId, SystemId } from '../../shared/types';
import { getCapsuleMarkers } from './warnings';
import CapsuleOnboarding from './CapsuleOnboarding';
import { DEFAULT_RESOURCES, RESOURCE_ORDER, ResourceGauge } from './ResourceGauge';
import StarfieldCanvas from './StarfieldCanvas';
import { WarningsProvider, useWarnings } from './WarningsProvider';
import type { CapsuleResources } from './types';
import styles from './CapsuleShell.module.css';

const MISSION_NAMES: Record<MissionId, string> = {
  iss: 'ISS',
  moon: 'MOON',
  mars: 'MARS',
};

const SYSTEM_NAMES: Record<SystemId, string> = {
  engine: 'Engine',
  solar: 'Solar',
  thermal: 'Thermal',
  comms: 'Comms',
  navigation: 'Navigation',
  shield: 'Shield',
};

const SYSTEM_GLYPHS: Record<SystemId, string> = {
  engine: '▲',
  solar: '☼',
  thermal: '◇',
  comms: '⌁',
  navigation: '✣',
  shield: '⬡',
};

function hasCompletedOnboarding(storageKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(storageKey) === 'done';
  } catch {
    return false;
  }
}

function rememberOnboarding(storageKey: string): void {
  try {
    window.localStorage.setItem(storageKey, 'done');
  } catch {
    // The guide still works for this visit when storage is unavailable.
  }
}

function formatCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function WarningAlert({
  warning,
  now,
}: {
  warning: NonNullable<ReturnType<typeof useWarnings>['activeWarning']>;
  now: number;
}) {
  const duration =
    warning.deadlineAt === undefined
      ? 0
      : Math.max(1, warning.deadlineAt - warning.issuedAt);
  const remaining =
    warning.deadlineAt === undefined
      ? 0
      : Math.max(0, warning.deadlineAt - now);
  const ratio = duration > 0 ? remaining / duration : 0;

  return (
    <div
      className={styles.windowWarning}
      data-level={warning.level}
      role="status"
      aria-live="polite"
    >
      {warning.deadlineAt === undefined ? (
        <span className={styles.warningGlyph} data-level={warning.level} aria-hidden="true">
          {SYSTEM_GLYPHS[warning.system]}
        </span>
      ) : (
        <svg
          className={styles.countdownRing}
          data-level={warning.level}
          viewBox="0 0 48 48"
          role="img"
          aria-label={`${SYSTEM_NAMES[warning.system]} ${formatCountdown(remaining)} remaining`}
        >
          <circle className={styles.countdownTrack} cx="24" cy="24" r="21" />
          <circle
            className={styles.countdownValue}
            cx="24"
            cy="24"
            r="21"
            strokeDasharray="132"
            strokeDashoffset={132 * (1 - ratio)}
          />
          <text className={styles.countdownIcon} x="24" y="29" textAnchor="middle">
            {SYSTEM_GLYPHS[warning.system]}
          </text>
        </svg>
      )}
      <span className={styles.warningSystem}>
        {SYSTEM_NAMES[warning.system]}
      </span>
      {warning.deadlineAt !== undefined && (
        <time className={styles.countdown}>
          {formatCountdown(remaining)}
        </time>
      )}
    </div>
  );
}

interface CapsuleInteriorProps {
  missionId: MissionId;
  progress: number;
  resources: CapsuleResources;
  showOnboarding: boolean;
  compactWindow: boolean;
  expandedConsole: boolean;
  onboardingSteps?: readonly TutorialStep[];
  onboardingStorageKey: string;
  children: ReactNode;
}

function CapsuleInterior({
  missionId,
  progress,
  resources,
  showOnboarding,
  compactWindow,
  expandedConsole,
  onboardingSteps,
  onboardingStorageKey,
  children,
}: CapsuleInteriorProps) {
  const { activeWarning, muted, toggleMute } = useWarnings();
  const [now, setNow] = useState(Date.now);
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => showOnboarding && !hasCompletedOnboarding(onboardingStorageKey),
  );
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const planetScale = 0.82 + clampedProgress * 0.34;
  const planetOffset = `${(clampedProgress - 0.5) * 26}vw`;
  const planetStyle: CSSProperties & {
    '--planet-scale': number;
    '--planet-x': string;
  } = {
    '--planet-scale': planetScale,
    '--planet-x': planetOffset,
  };
  const windowMarkers = getCapsuleMarkers({
    warning: activeWarning,
    resources: {},
  });
  const resourceMarkers = getCapsuleMarkers({
    warning: null,
    resources,
  });

  useEffect(() => {
    if (activeWarning?.deadlineAt === undefined) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [activeWarning?.deadlineAt]);

  useEffect(() => {
    if (showOnboarding && !hasCompletedOnboarding(onboardingStorageKey)) {
      setOnboardingOpen(true);
    }
  }, [onboardingStorageKey, showOnboarding]);

  const finishOnboarding = () => {
    rememberOnboarding(onboardingStorageKey);
    setOnboardingOpen(false);
  };

  return (
    <main
      className={`${styles.shell} ${compactWindow ? styles.shellCompact : ''} ${expandedConsole ? styles.shellExpandedConsole : ''}`}
      data-level={activeWarning?.level ?? 'none'}
      data-effect={activeWarning?.effect ?? 'none'}
    >
      <StarfieldCanvas className={styles.starfield} />
      <section className={styles.viewport} aria-label="Space window">
        <div className={styles.windowFrame}>
          <div className={styles.windowGlass}>
            <div className={styles.planetStage} aria-hidden="true">
              <div className={styles.orbit} />
              <div
                className={styles.planet}
                data-planet={missionId}
                style={planetStyle}
              />
            </div>
            <div
              className={styles.effectLayer}
              data-effect={activeWarning?.effect ?? 'none'}
              aria-hidden="true"
            >
              {activeWarning?.effect === 'micrometeoroid' && (
                <svg className={styles.crack} viewBox="0 0 180 220" fill="none">
                  <path
                    d="M92 5 79 58 112 74 75 104 102 125 64 149 76 209M79 58 43 41M112 74 151 52M75 104 30 119M102 125 139 155M64 149 30 190"
                    stroke="rgba(226,246,255,.92)"
                    strokeWidth="1.4"
                  />
                </svg>
              )}
            </div>
            <div className={styles.missionTag}>
              <span className={styles.missionDot} aria-hidden="true" />
              <span>
                {MISSION_NAMES[missionId]} · {Math.round(clampedProgress * 100)}%
              </span>
            </div>
            {activeWarning && (
              <>
                {(activeWarning.level === 'warning' ||
                  activeWarning.level === 'critical') && (
                  <span className={styles.beacon} aria-hidden="true" />
                )}
                <WarningAlert warning={activeWarning} now={now} />
              </>
            )}
            <span className={`${styles.rivet} ${styles.rivetOne}`} />
            <span className={`${styles.rivet} ${styles.rivetTwo}`} />
            <span className={`${styles.rivet} ${styles.rivetThree}`} />
            <span className={`${styles.rivet} ${styles.rivetFour}`} />
            <span className={styles.edgeWarning} aria-hidden="true" />
          </div>
          <MarkerSlot
            markers={windowMarkers}
            anchor="capsule-warning"
            className={styles.markerSlot}
          />
        </div>
      </section>

      <section className={styles.consoleArea} aria-label="Capsule console">
        <header className={styles.consoleBar}>
          <span className={styles.consoleLabel}>Capsule systems</span>
          <div className={styles.controls}>
            <button
              className={styles.controlButton}
              type="button"
              aria-pressed={muted}
              onClick={toggleMute}
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              className={styles.controlButton}
              type="button"
              onClick={() => {
                setOnboardingOpen(true);
                setNow(Date.now());
              }}
            >
              Replay guide
            </button>
          </div>
        </header>
        <div className={styles.stationArea}>{children}</div>
        <div className={styles.resourceArea}>
          <span className={styles.resourceLabel}>Resource rings</span>
          <div className={styles.resourceRail}>
            {RESOURCE_ORDER.map((resource) => (
              <ResourceGauge
                key={resource}
                resource={resource}
                gauge={resources[resource] ?? DEFAULT_RESOURCES[resource]}
              />
            ))}
          </div>
          <MarkerSlot
            markers={resourceMarkers}
            anchor="capsule-resources"
          />
        </div>
      </section>
      {onboardingOpen && (
        <CapsuleOnboarding
          onComplete={finishOnboarding}
          {...(onboardingSteps ? { steps: onboardingSteps } : {})}
        />
      )}
    </main>
  );
}

export interface CapsuleShellProps {
  missionId: MissionId;
  progress?: number;
  resources?: CapsuleResources;
  showOnboarding?: boolean;
  compactWindow?: boolean;
  expandedConsole?: boolean;
  onboardingSteps?: readonly TutorialStep[];
  onboardingStorageKey?: string;
  children: ReactNode;
}

export function CapsuleShell({
  missionId,
  progress = 0.5,
  resources: providedResources = {},
  showOnboarding = false,
  compactWindow = false,
  expandedConsole = false,
  onboardingSteps,
  onboardingStorageKey = 't60.capsule.onboarding.v1',
  children,
}: CapsuleShellProps) {
  const resources: CapsuleResources = {
    ...DEFAULT_RESOURCES,
    ...providedResources,
  };

  return (
    <WarningsProvider>
      <CapsuleInterior
        missionId={missionId}
        progress={progress}
        resources={resources}
        showOnboarding={showOnboarding}
        compactWindow={compactWindow}
        expandedConsole={expandedConsole}
        onboardingSteps={onboardingSteps}
        onboardingStorageKey={onboardingStorageKey}
      >
        {children}
      </CapsuleInterior>
    </WarningsProvider>
  );
}
