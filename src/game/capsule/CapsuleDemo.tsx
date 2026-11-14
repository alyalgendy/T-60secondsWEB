import { useEffect, useRef, useState } from 'react';
import { CapsuleShell, useWarnings } from './index';
import { CAPSULE_DEMO_SCENARIOS } from './demoScenarios';
import {
  WINDOW_EFFECTS,
  WARNING_LEVELS,
} from './types';
import styles from './CapsuleShell.module.css';

const LEVEL_LABELS = {
  advisory: 'Advisory',
  caution: 'Caution',
  warning: 'Warning',
  critical: 'Critical',
} as const;

const EFFECT_LABELS = {
  flare: 'Solar flare',
  micrometeoroid: 'Micrometeoroid',
  static: 'Comms static',
  thermal: 'Thermal',
  engine: 'Engine',
  powerdip: 'Power dip',
} as const;

function DemoControls({
  onProgress,
  progress,
}: {
  onProgress: (progress: number) => void;
  progress: number;
}) {
  const { raiseWarning, clearWarnings } = useWarnings();
  const [index, setIndex] = useState(0);
  const [level, setLevel] = useState(CAPSULE_DEMO_SCENARIOS[0]!.level);
  const [effect, setEffect] = useState(CAPSULE_DEMO_SCENARIOS[0]!.effect);
  const initialized = useRef(false);

  const trigger = (scenarioIndex: number) => {
    const scenario = CAPSULE_DEMO_SCENARIOS[scenarioIndex];
    if (!scenario) return;
    setIndex(scenarioIndex);
    setLevel(scenario.level);
    setEffect(scenario.effect);
    onProgress(
      scenarioIndex / Math.max(1, CAPSULE_DEMO_SCENARIOS.length - 1),
    );
    clearWarnings();
    raiseWarning({ ...scenario, id: 'capsule-demo', countdownSeconds: 60 });
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    trigger(0);
  }, []);

  const triggerSelection = () => {
    const selectionIndex = CAPSULE_DEMO_SCENARIOS.findIndex(
      (scenario) => scenario.level === level && scenario.effect === effect,
    );
    if (selectionIndex >= 0) trigger(selectionIndex);
  };

  const next = () => {
    trigger((index + 1) % CAPSULE_DEMO_SCENARIOS.length);
  };

  return (
    <section className={styles.demoPanel} aria-label="Warning demo controls">
      <p className={styles.demoTitle}>Warning lab</p>
      <p className={styles.demoStatus} aria-live="polite">
        Scenario {index + 1} / {CAPSULE_DEMO_SCENARIOS.length}
      </p>
      <div
        className={styles.demoProgress}
        role="progressbar"
        aria-label="Mission progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div
          className={styles.demoProgressValue}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className={styles.demoSelectors}>
        <label className={styles.demoLabel}>
          Level
          <select
            value={level}
            onChange={(event) => {
              const nextLevel = WARNING_LEVELS.find(
                (item) => item === event.currentTarget.value,
              );
              if (nextLevel) setLevel(nextLevel);
            }}
          >
            {WARNING_LEVELS.map((item) => (
              <option value={item} key={item}>{LEVEL_LABELS[item]}</option>
            ))}
          </select>
        </label>
        <label className={styles.demoLabel}>
          Effect
          <select
            value={effect}
            onChange={(event) => {
              const nextEffect = WINDOW_EFFECTS.find(
                (item) => item === event.currentTarget.value,
              );
              if (nextEffect) setEffect(nextEffect);
            }}
          >
            {WINDOW_EFFECTS.map((item) => (
              <option value={item} key={item}>{EFFECT_LABELS[item]}</option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.demoActions}>
        <button
          className={styles.controlButton}
          type="button"
          onClick={triggerSelection}
        >
          Trigger
        </button>
        <button
          className={styles.controlButton}
          type="button"
          onClick={next}
        >
          Next scenario
        </button>
        <button
          className={styles.controlButton}
          type="button"
          onClick={clearWarnings}
        >
          Clear warning
        </button>
      </div>
    </section>
  );
}

export default function CapsuleDemo() {
  const [progress, setProgress] = useState(0);

  return (
    <CapsuleShell
      missionId="iss"
      progress={progress}
      showOnboarding={false}
    >
      <DemoControls onProgress={setProgress} progress={progress} />
    </CapsuleShell>
  );
}
