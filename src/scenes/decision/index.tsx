import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import type {
  DecisionOption,
  DecisionProblem,
  DecisionSceneProps,
  MissionId,
  Player,
  ResourceKey,
} from '../../shared/types';
import { RESOURCE_ORDER } from '../../shared/scoring';
import {
  GaugeBar,
  HudButton,
  HudPanel,
  HudShell,
  PlayerBadge,
  StatusPill,
} from '../../shared/ui';
import issProblems from '../../content/problems.iss';
import moonProblems from '../../content/problems.moon';
import marsProblems from '../../content/problems.mars';
import styles from './DecisionScene.module.css';

const PROBLEMS: Record<MissionId, DecisionProblem[]> = {
  iss: issProblems,
  moon: moonProblems,
  mars: marsProblems,
};

const MISSIONS: Record<MissionId, { number: number; label: string }> = {
  iss: { number: 1, label: 'ISS' },
  moon: { number: 2, label: 'Moon' },
  mars: { number: 3, label: 'Mars' },
};

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  fuel: 'Fuel',
  power: 'Power',
  oxygen: 'Oxygen',
  water: 'Water',
  food: 'Food',
  shielding: 'Shielding',
  spares: 'Spares',
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
  const revealRef = useRef<HTMLHeadingElement>(null);
  const debriefRef = useRef<HTMLHeadingElement>(null);

  const problems = PROBLEMS[missionId] ?? [];
  const problemId = state.problemIds[state.index];
  const problem =
    problems.find((candidate) => candidate.id === problemId) ?? problems[0];
  const currentPick = problem
    ? state.picks.find((pick) => pick.problemId === problem.id) ?? null
    : null;
  const chosenOption = problem && currentPick
    ? problem.options.find((option) => option.id === currentPick.optionId) ?? null
    : null;
  const turnPlayer =
    players.find((player) => player.id === state.turnPlayerId) ?? players[0] ?? me;
  const host = players.find((player) => player.isHost) ?? me;
  const meIsTurn = state.status === 'choosing' && me.id === state.turnPlayerId;
  const isLastProblem = state.index >= state.problemIds.length - 1;
  const mission = MISSIONS[missionId];
  const score = scoreState(state.scoreAfter);
  const stepLabel = state.status === 'debrief' ? 'Debrief' : 'Decision phase';
  const missionTitle = `Mission ${mission.number} · ${mission.label}`;

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
        <HudPanel title="Decision phase">
          <p>No decision problems are loaded for this mission.</p>
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
          title="Crew & Turn"
          subtitle="Round-robin by join order"
          className={styles.left}
          scroll
        >
          <div className={styles.progressBlock}>
            <div className={styles.progressHead}>
              <span className={styles.sectionLabel}>Incident progress</span>
              <span className={styles.progressCount}>
                {Math.min(state.index + 1, state.problemIds.length)} /{' '}
                {state.problemIds.length}
              </span>
            </div>
            <ol
              className={styles.progressList}
              aria-label={`Problem ${state.index + 1} of ${state.problemIds.length}`}
            >
              {state.problemIds.map((id, index) => {
                const done = index < state.index;
                const current = index === state.index;
                return (
                  <li
                    key={id}
                    className={clsx(
                      styles.progressStep,
                      done && styles.progressDone,
                      current && styles.progressCurrent,
                    )}
                    aria-current={current ? 'step' : undefined}
                  >
                    <span aria-hidden="true">{done ? '✓' : String(index + 1)}</span>
                    <span className={styles.srOnly}>
                      {done ? 'completed' : current ? 'current' : 'upcoming'}
                    </span>
                  </li>
                );
              })}
            </ol>
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
                hasPicked={state.picks.some(
                  (pick) =>
                    pick.problemId === problem.id && pick.playerId === player.id,
                )}
                isMe={player.id === me.id}
              />
            ))}
          </ol>

          <div className={styles.howTo}>
            <span className={styles.sectionLabel}>How this works</span>
            <ol className={styles.howList}>
              <li>Read the incident and the three possible responses.</li>
              <li>The highlighted player picks one. Everyone shares the result.</li>
              <li>After the reveal, compare your choice with what really happened.</li>
            </ol>
          </div>

          <p className={styles.ruleNote}>
            Only the player whose turn it is can choose. The crew&apos;s resources
            and score carry from problem to problem.
          </p>
        </HudPanel>

        <HudPanel
          title={state.status === 'debrief' ? 'Mission Debrief' : 'Decision'}
          subtitle={
            state.status === 'debrief'
              ? 'Every choice, and what it cost'
              : `Incident ${state.index + 1} of ${state.problemIds.length}`
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
                {mission.label} decisions complete
              </h1>

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
                {RESOURCE_ORDER.map((key) => (
                  <GaugeBar
                    key={key}
                    compact
                    label={RESOURCE_LABELS[key]}
                    value={state.resourcesAfter[key] ?? 0}
                    max={100}
                    hint={deltaText(
                      (state.resourcesAfter[key] ?? 0) - (plan.resources[key] ?? 0),
                    )}
                  />
                ))}
              </div>

              <div className={styles.choicesBlock}>
                <span className={styles.sectionLabel}>Crew choices</span>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <caption className={styles.srOnly}>
                      Each problem, the player who chose, and what they picked
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Incident</th>
                        <th scope="col">Player</th>
                        <th scope="col">Choice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.problemIds.map((id, index) => {
                        const definition = problems.find((item) => item.id === id);
                        const pick = state.picks.find((item) => item.problemId === id);
                        const option = definition?.options.find(
                          (item) => item.id === pick?.optionId,
                        );
                        const player = pick
                          ? players.find((item) => item.id === pick.playerId)
                          : undefined;
                        return (
                          <tr key={id}>
                            <td className={styles.tableIndex}>{index + 1}</td>
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
              <span className={styles.eyebrow}>Outcome</span>
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
                    {effects.map(({ key, value }) => (
                      <span
                        key={key}
                        className={clsx(
                          styles.effectChip,
                          value >= 0 ? styles.effectGood : styles.effectBad,
                        )}
                      >
                        <span aria-hidden="true">{value >= 0 ? '+' : '−'}</span>
                        {Math.abs(value)} {RESOURCE_LABELS[key]}
                      </span>
                    ))}
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
                      Decision by{' '}
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
                  ) : null}
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
                        : 'Next problem'}
                  </HudButton>
                ) : (
                  <p className={styles.waitNote}>
                    Waiting for {host.name} to {isLastProblem ? 'open the debrief' : 'continue'}.
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <>
              <div className={styles.problemCard}>
                <div className={styles.problemMeta}>
                  <span className={styles.eyebrow}>Incoming incident</span>
                  <span className={styles.problemIndex}>
                    #{String(state.index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h1 className={styles.problemTitle}>{problem.title}</h1>
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
                    : `is choosing. You can read along.`}
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
                  ? 'Choose one response. The consequences apply to the whole crew.'
                  : `Only ${turnPlayer.name} can choose right now.`}
              </p>

              {error ? (
                <p className={styles.error} role="alert">
                  <span aria-hidden="true">▲ </span>
                  {error}
                </p>
              ) : null}
            </>
          )}

          {state.status !== 'revealed' && error && state.status === 'debrief' ? (
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
            <span className={styles.sectionLabel}>Mission score</span>
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
              const delta = (state.resourcesAfter[key] ?? 0) - (plan.resources[key] ?? 0);
              return (
                <GaugeBar
                  key={key}
                  compact
                  label={RESOURCE_LABELS[key]}
                  value={state.resourcesAfter[key] ?? 0}
                  max={100}
                  hint={delta === 0 ? 'at plan level' : deltaText(delta)}
                />
              );
            })}
          </div>

          <div className={styles.log}>
            <span className={styles.sectionLabel}>Decision log</span>
            {state.problemIds.map((id, index) => {
              const definition = problems.find((item) => item.id === id);
              const pick = state.picks.find((item) => item.problemId === id);
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
                    {option?.label ?? 'Pending'}
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
            <span className={styles.sectionLabel}>Decision rule</span>
            <p>
              Turns follow join order and repeat. Everyone shares the resource and
              score changes.
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

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function deltaText(delta: number): string {
  if (delta === 0) return 'at plan level';
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} from plan`;
}
