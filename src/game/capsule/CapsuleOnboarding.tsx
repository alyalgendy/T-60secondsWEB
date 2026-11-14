import { useState } from 'react';
import { MarkerSlot } from '../../components/MarkerBadge';
import { TUTORIAL_STEPS } from '../../lib/tutorial';
import type { TutorialStep } from '../../lib/tutorial';
import { getCapsuleMarkers } from './warnings';
import styles from './CapsuleShell.module.css';

const CAPSULE_STEPS = TUTORIAL_STEPS.filter(
  (step) => step.phase === 'capsule-onboarding',
);

export default function CapsuleOnboarding({
  onComplete,
  steps = CAPSULE_STEPS,
}: {
  onComplete: () => void;
  steps?: readonly TutorialStep[];
}) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  if (!step) return null;

  const markers = getCapsuleMarkers({
    warning: null,
    resources: {},
    tutorialStep: {
      anchor: step.anchor,
      index: index + 1,
      total: steps.length,
    },
  });

  const next = () => {
    if (index + 1 >= steps.length) {
      onComplete();
    } else {
      setIndex((current) => current + 1);
    }
  };

  return (
    <div className={styles.onboardingBackdrop}>
      <section
        className={styles.onboardingCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="capsule-guide-title"
        aria-describedby="capsule-guide-body"
      >
        <div
          className={styles.onboardingVisual}
          id={step.anchor}
          data-tutorial-anchor={step.anchor}
          aria-hidden="true"
        >
          {step.visual}
        </div>
        <MarkerSlot markers={markers} anchor={step.anchor} />
        <h2 className={styles.onboardingTitle} id="capsule-guide-title">
          {step.title}
        </h2>
        <p className={styles.onboardingBody} id="capsule-guide-body">
          {step.body}
        </p>
        <footer className={styles.onboardingFooter}>
          <div className={styles.progressDots} aria-label={`Step ${index + 1} of ${steps.length}`}>
            {steps.map((item, stepIndex) => (
              <span
                className={styles.progressDot}
                data-current={stepIndex === index}
                key={item.id}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className={styles.onboardingActions}>
            <button
              className={styles.controlButton}
              type="button"
              onClick={onComplete}
            >
              Skip
            </button>
            <button
              className={styles.controlButton}
              type="button"
              onClick={next}
            >
              {index + 1 === steps.length ? 'Finish' : 'Next'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
