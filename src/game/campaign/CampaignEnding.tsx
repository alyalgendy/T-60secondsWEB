import { useCallback, useEffect, useMemo, useState } from 'react';
import { MarkerSlot } from '../../components/MarkerBadge';
import { useTutorialAnchor } from '../../components/TutorialProvider';
import { CapsuleShell } from '../capsule';
import { getMissionV2Content } from '../../content/missions-v2';
import { getCampaignMarkers } from '../../lib/markers';
import { useMission } from '../../shared/hooks/useMission';
import { MISSION_IDS } from '../../shared/constants';
import { TUTORIAL_STEPS } from '../../lib/tutorial';
import type { MissionId, MissionState, Player } from '../../shared/types';
import styles from './CampaignEnding.module.css';

interface CampaignEndingProps {
  roomCode: string;
  me: Player;
  players: Player[];
}

type Outcomes = Partial<Record<MissionId, MissionState | null>>;

export default function CampaignEnding({
  roomCode,
  me,
  players,
}: CampaignEndingProps) {
  const [outcomes, setOutcomes] = useState<Outcomes>({});
  const receiveState = useCallback((missionId: MissionId, state: MissionState | null) => {
    setOutcomes((current) =>
      current[missionId] === state ? current : { ...current, [missionId]: state },
    );
  }, []);
  const complete = MISSION_IDS.every((id) => outcomes[id] !== undefined);
  const delivered =
    complete &&
    MISSION_IDS.every((id) => outcomes[id]?.outcome === 'won');
  const markers = useMemo(() => getCampaignMarkers(outcomes), [outcomes]);
  const sources = useMemo(() => {
    const sourcesByUrl = new Map<string, { title: string; url: string }>();
    for (const missionId of MISSION_IDS) {
      const content = getMissionV2Content(missionId);
      for (const note of Object.values(content.eventResearch)) {
        sourcesByUrl.set(note.source.url, note.source);
      }
      for (const analog of content.analogMissions) {
        sourcesByUrl.set(analog.source.url, analog.source);
      }
    }
    return [...sourcesByUrl.values()];
  }, []);
  const active = useTutorialAnchor('campaign-ending');
  const [showGuide, setShowGuide] = useState(true);
  const tutorial = TUTORIAL_STEPS.find((step) => step.id === 'campaign-ending');

  return (
    <CapsuleShell missionId="mars" progress={1} compactWindow>
      {MISSION_IDS.map((missionId) => (
        <MissionOutcomeReader
          key={missionId}
          missionId={missionId}
          roomCode={roomCode}
          playerId={me.id}
          isHost={me.isHost}
          onState={receiveState}
        />
      ))}
      <main className={styles.ending} aria-labelledby="campaign-title">
        <p className={styles.eyebrow}>MISSION CONTROL · CAMPAIGN RECORD</p>
        <h1 id="campaign-title">
          {delivered ? 'Cure delivered' : complete ? 'Campaign ended' : 'Receiving flight records'}
        </h1>
        <p className={styles.summary} role="status" aria-live="polite">
          {delivered
            ? 'The crew completed all three missions and delivered the cure payload to Mars.'
            : complete
              ? 'At least one mission ended without success. The cure was not delivered.'
              : 'Checking the saved outcome for each mission.'}
        </p>
        <div className={styles.legs} aria-label="Campaign mission outcomes">
          {MISSION_IDS.map((missionId) => {
            const state = outcomes[missionId];
            const content = getMissionV2Content(missionId);
            return (
              <article
                className={styles.leg}
                data-outcome={state?.outcome ?? 'pending'}
                key={missionId}
              >
                <span aria-hidden="true">
                  {state?.outcome === 'won' ? '✓' : state?.outcome === 'lost' ? '×' : '◌'}
                </span>
                <div>
                  <h2>{content.name}</h2>
                  <p>
                    {state
                      ? state.outcome === 'won'
                        ? `Won · attempt ${state.attempt}`
                        : `Lost · attempt ${state.attempt}`
                      : complete
                        ? 'No flight record'
                        : 'Loading outcome'}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
        <section className={styles.credits} aria-labelledby="credits-title">
          <h2 id="credits-title">Mission credits</h2>
          <p>Mission research sources. Game units are fictional, not engineering guidance.</p>
          <ul>
            {sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
          <p>Mission Viz technique reimplemented from scratch. NASA does not endorse this project.</p>
        </section>
        {tutorial && (
          <aside aria-label="Campaign guide" data-tutorial-active={active}>
            {showGuide && (
              <>
                <h2>{tutorial.title}</h2>
                <p>{tutorial.body}</p>
              </>
            )}
            <button type="button" onClick={() => setShowGuide((visible) => !visible)}>
              {showGuide ? 'Skip guide' : 'Replay guide'}
            </button>
          </aside>
        )}
        <MarkerSlot markers={markers} anchor="campaign-ending" />
        <p className={styles.crew}>
          Room {roomCode} · {players.length} crew · {me.name}
        </p>
      </main>
    </CapsuleShell>
  );
}

function MissionOutcomeReader({
  missionId,
  roomCode,
  playerId,
  isHost,
  onState,
}: {
  missionId: MissionId;
  roomCode: string;
  playerId: string;
  isHost: boolean;
  onState: (missionId: MissionId, state: MissionState | null) => void;
}) {
  const mission = useMission({ roomCode, missionId, playerId, isHost });
  useEffect(() => {
    if (!mission.loading) onState(missionId, mission.state);
  }, [mission.loading, mission.state, missionId, onState]);
  return null;
}
