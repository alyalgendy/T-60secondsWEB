import { useState } from 'react';
import { MarkerSlot } from '../../components/MarkerBadge';
import { useTutorialAnchor } from '../../components/TutorialProvider';
import { CapsuleShell } from '../../game/capsule';
import { getV2Markers } from '../../lib/markers';
import type { StaticAnchorId } from '../../lib/anchors';
import { TUTORIAL_STEPS } from '../../lib/tutorial';
import type { MissionId, Player } from '../../shared/types';
import { useDesign } from '../../shared/hooks/useDesign';
import styles from './V2Placeholder.module.css';

export type V2Phase = 'design' | 'mission';

const COPY: Record<
  V2Phase,
  { anchor: StaticAnchorId; label: string; title: string; description: string }
> = {
  design: {
    anchor: 'v2-design',
    label: 'Mission design',
    title: 'Design console',
    description: 'Mission planning is being prepared for this crew.',
  },
  mission: {
    anchor: 'v2-mission',
    label: 'Mission flight',
    title: 'Flight deck',
    description: 'Cooperative flight systems are being prepared for this crew.',
  },
};

interface V2PlaceholderProps {
  phase: V2Phase;
  roomCode: string;
  missionId: MissionId;
  me: Player;
  players: Player[];
  onContinue: () => void;
}

export default function V2Placeholder({
  phase,
  roomCode,
  missionId,
  me,
  players,
  onContinue,
}: V2PlaceholderProps) {
  const copy = COPY[phase];
  const active = useTutorialAnchor(copy.anchor);
  const markers = getV2Markers(phase, players.length);
  const tutorial = TUTORIAL_STEPS.find((step) => step.phase === `v2-${phase}`);
  const [showTutorial, setShowTutorial] = useState(true);
  const design = useDesign({ roomCode, missionId });

  return (
    <CapsuleShell
      missionId={missionId}
      progress={phase === 'design' ? 0.18 : 0.52}
      showOnboarding={phase === 'mission'}
    >
      <section className={styles.console} data-tutorial-active={active} aria-labelledby="v2-title">
        <p className={styles.eyebrow}>
          {copy.label} / {missionId.toUpperCase()}
        </p>
        <h1 className={styles.title} id="v2-title">{copy.title}</h1>
        <p className={styles.description}>{copy.description}</p>
        {phase === 'mission' && design.state && (
          <div className={styles.description} aria-label="Saved mission design">
            Design locked: {design.state.objectiveIds.length} objectives,{' '}
            {Object.keys(design.state.installedModules ?? {}).length} systems installed.
          </div>
        )}
        <MarkerSlot markers={markers} anchor={copy.anchor} />
        {tutorial && (
          <aside className={styles.guide} aria-label="Mission guide">
            {showTutorial && (
              <>
                <h2 className={styles.guideTitle}>{tutorial.title}</h2>
                <p className={styles.guideBody}>{tutorial.body}</p>
              </>
            )}
            <button
              className={styles.guideToggle}
              type="button"
              onClick={() => setShowTutorial((visible) => !visible)}
            >
              {showTutorial ? 'Skip guide' : 'Replay guide'}
            </button>
          </aside>
        )}
        <p className={styles.crew}>
          Room {roomCode} · {players.length} crew · {me.name}
        </p>
        <button className={styles.continue} type="button" onClick={onContinue}>
          Continue
        </button>
      </section>
    </CapsuleShell>
  );
}
