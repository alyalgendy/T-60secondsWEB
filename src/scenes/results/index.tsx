import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type { BaseSceneProps, MissionId, MissionPlan, Player } from '../../shared/types';
import { HudButton, HudPanel, HudShell, PlayerBadge, StatusPill } from '../../shared/ui';
import styles from './ResultsScene.module.css';

/** Results props are not in Appendix A yet. Requested from M1; see final notes. */
export interface ResultsSceneProps extends BaseSceneProps {
  plans: Partial<Record<MissionId, MissionPlan>>;
  /** Optional decision-phase totals per mission (0-100). Falls back to plan score. */
  decisionScores?: Partial<Record<MissionId, number>>;
  onReplay?: () => void | Promise<void>;
}

interface MissionMeta {
  id: MissionId;
  number: number;
  label: string;
  destination: string;
  goal: string;
}

const MISSIONS: MissionMeta[] = [
  {
    id: 'iss',
    number: 1,
    label: 'ISS',
    destination: 'Low Earth orbit',
    goal: 'Keep the station and its crew running through a crisis in orbit.',
  },
  {
    id: 'moon',
    number: 2,
    label: 'Moon',
    destination: 'Lunar surface',
    goal: 'Reach the Moon and prove the crew can work beyond Earth orbit.',
  },
  {
    id: 'mars',
    number: 3,
    label: 'Mars',
    destination: 'Mars',
    goal: 'Land the cure reactor on Mars and keep the crew alive.',
  },
];

type VerdictTone = 'ok' | 'warn' | 'danger';

interface Verdict {
  tone: VerdictTone;
  headline: string;
  detail: string;
}

function verdictFor(total: number, max: number): Verdict {
  const ratio = max > 0 ? total / max : 0;
  if (ratio >= 0.8) {
    return {
      tone: 'ok',
      headline: 'Cure delivered',
      detail:
        'The reactor reached Mars with the crew and supplies to run it. Mission Control calls this a clean run.',
    };
  }
  if (ratio >= 0.6) {
    return {
      tone: 'ok',
      headline: 'Cure delivered — crew strained',
      detail:
        'The reactor is on Mars, but the crew paid for it in resources and hard calls. The mission holds.',
    };
  }
  if (ratio >= 0.4) {
    return {
      tone: 'warn',
      headline: 'Partial success',
      detail:
        'The cure payload arrived, but the plan leaves the crew short on margin. Mission Control lists the risks below.',
    };
  }
  return {
    tone: 'danger',
    headline: 'Mission at risk',
    detail:
      'The cure run did not meet its minimums. Run the missions again and protect the resources that failed.',
  };
}

function scoreTone(score: number): VerdictTone {
  if (score >= 80) return 'ok';
  if (score >= 60) return 'warn';
  return 'danger';
}

function humanizeId(id: string | null): string {
  if (!id) return 'No craft selected';
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function finalScoreFor(
  mission: MissionId,
  plans: Partial<Record<MissionId, MissionPlan>>,
  decisionScores?: Partial<Record<MissionId, number>>,
): number {
  const decision = decisionScores?.[mission];
  if (typeof decision === 'number' && Number.isFinite(decision)) {
    return Math.max(0, Math.min(100, Math.round(decision)));
  }
  return plans[mission]?.score ?? 0;
}

export default function ResultsScene({
  roomCode,
  me,
  players,
  plans,
  decisionScores,
  onReplay,
}: ResultsSceneProps) {
  const reduceMotion = useReducedMotion();
  const host = players.find((player) => player.isHost) ?? me;

  const rows = useMemo(
    () =>
      MISSIONS.map((mission) => {
        const plan = plans[mission.id];
        const score = finalScoreFor(mission.id, plans, decisionScores);
        return {
          ...mission,
          plan,
          score,
          flown: Boolean(plan),
          tone: plan ? scoreTone(score) : ('danger' as VerdictTone),
        };
      }),
    [plans, decisionScores],
  );

  const total = rows.reduce((sum, row) => sum + row.score, 0);
  const max = MISSIONS.length * 100;
  const flown = rows.filter((row) => row.flown).length;
  const verdict = verdictFor(total, max);
  const strongest = [...rows].sort((a, b) => b.score - a.score)[0];
  const weakest = [...rows].sort((a, b) => a.score - b.score)[0];

  return (
    <HudShell
      missionTitle="Mission Complete"
      stepLabel="Results"
      roomCode={roomCode}
      players={players}
      me={me}
      headerAside={<StatusPill tone={verdict.tone}>{verdict.headline}</StatusPill>}
    >
      <div className={styles.grid}>
        <HudPanel
          title="Final Assessment"
          subtitle="Planning and simulations, all three missions"
          className={styles.hero}
          scroll
        >
          <div className={styles.heroBody}>
            <span className={styles.eyebrow}>Cure run complete</span>
            <h1 className={styles.heroTitle}>{verdict.headline}</h1>
            <p className={styles.heroDetail}>{verdict.detail}</p>

            <motion.div
              className={styles.totalBlock}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className={styles.totalValueRow}>
                <span className={styles.totalValue}>{total}</span>
                <span className={styles.totalMax}>/ {max}</span>
              </div>
              <div className={styles.totalMeter} aria-hidden="true">
                <span
                  className={clsx(styles.totalFill, styles[`fill${capitalize(verdict.tone)}`])}
                  style={{ width: `${Math.round((total / max) * 100)}%` }}
                />
              </div>
              <div className={styles.totalFoot}>
                <span>Total crew score</span>
                <span>
                  {flown} of {MISSIONS.length} missions flown
                </span>
              </div>
            </motion.div>

            <div className={styles.breakdown}>
              {rows.map((row) => (
                <div key={row.id} className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>
                    <span className={styles.breakdownNumber}>{row.number}</span>
                    {row.label}
                  </span>
                  <span className={styles.breakdownTrack} aria-hidden="true">
                    <span
                      className={clsx(
                        styles.breakdownFill,
                        styles[`fill${capitalize(row.tone)}`],
                      )}
                      style={{ width: `${row.score}%` }}
                    />
                  </span>
                  <span className={clsx(styles.breakdownScore, styles[`text${capitalize(row.tone)}`])}>
                    {row.score}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.verdictNotes}>
              <div className={styles.verdictNote}>
                <span className={styles.noteLabel}>Strongest leg</span>
                <p className={styles.noteValue}>
                  {strongest.plan ? `${strongest.label} · ${strongest.score}/100` : 'No mission flown'}
                </p>
              </div>
              <div className={styles.verdictNote}>
                <span className={styles.noteLabel}>Weakest leg</span>
                <p className={styles.noteValue}>
                  {weakest.plan ? `${weakest.label} · ${weakest.score}/100` : 'No mission flown'}
                </p>
              </div>
            </div>

            <p className={styles.accuracyNote}>
              Scores are game points, not a real engineering assessment. Real mission
              facts and sources appear in the simulation debriefs.
            </p>
          </div>
        </HudPanel>

        <div className={styles.missionColumn}>
          {rows.map((row) => (
            <HudPanel
              key={row.id}
              title={`Mission ${row.number} · ${row.label}`}
              subtitle={row.destination}
              className={styles.missionCard}
              bodyClassName={styles.missionBody}
              aside={
                <StatusPill tone={row.flown ? row.tone : 'neutral'}>
                  {row.flown ? `${row.score}/100` : 'Not flown'}
                </StatusPill>
              }
            >
              <p className={styles.missionGoal}>{row.goal}</p>

              <div className={styles.missionScoreRow}>
                <span className={styles.missionScore}>{row.flown ? row.score : '—'}</span>
                <span className={styles.missionScoreMax}>/100</span>
                {decisionScores?.[row.id] !== undefined ? (
                  <span className={styles.scoreSplit}>
                   plan {row.plan?.score ?? 0} · simulation {decisionScores[row.id]}
                  </span>
                ) : null}
              </div>

              <div className={styles.missionMeta}>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>Craft</span>
                  <span className={styles.metaValue}>
                    {row.plan ? humanizeId(row.plan.craftId) : '—'}
                  </span>
                </span>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>Mass</span>
                  <span className={styles.metaValue}>
                    {row.plan ? `${row.plan.massUsed} / ${row.plan.massBudget}` : '—'}
                  </span>
                </span>
              </div>

              <div className={styles.missionFoot}>
                <span className={styles.metaLabel}>Cure chain</span>
                <span
                  className={clsx(
                    styles.chainState,
                    row.flown ? styles.chainDone : styles.chainMissing,
                  )}
                >
                  {row.flown ? '✓ leg complete' : '· not flown'}
                </span>
              </div>
            </HudPanel>
          ))}
        </div>

        <HudPanel
          title="Crew & Next Steps"
          subtitle="Who flew, and what happens now"
          className={styles.crew}
          scroll
        >
          <div className={styles.crewList}>
            <span className={styles.sectionLabel}>Crew manifest</span>
            {players.map((player) => (
              <CrewRow
                key={player.id}
                player={player}
                isMe={player.id === me.id}
                isHost={player.id === host.id}
              />
            ))}
          </div>

          <div className={styles.highlights}>
            <span className={styles.sectionLabel}>Mission highlights</span>
            <ul className={styles.highlightList}>
              <li>
                <span aria-hidden="true">1</span>
                Kept the ISS running through three incidents.
              </li>
              <li>
                <span aria-hidden="true">2</span>
                Worked beyond Earth orbit and reached the Moon.
              </li>
              <li>
                <span aria-hidden="true">3</span>
                Carried the cure reactor to Mars and defended the crew.
              </li>
            </ul>
          </div>

          <div className={styles.replayBox}>
            <span className={styles.sectionLabel}>Fly again</span>
            <p className={styles.replayText}>
              Replay all three missions with the same crew, or return to the lobby to
              change players.
            </p>
            {onReplay ? (
              me.isHost ? (
                <HudButton variant="primary" onClick={() => void onReplay()}>
                  Replay missions
                </HudButton>
              ) : (
                <p className={styles.waitNote} aria-live="polite">
                  Waiting for {host.name} to start a replay.
                </p>
              )
            ) : (
              <p className={styles.waitNote}>
                The room host can start a new run from the lobby.
              </p>
            )}
          </div>

          <div className={styles.credits}>
            <span className={styles.sectionLabel}>Sources</span>
            <p className={styles.creditsText}>
              Mission facts are drawn from NASA and ESA sources cited in each simulation
              debrief. T -60 seconds is a game; game units and scores are not real
              engineering data.
            </p>
          </div>
        </HudPanel>
      </div>
    </HudShell>
  );
}

interface CrewRowProps {
  player: Player;
  isMe: boolean;
  isHost: boolean;
}

function CrewRow({ player, isMe, isHost }: CrewRowProps) {
  return (
    <div className={clsx(styles.crewRow, !player.connected && styles.crewOffline)}>
      <PlayerBadge player={player} showName />
      <span className={styles.crewTags}>
        {isMe ? <span className={styles.tagMe}>you</span> : null}
        {isHost ? <span className={styles.tagHost}>host</span> : null}
        {!player.connected ? <span className={styles.tagOffline}>offline</span> : null}
      </span>
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
