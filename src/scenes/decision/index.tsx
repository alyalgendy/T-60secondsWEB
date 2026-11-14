import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type {
  DecisionOption,
  DecisionSceneProps,
  MissionId,
  Player,
  ResourceKey,
} from '../../shared/types';
import { RESOURCE_ORDER, toReservePercent } from '../../shared/scoring';
import {
  findIncident,
  planRiskFor,
  type IncidentSeverity,
} from '../../content/incidents';
import { missionConfig as issConfig } from '../iss/config';
import { missionConfig as moonConfig } from '../moon/config';
import { missionConfig as marsConfig } from '../mars/config';
import {
  GaugeBar,
  HudButton,
  HudPanel,
  HudShell,
  MissionViz,
  PlayerBadge,
  StatusPill,
} from '../../shared/ui';
import styles from './DecisionScene.module.css';

const MISSIONS: Record<MissionId, { number: number; label: string }> = {
  iss: { number: 1, label: 'ISS' },
  moon: { number: 2, label: 'Moon' },
  mars: { number: 3, label: 'Mars' },
};
const MISSION_CONFIGS = {
  iss: issConfig,
  moon: moonConfig,
  mars: marsConfig,
} as const;

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  fuel: 'Fuel',
  power: 'Power',
  oxygen: 'Oxygen',
  water: 'Water',
  food: 'Food',
  shielding: 'Shielding',
  spares: 'Spares',
};

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  caution: 'Caution',
  warning: 'Warning',
  critical: 'Critical',
};

const SEVERITY_CLASS: Record<IncidentSeverity, string> = {
  caution: styles.severityCaution,
  warning: styles.severityWarning,
  critical: styles.severityCritical,
};

function errorText(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'The room did not accept that action. Check your connection and try again.';
}

function scoreState(score: number): { tone: 'ok' | 'warn' | 'danger'; label: string } {
  if (score >= 75) return { tone: 'ok', label: 'On track' };
  if (score >= 50) return { tone: 'warn', label: 'Fragile' };
  return { tone: 'danger', label: 'Critical' };
}

function optionLetter(index: number): string {
  return ['A', 'B', 'C'][index] ?? String(index + 1);
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function deltaText(delta: number, cap: number): string {
  if (delta === 0) return 'at plan level';
  const percent = Math.round((Math.abs(delta) / Math.max(1, cap)) * 100);
  return `${delta > 0 ? '+' : '−'}${percent}% from planned reserve`;
}

function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe} min`;
  const hours = Math.floor(safe / 60);
  const remainder = safe % 60;
  if (hours < 48) return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
  const days = Math.floor(hours / 24);
  const leftover = hours % 24;
  return leftover === 0 ? `${days} d` : `${days} d ${leftover} h`;
}

export default function DecisionScene({
  roomCode,
  me,
  players,
  missionId,
  plan,
  state,
  choose,
  nextProblem,
  finish,
}: DecisionSceneProps) {
  const reduceMotion = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clocking, setClocking] = useState(() => state.status === 'choosing');
  const revealRef = useRef<HTMLHeadingElement>(null);
  const debriefRef = useRef<HTMLHeadingElement>(null);

  const mission = MISSIONS[missionId];
  // Defensive: Firebase drops empty arrays, so always fall back before use.
  const picks = Array.isArray(state.picks) ? state.picks : [];
  const problemIds = Array.isArray(state.problemIds) ? state.problemIds : [];
  const incidentCount = problemIds.length;
  const problemId = problemIds[state.index];
  const problem = problemId ? findIncident(missionId, problemId) : undefined;
  const previousIncident =
    state.index > 0
      ? findIncident(missionId, problemIds[state.index - 1] ?? '')
      : undefined;
  const lastIncident =
    incidentCount > 0
      ? findIncident(missionId, problemIds[incidentCount - 1] ?? '')
      : undefined;
  const risk = planRiskFor(plan.score);
  const previousMet = previousIncident?.met ?? 'Launch';
  const previousMinutes = previousIncident?.metMinutes ?? 0;
  const jumpMinutes = problem ? Math.max(0, problem.metMinutes - previousMinutes) : 0;
  const currentPick = problem
    ? picks.find((pick) => pick.problemId === problem.id) ?? null
    : null;
  const chosenOption =
    problem && currentPick
      ? problem.options.find((option) => option.id === currentPick.optionId) ?? null
      : null;
  const turnPlayer =
    players.find((player) => player.id === state.turnPlayerId) ?? players[0] ?? me;
  const host = players.find((player) => player.isHost) ?? me;
  const meIsTurn = state.status === 'choosing' && me.id === state.turnPlayerId;
  const isLastProblem = state.index >= incidentCount - 1;
  const score = scoreState(state.scoreAfter);
  const stepLabel = state.status === 'debrief' ? 'Debrief' : 'Mission simulation';
  const missionTitle = `Mission ${mission.number} · ${mission.label}`;

  useEffect(() => {
    if (state.status !== 'choosing' || !problem) {
      setClocking(false);
      return;
    }
    setClocking(true);
    const timer = window.setTimeout(
      () => setClocking(false),
      reduceMotion ? 120 : 1100,
    );
    return () => window.clearTimeout(timer);
  }, [state.status, state.index, problem, reduceMotion]);

  useEffect(() => {
    if (state.status === 'revealed') {
      revealRef.current?.focus();
    }
    if (state.status === 'debrief') {
      debriefRef.current?.focus();
    }
  }, [state.status, state.index]);

  async function handleChoose(option: DecisionOption): Promise<void> {
    if (!meIsTurn || busy) return;
    setBusy(true);
    setError(null);
    try {
      await choose(option.id);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleAdvance(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      if (state.status === 'debrief') {
        await finish();
      } else {
        await nextProblem();
      }
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!problem) {
    return (
      <HudShell
        missionTitle={missionTitle}
        stepLabel={stepLabel}
        roomCode={roomCode}
        players={players}
        me={me}
      >
        <HudPanel title="Mission simulation">
          <p>No incident data is loaded for this mission. Ask the host to restart the run.</p>
        </HudPanel>
      </HudShell>
    );
  }

  const effects = chosenOption
    ? RESOURCE_ORDER.flatMap((key) => {
        const value = chosenOption.effects[key];
        return value === undefined || value === 0 ? [] : [{ key, value }];
      })
    : [];

  return (
    <HudShell
      missionTitle={missionTitle}
      stepLabel={stepLabel}
      roomCode={roomCode}
      players={players}
      me={me}
      headerAside={
        <StatusPill tone={state.status === 'choosing' ? 'info' : 'ok'}>
          {state.status === 'choosing'
            ? `${turnPlayer.name}'s turn`
            : state.status === 'revealed'
              ? 'Outcome'
              : 'Debrief'}
        </StatusPill>
      }
    >
      <div className={styles.grid}>
        <HudPanel
          title="Crew & Timeline"
          subtitle="Logged time only"
          className={styles.left}
          scroll
        >
          <MissionViz
            config={MISSION_CONFIGS[missionId]}
            crewCount={players.length}
            resources={state.resourcesAfter}
            elapsedDays={
              (state.status === 'debrief'
                ? lastIncident?.metMinutes ?? problem.metMinutes
                : problem.metMinutes) / 1440
            }
            phase={problem.phase}
          />
          <div className={styles.timelineBlock}>
            <div className={styles.timelineHead}>
              <span className={styles.sectionLabel}>Mission elapsed time</span>
              <span className={styles.progressCount}>
                Event {state.index + 1}
              </span>
            </div>
            <div className={styles.clockRow}>
              <span className={styles.clockValue}>{problem.met}</span>
              <span className={styles.clockPhase}>{problem.phase}</span>
            </div>
            <ol className={styles.timelineList} aria-label="Mission incident timeline">
              {problemIds.slice(0, state.index + 1).map((id, index) => {
                const item = findIncident(missionId, id);
                const done = index < state.index;
                const current = index === state.index;
                return (
                  <li
                    key={id}
                    className={clsx(
                      styles.timelineItem,
                      done && styles.timelineDone,
                      current && styles.timelineCurrent,
                    )}
                    aria-current={current ? 'step' : undefined}
                  >
                    <span
                      className={clsx(
                        styles.timelineDot,
                        item ? SEVERITY_CLASS[item.severity] : undefined,
                      )}
                      aria-hidden="true"
                    />
                    <span className={styles.timelineMet}>
                      {item?.met ?? `#${index + 1}`}
                    </span>
                    <span className={styles.timelineTitle}>
                      {item?.title ?? 'Unknown incident'}
                    </span>
                    <span className={styles.timelineState}>
                      {done ? '✓' : 'NOW'}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className={styles.timelineUnknown} aria-hidden="true">
              <span className={styles.unknownLine} />
              <span>Time ahead is unlogged</span>
            </div>
            <div className={styles.timelineEnds}>
              <span>Launch</span>
              <span>Return</span>
            </div>
          </div>

          <div className={styles.riskBlock}>
            <div className={styles.riskHead}>
              <span className={styles.sectionLabel}>Plan risk</span>
              <StatusPill tone={risk.tone}>{risk.label}</StatusPill>
            </div>
            <div className={styles.riskMeter} aria-hidden="true">
              <span
                className={clsx(
                  styles.riskFill,
                  risk.tone === 'danger' && styles.riskFillDanger,
                )}
                style={{ width: `${Math.max(0, Math.min(100, plan.score))}%` }}
              />
            </div>
            <p className={styles.riskText}>
              Plan {plan.score}/100 · {risk.detail}
            </p>
          </div>

          <ol
            className={styles.turnList}
            aria-label="Crew turn order"
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
          >
            {players.map((player, index) => (
              <TurnRow
                key={player.id}
                player={player}
                index={index}
                isTurn={
                  player.id === state.turnPlayerId && state.status === 'choosing'
                }
                hasPicked={picks.some(
                  (pick) =>
                    pick.problemId === problem.id && pick.playerId === player.id,
                )}
                isMe={player.id === me.id}
              />
            ))}
          </ol>

          <div className={styles.howTo}>
            <span className={styles.sectionLabel}>How the timeline works</span>
            <ol className={styles.howList}>
              <li>Mission time advances between events.</li>
              <li>A sudden event interrupts the mission. One player chooses.</li>
              <li>Faults arrive without warning.</li>
            </ol>
          </div>
        </HudPanel>

        <HudPanel
          title={state.status === 'debrief' ? 'Mission Debrief' : 'Simulation'}
          subtitle={
            state.status === 'debrief'
              ? 'Every choice, and what it cost'
              : state.status === 'revealed'
                ? `Outcome · ${problem.met}`
                : `Incident ${state.index + 1}`
          }
          className={styles.center}
          scroll
          aside={<span className={styles.centerAside}>{mission.label}</span>}
        >
          {state.status === 'debrief' ? (
            <div className={styles.debrief}>
              <span className={styles.eyebrow}>Mission debrief</span>
              <h1
                className={styles.debriefTitle}
                ref={debriefRef}
                tabIndex={-1}
              >
                {mission.label} simulation complete
              </h1>
              <p className={styles.debriefMeta}>
                Plan {plan.score}/100 · {incidentCount} incidents triggered
                {lastIncident ? ` · last event ${lastIncident.met}` : ''}
              </p>

              <div className={styles.debriefScoreRow}>
                <div className={styles.debriefScore}>
                  <span className={styles.sectionLabel}>Final mission score</span>
                  <div>
                    <span className={styles.debriefScoreValue} key={state.scoreAfter}>
                      {state.scoreAfter}
                    </span>
                    <span className={styles.debriefScoreMax}>/100</span>
                  </div>
                </div>
                <StatusPill tone={score.tone}>{score.label}</StatusPill>
              </div>

              <div className={styles.finalResources}>
                {RESOURCE_ORDER.map((key) => {
                  const cap =
                    MISSION_CONFIGS[missionId].needs.find((need) => need.key === key)?.max ?? 100;
                  const delta =
                    (state.resourcesAfter[key] ?? 0) - (plan.resources[key] ?? 0);
                  return (
                    <GaugeBar
                      key={key}
                      compact
                      label={RESOURCE_LABELS[key]}
                      value={toReservePercent(state.resourcesAfter[key] ?? 0, cap)}
                      max={100}
                      hint={deltaText(delta, cap)}
                    />
                  );
                })}
              </div>

              <div className={styles.choicesBlock}>
                <span className={styles.sectionLabel}>Crew choices</span>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <caption className={styles.srOnly}>
                      Each event, the player who chose, and what they picked
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">MET</th>
                        <th scope="col">Incident</th>
                        <th scope="col">Player</th>
                        <th scope="col">Choice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problemIds.map((id) => {
                        const definition = findIncident(missionId, id);
                        const pick = picks.find((item) => item.problemId === id);
                        const option = definition?.options.find(
                          (item) => item.id === pick?.optionId,
                        );
                        const player = pick
                          ? players.find((item) => item.id === pick.playerId)
                          : undefined;
                        return (
                          <tr key={id}>
                            <td className={styles.tableMet}>
                              {definition?.met ?? '—'}
                            </td>
                            <td>{definition?.title ?? 'Unknown incident'}</td>
                            <td>
                              {player ? (
                                <PlayerBadge player={player} size="sm" />
                              ) : (
                                <span className={styles.muted}>—</span>
                              )}
                            </td>
                            <td>
                              {option?.label ?? <span className={styles.muted}>No choice</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.debriefFooter}>
                {me.isHost ? (
                  <HudButton
                    variant="primary"
                    onClick={() => {
                      void handleAdvance();
                    }}
                    disabled={busy}
                  >
                    {busy ? 'Saving…' : 'Continue'}
                  </HudButton>
                ) : (
                  <p className={styles.waitNote}>
                    Waiting for {host.name} to continue.
                  </p>
                )}
              </div>
            </div>
          ) : state.status === 'revealed' ? (
            <motion.div
              className={styles.reveal}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <span className={styles.eyebrow}>Outcome · {problem.met}</span>
              <h1
                className={styles.revealTitle}
                ref={revealRef}
                tabIndex={-1}
              >
                {chosenOption?.label ?? 'No choice recorded'}
              </h1>

              {chosenOption ? (
                <>
                  <p className={styles.outcomeText}>{chosenOption.outcome}</p>

                  <div className={styles.effectRow} aria-label="Resource and score effects">
                    <span
                      className={clsx(
                        styles.effectChip,
                        chosenOption.scoreDelta >= 0
                          ? styles.effectGood
                          : styles.effectBad,
                      )}
                    >
                      <span aria-hidden="true">
                        {chosenOption.scoreDelta >= 0 ? '▲' : '▼'}
                      </span>
                      {signed(chosenOption.scoreDelta)} score
                    </span>
                    {effects.map(({ key, value }) => {
                      const cap =
                        MISSION_CONFIGS[missionId].needs.find((need) => need.key === key)?.max ??
                        100;
                      const percent = Math.round((Math.abs(value) / cap) * 100);
                      return (
                        <span
                          key={key}
                          className={clsx(
                            styles.effectChip,
                            value >= 0 ? styles.effectGood : styles.effectBad,
                          )}
                        >
                          <span aria-hidden="true">{value >= 0 ? '+' : '−'}</span>
                          {percent}% {RESOURCE_LABELS[key]}
                        </span>
                      );
                    })}
                  </div>

                  <div className={styles.realWorld}>
                    <span className={styles.realLabel}>What really happened</span>
                    <p className={styles.realText}>{problem.realWorld.summary}</p>
                    <a
                      className={styles.sourceLink}
                      href={problem.realWorld.source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`Source: ${problem.realWorld.source.title} (opens in a new tab)`}
                    >
                      <span aria-hidden="true">↗</span>
                      {problem.realWorld.source.title}
                    </a>
                  </div>

                  {currentPick ? (
                    <p className={styles.decidedBy}>
                      Choice by{' '}
                      <PlayerBadge
                        player={
                          players.find((player) => player.id === currentPick.playerId) ??
                          me
                        }
                        size="sm"
                      />
                    </p>
                  ) : null}

                  {isLastProblem ? (
                    <p className={styles.lastNote}>
                      That was the final incident. The debrief is next.
                    </p>
                  ) : (
                    <p className={styles.nextNote}>Mission time continues.</p>
                  )}
                </>
              ) : (
                <p className={styles.outcomeText}>
                  This outcome was recorded without a matching option. Ask the host
                  to continue.
                </p>
              )}

              <div className={styles.revealFooter}>
                {me.isHost ? (
                  <HudButton
                    variant="primary"
                    onClick={() => {
                      void handleAdvance();
                    }}
                    disabled={busy}
                  >
                    {busy
                      ? 'Saving…'
                      : isLastProblem
                        ? 'View debrief'
                        : 'Continue mission'}
                  </HudButton>
                ) : (
                  <p className={styles.waitNote}>
                    Waiting for {host.name} to {isLastProblem ? 'open the debrief' : 'continue'}.
                  </p>
                )}
              </div>
            </motion.div>
          ) : clocking ? (
            <div className={styles.timeJump} aria-live="polite">
              <span className={styles.eyebrow}>Mission time passing</span>
              <div className={styles.jumpClockRow}>
                <span className={styles.jumpFrom}>{previousMet}</span>
                <span className={styles.jumpArrow} aria-hidden="true">
                  →
                </span>
                <span className={styles.jumpNow}>{problem.met}</span>
              </div>
              <div className={styles.jumpTrack} aria-hidden="true">
                <span className={styles.jumpSweep} />
              </div>
              <p className={styles.jumpText}>
                {jumpMinutes > 0
                  ? `${formatDuration(jumpMinutes)} of mission time pass. Then a sudden event interrupts ${problem.phase}.`
                  : `A sudden event interrupts ${problem.phase}.`}
              </p>
              <div className={styles.jumpAlert}>
                <span className={styles.jumpPulse} aria-hidden="true" />
                <span className={styles.jumpAlertText}>Sudden event</span>
                <span
                  className={clsx(
                    styles.severityChip,
                    SEVERITY_CLASS[problem.severity],
                  )}
                >
                  {SEVERITY_LABEL[problem.severity]}
                </span>
              </div>
            </div>
          ) : (
            <motion.div
              key={problem.id}
              className={styles.eventView}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <div className={styles.problemCard}>
                <div className={styles.eventAlert}>
                  <span className={styles.eventAlertDot} aria-hidden="true" />
                  <span>Sudden event</span>
                </div>
                <div className={styles.problemMeta}>
                  <span className={styles.eyebrow}>{problem.alarm}</span>
                  <span className={styles.problemMetaRight}>
                    <span
                      className={clsx(
                        styles.severityChip,
                        SEVERITY_CLASS[problem.severity],
                      )}
                    >
                      {SEVERITY_LABEL[problem.severity]}
                    </span>
                    <span className={styles.problemIndex}>{problem.met}</span>
                  </span>
                </div>
                <h1 className={styles.problemTitle}>{problem.title}</h1>
                <p className={styles.eventPhase}>Crew status: {problem.phase}</p>
                <p className={styles.briefing}>{problem.briefing}</p>
              </div>

              <div
                className={clsx(
                  styles.turnBanner,
                  meIsTurn && styles.turnBannerMine,
                )}
                style={{
                  borderColor: turnPlayer.color,
                  boxShadow: meIsTurn
                    ? `inset 3px 0 0 ${turnPlayer.color}, 0 0 14px ${turnPlayer.color}22`
                    : undefined,
                }}
              >
                <PlayerBadge player={turnPlayer} showName />
                <span className={styles.turnText}>
                  {meIsTurn
                    ? 'It is your turn to choose'
                    : 'is choosing. You can read along.'}
                </span>
              </div>

              <div
                className={styles.options}
                role="group"
                aria-label="Choose one response"
              >
                {problem.options.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    className={styles.option}
                    disabled={!meIsTurn || busy}
                    onClick={() => {
                      void handleChoose(option);
                    }}
                  >
                    <span className={styles.optionKey} aria-hidden="true">
                      {optionLetter(index)}
                    </span>
                    <span className={styles.optionBody}>
                      <span className={styles.optionLabel}>{option.label}</span>
                      <span className={styles.optionReason}>{option.reasoning}</span>
                    </span>
                    <span className={styles.optionArrow} aria-hidden="true">
                      →
                    </span>
                  </button>
                ))}
              </div>

              <p className={styles.chooseNote} aria-live="polite">
                {meIsTurn
                  ? 'Choose one response. The consequences apply to the whole crew and carry into the rest of the mission.'
                  : `Only ${turnPlayer.name} can choose right now.`}
              </p>
            </motion.div>
          )}

          {error ? (
            <p className={styles.error} role="alert">
              <span aria-hidden="true">▲ </span>
              {error}
            </p>
          ) : null}
        </HudPanel>

        <HudPanel
          title="Mission Status"
          subtitle="Live resources and score"
          className={styles.right}
          scroll
        >
          <div className={styles.scoreBlock}>
            <div className={styles.scoreHead}>
              <span className={styles.sectionLabel}>Mission score</span>
              <span className={styles.scoreMet}>{problem.met}</span>
            </div>
            <div className={styles.scoreRow}>
              <span className={styles.scoreBig} key={state.scoreAfter}>
                {state.scoreAfter}
              </span>
              <span className={styles.scoreMax}>/100</span>
              <StatusPill tone={score.tone}>{score.label}</StatusPill>
            </div>
          </div>

          <div
            className={clsx(
              styles.resourceList,
              state.status === 'revealed' && styles.gaugesLive,
            )}
            aria-label="Current resources"
          >
            {RESOURCE_ORDER.map((key) => {
              const cap =
                MISSION_CONFIGS[missionId].needs.find((need) => need.key === key)?.max ?? 100;
              const delta = (state.resourcesAfter[key] ?? 0) - (plan.resources[key] ?? 0);
              return (
                <GaugeBar
                  key={key}
                  compact
                  label={RESOURCE_LABELS[key]}
                  value={toReservePercent(state.resourcesAfter[key] ?? 0, cap)}
                  max={100}
                  hint={delta === 0 ? 'at plan level' : deltaText(delta, cap)}
                />
              );
            })}
          </div>

          <div className={styles.log}>
            <span className={styles.sectionLabel}>Simulation log</span>
            {problemIds.slice(0, state.index + 1).map((id, index) => {
              const definition = findIncident(missionId, id);
              const pick = picks.find((item) => item.problemId === id);
              const option = definition?.options.find(
                (item) => item.id === pick?.optionId,
              );
              const player = pick
                ? players.find((item) => item.id === pick.playerId)
                : undefined;
              return (
                <div
                  key={id}
                  className={clsx(
                    styles.logRow,
                    index === state.index && styles.logRowActive,
                  )}
                >
                  <span className={styles.logIndex}>{index + 1}</span>
                  <span className={styles.logText}>
                    {option?.label ?? 'In progress'}
                  </span>
                  {player ? (
                    <PlayerBadge player={player} size="sm" showName={false} />
                  ) : (
                    <span className={styles.logDot} aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.rulesBox}>
            <span className={styles.sectionLabel}>Simulation rules</span>
            <p>
              Time advances between events. Thin planning margins make the
              mission harder, and everyone shares the result.
            </p>
          </div>

          {state.status === 'choosing' && !meIsTurn ? (
            <p className={styles.waitNote} aria-live="polite">
              Waiting for {turnPlayer.name}.
            </p>
          ) : null}
        </HudPanel>
      </div>
    </HudShell>
  );
}

interface TurnRowProps {
  player: Player;
  index: number;
  isTurn: boolean;
  hasPicked: boolean;
  isMe: boolean;
}

function TurnRow({ player, index, isTurn, hasPicked, isMe }: TurnRowProps) {
  return (
    <li
      className={clsx(styles.turnRow, isTurn && styles.turnRowActive)}
      style={isTurn ? { borderColor: player.color } : undefined}
      aria-current={isTurn ? 'true' : undefined}
    >
      <span className={styles.turnIndex}>{String(index + 1).padStart(2, '0')}</span>
      <PlayerBadge player={player} size="sm" showName />
      {isMe ? <span className={styles.turnMe}>(you)</span> : null}
      <span
        className={clsx(
          styles.turnState,
          isTurn && styles.turnStateActive,
          hasPicked && !isTurn && styles.turnStateDone,
        )}
      >
        {isTurn ? 'TURN' : hasPicked ? 'CHOSEN' : 'WAITING'}
      </span>
    </li>
  );
}
