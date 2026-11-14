import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MarkerSlot } from '../../components/MarkerBadge';
import { getMissionV2Content } from '../../content/missions-v2';
import { CapsuleShell, useWarnings } from '../capsule';
import { useDesign } from '../../shared/hooks/useDesign';
import { useMission } from '../../shared/hooks/useMission';
import {
  applyMissionIntent,
  canRetryMission,
  syncMissionPositions,
  MISSION_SECONDS,
  tickMission,
  CABIN_STATIONS,
} from '../../shared/sim';
import { getMissionMarkers } from '../../lib/markers';
import { TUTORIAL_STEPS } from '../../lib/tutorial';
import type {
  MissionEvent,
  MissionIntentAction,
  MissionPosition,
  MissionId,
  Player,
  ResourceKey,
  SystemId,
} from '../../shared/types';
import {
  createMissionFlightState,
  getMissionFixtureForEvent,
  getMissionIntentContext,
  getMissionResponsesForEvent,
} from './setup';
import CabinMap from './CabinMap';
import type { MissionStationId } from './types';
import { calculateDesignStats, getReadinessGates } from '../design/designLogic';
import { assignMissionRoles } from '../design/roles';
import styles from './MissionScene.module.css';

const MissionVizTracker = lazy(() => import('../missionViz/MissionVizTracker'));

const RESOURCE_KEYS: readonly ResourceKey[] = [
  'oxygen',
  'water',
  'food',
  'fuel',
  'power',
  'shielding',
  'spares',
];

const SYSTEM_NAMES: Record<SystemId, string> = {
  engine: 'Engine',
  solar: 'Solar',
  thermal: 'Thermal',
  comms: 'Comms',
  navigation: 'Navigation',
  shield: 'Shield',
};
const STATION_NAMES: Record<MissionStationId, string> = {
  engine: 'Engine',
  solar: 'Solar',
  thermal: 'Thermal',
  comms: 'Comms',
  navigation: 'Navigation',
  shield: 'Shield',
  storage: 'Storage',
  airlock: 'Airlock',
};

function connectedCrew(players: readonly Player[], me: Player): Player[] {
  const crew = players.filter((player) => player.connected);
  if (!crew.some((player) => player.id === me.id)) crew.push(me);
  return crew.sort((left, right) => left.joinOrder - right.joinOrder);
}

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function isNearStation(
  position: MissionPosition | undefined,
  station: MissionStationId,
): boolean {
  if (!position) return false;
  const target = CABIN_STATIONS[station];
  return Math.hypot(position.x - target.x, position.y - target.y) <= 14;
}

function isSystemStation(station: MissionStationId): station is SystemId {
  return station in SYSTEM_NAMES;
}

function fixtureName(
  event: MissionEvent,
  content: ReturnType<typeof getMissionV2Content>,
): string {
  const fixture = content.events.find((item) =>
    event.id.startsWith(`${item.id}-`),
  );
  const system = fixture?.system ?? event.system;
  return `${SYSTEM_NAMES[system as SystemId]} event`;
}

function eventStatusLabel(event: MissionEvent): string {
  if (event.status === 'resolved') return 'Resolved';
  if (event.status === 'failed') return 'Failed';
  return event.status === 'diagnosed' ? 'Repair' : 'Pending';
}

function researchForEvent(
  event: MissionEvent,
  content: ReturnType<typeof getMissionV2Content>,
) {
  const fixtureId = event.id.replace(/-\d+$/, '');
  return content.eventResearch[fixtureId];
}

function getStars(
  state: NonNullable<ReturnType<typeof useMission>['state']>,
  crew: readonly Player[],
  design: NonNullable<ReturnType<typeof useDesign>['state']>,
  missionId: MissionId,
) {
  const resolved = state.events.filter(
    (event) => event.status === 'resolved' && event.resolvedAt !== undefined,
  );
  const averageResponse =
    resolved.length > 0
      ? resolved.reduce(
          (total, event) => total + ((event.resolvedAt ?? event.startsAt) - event.startsAt),
          0,
        ) /
        resolved.length /
        1000
      : Number.POSITIVE_INFINITY;
  const contributors = new Set(
    state.events.flatMap((event) => [
      ...(event.diagnosedBy ? [event.diagnosedBy] : []),
      ...(event.repairedBy ?? []),
    ]),
  );
  return [
    {
      id: 'design',
      label: 'Design',
      earned: getReadinessGates(design, missionId).every((gate) => gate.status === 'green'),
    },
    { id: 'response', label: 'Response', earned: averageResponse <= 45 },
    {
      id: 'teamwork',
      label: 'Teamwork',
      earned: crew.length > 0 && crew.every((player) => contributors.has(player.id)),
    },
  ];
}

interface MissionSceneProps {
  roomCode: string;
  missionId: MissionId;
  me: Player;
  players: Player[];
  onContinue: () => void | Promise<void>;
  mock?: boolean;
}

export default function MissionScene({
  roomCode,
  missionId,
  me,
  players,
  onContinue,
  mock,
}: MissionSceneProps) {
  const content = getMissionV2Content(missionId);
  const crew = useMemo(() => connectedCrew(players, me), [me, players]);
  const design = useDesign({
    roomCode,
    missionId,
    ...(mock !== undefined ? { mock } : {}),
  });
  const mission = useMission({
    roomCode,
    missionId,
    playerId: me.id,
    isHost: me.isHost,
    ...(mock !== undefined ? { mock } : {}),
  });
  const [now, setNow] = useState(Date.now);
  const [selectedStation, setSelectedStation] =
    useState<MissionStationId>('navigation');
  const [myPosition, setMyPosition] = useState<MissionPosition | undefined>();
  const [showGuide, setShowGuide] = useState(true);
  const [showReplay, setShowReplay] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [snapshotAt, setSnapshotAt] = useState(Date.now);
  const initializedFor = useRef<string | null>(null);
  const seenIntentIds = useRef(new Set<string>());
  const intentChain = useRef(Promise.resolve());
  const missionStateRef = useRef(mission.state);
  const positionsRef = useRef(mission.positions);

  missionStateRef.current = mission.state;
  positionsRef.current = mission.positions;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSnapshotAt(Date.now());
  }, [mission.state]);

  const initialPosition = mission.state?.players[me.id];
  useEffect(() => {
    if (initialPosition) {
      setMyPosition(
        mission.positions[me.id] ?? {
          x: initialPosition.x,
          y: initialPosition.y,
        },
      );
    }
  }, [initialPosition?.x, initialPosition?.y, me.id, mission.positions]);

  useEffect(() => {
    if (
      !me.isHost ||
      design.loading ||
      mission.loading ||
      mission.state ||
      !design.state
    ) {
      return;
    }
    const initKey = `${roomCode}:${missionId}`;
    if (initializedFor.current === initKey) return;
    initializedFor.current = initKey;
    void mission
      .start(createMissionFlightState(roomCode, missionId, design.state, crew.map((player) => player.id)))
      .catch((error: unknown) => {
        initializedFor.current = null;
        setActionError(error instanceof Error ? error.message : 'Mission could not start.');
      });
  }, [
    crew,
    design.loading,
    design.state,
    mission.loading,
    mission.state,
    mission.start,
    missionId,
    me.isHost,
    roomCode,
  ]);

  useEffect(() => {
    const state = mission.state;
    if (!me.isHost || !state || state.outcome !== 'running') return;
    const timer = window.setInterval(() => {
      void mission
        .update((current) =>
          tickMission(
            current,
            Date.now(),
            positionsRef.current,
            crew.map((player) => player.id),
          ),
        )
        .catch(() => undefined);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [
    crew,
    me.isHost,
    mission.state?.attempt,
    mission.state?.outcome,
    mission.update,
  ]);

  const intentContext = useMemo(
    () =>
      mission.state && design.state
        ? getMissionIntentContext(
            mission.state,
            design.state,
            missionId,
            crew.map((player) => player.id),
          )
        : null,
    [crew, design.state, mission.state, missionId],
  );

  useEffect(() => {
    if (!me.isHost || !intentContext || mission.intents.length === 0) return;
    for (const intent of mission.intents) {
      if (seenIntentIds.current.has(intent.id)) continue;
      seenIntentIds.current.add(intent.id);
      intentChain.current = intentChain.current
        .catch(() => undefined)
        .then(async () => {
          try {
            await mission.update((current) =>
              applyMissionIntent(
                syncMissionPositions(current, positionsRef.current),
                intent,
                intentContext,
                Date.now(),
              ),
            );
            await mission.removeIntent(intent.id);
          } catch (error: unknown) {
            seenIntentIds.current.delete(intent.id);
            setActionError(
              error instanceof Error ? error.message : 'Crew action could not be processed.',
            );
          }
        });
    }
  }, [
    intentContext,
    me.isHost,
    mission.intents,
    mission.removeIntent,
    mission.update,
  ]);

  const state = mission.state;
  const missionNow = state
    ? (state.lastTickAt ?? state.startedAt) + (now - snapshotAt)
    : now;
  const markers = useMemo(
    () =>
      state
        ? getMissionMarkers({ state, playerId: me.id, players: crew, now: missionNow })
        : [],
    [crew, me.id, missionNow, state],
  );
  const roleAssignments = design.state?.roleAssignments;
  const topPosition = myPosition ?? mission.positions[me.id];
  const selectedEvent = state?.events.find(
    (event) =>
      event.system === selectedStation &&
      event.status === 'pending' &&
      event.startsAt <= missionNow,
  );
  const activeEvent = state?.events.find(
    (event) =>
      event.startsAt <= missionNow &&
      event.status !== 'resolved' &&
      event.status !== 'failed',
  );
  const selectedDiagnosedEvent = state?.events.find(
    (event) =>
      event.system === selectedStation &&
      event.status === 'diagnosed' &&
      event.startsAt <= missionNow,
  );
  const responseOptions =
    selectedEvent && design.state && state
      ? getMissionResponsesForEvent(selectedEvent, design.state, state, missionId)
      : [];
  const eventGuideId = selectedEvent
    ? getMissionFixtureForEvent(selectedEvent, missionId)?.tutorialStepId
    : undefined;
  const eventGuide = TUTORIAL_STEPS.find((step) => step.id === eventGuideId);
  const atSelectedStation = isNearStation(topPosition, selectedStation);
  const selectedSystem = isSystemStation(selectedStation) ? selectedStation : null;
  const stars =
    state && design.state && state.outcome !== 'running'
      ? getStars(state, crew, design.state, missionId)
      : [];
  const missionDays = design.state
    ? state?.missionDays ?? calculateDesignStats(design.state, content).missionDays
    : 0;

  const sendAction = useCallback(
    (action: MissionIntentAction) => {
      void mission.sendIntent(action).catch((error: unknown) => {
        setActionError(
          error instanceof Error ? error.message : 'Crew action could not be sent.',
        );
      });
    },
    [mission.sendIntent],
  );

  const interact = useCallback(
    (station: MissionStationId) => {
      const current = missionStateRef.current;
      const position = myPosition ?? positionsRef.current[me.id];
      if (!current || !isNearStation(position, station)) return;
      const currentPlayer = current.players[me.id];
      if (station === 'storage') {
        if (!currentPlayer?.carrying && current.resources.spares > 0) {
          sendAction({ kind: 'pickup-spare' });
        }
        return;
      }
      if (!isSystemStation(station)) return;
      const event = current.events.find(
        (candidate) =>
          candidate.status === 'diagnosed' &&
          candidate.startsAt <= missionNow &&
          (candidate.system === station ||
            candidate.requiresAssistSystem === station),
      );
      if (!event) return;
      if (
        event.system === station &&
        event.requiresSpare &&
        !event.spareDelivered &&
        currentPlayer?.carrying === 'spare'
      ) {
        sendAction({ kind: 'deliver-spare', eventId: event.id });
        return;
      }
      if (event.system === station && event.requiresSpare && !event.spareDelivered) {
        return;
      }
      sendAction({
        kind: 'repair-start',
        eventId: event.id,
        mode: event.system === station ? 'repair' : 'assist',
        station,
      });
    },
    [me.id, missionNow, myPosition, sendAction],
  );

  const releaseInteraction = useCallback(() => {
    if (missionStateRef.current?.outcome === 'running') {
      sendAction({ kind: 'repair-stop' });
    }
  }, [sendAction]);

  const retry = useCallback(() => {
    if (!me.isHost || !design.state || !state || !canRetryMission(state)) return;
    const nextAttempt = state.attempt + 1;
    const nextState = createMissionFlightState(
      roomCode,
      missionId,
      design.state,
      crew.map((player) => player.id),
      nextAttempt,
    );
    void mission
      .update((current) =>
        current.outcome === 'lost' &&
        current.attempt === state.attempt &&
        canRetryMission(current)
          ? nextState
          : current,
      )
      .then(() => setActionError(null))
      .catch((error: unknown) => {
        setActionError(error instanceof Error ? error.message : 'Retry could not start.');
      });
  }, [crew, design.state, me.isHost, mission.update, roomCode, state]);

  const remaining = state
    ? MISSION_SECONDS * (1 - state.progress)
    : MISSION_SECONDS;
  const resources = state
    ? Object.fromEntries(
        RESOURCE_KEYS.map((resource) => [
          resource,
          {
            value: state.resources[resource],
            maximum: Math.max(1, state.resourceMax?.[resource] ?? state.resources[resource]),
          },
        ]),
      )
    : {};

  return (
    <CapsuleShell
      missionId={missionId}
      progress={state?.progress ?? 0}
      resources={resources}
      compactWindow
      showOnboarding
    >
      <MissionWarningBridge state={state} now={missionNow} />
      <section className={styles.flight} aria-label={`${content.name} mission flight`}>
        <header className={styles.header}>
          <div className={styles.flightIdentity}>
            <span className={styles.missionGlyph} aria-hidden="true">✦</span>
            <span>
              <strong>{content.name} Flight</strong>
              <small>Attempt {state?.attempt ?? 1} · {crew.length} crew</small>
            </span>
          </div>
          <div className={styles.clock} data-low={remaining <= 30}>
            <span>Mission clock</span>
            <strong>{formatClock(remaining)}</strong>
            <small>
              {design.state
                ? `${Math.floor((state?.progress ?? 0) * missionDays)} / ${missionDays} days`
                : 'Awaiting design'}
            </small>
            <MarkerSlot markers={markers} anchor="mission-clock" />
          </div>
          <div className={styles.hostLabel}>
            {me.isHost ? 'HOST' : 'CREW'}
            {activeEvent && (
              <span className={styles.alertPip} aria-label="Active event">!</span>
            )}
          </div>
        </header>

        {state && design.state && state.outcome === 'running' && (
          <div className={styles.missionTracker}>
            <Suspense fallback={<div className={styles.trackerLoading} role="status">Loading tracker…</div>}>
              <MissionVizTracker
                missionId={missionId}
                mode="compact"
                progress={state.progress}
                missionDays={missionDays}
                events={state.events}
                startedAt={state.startedAt}
              />
            </Suspense>
            <MarkerSlot markers={markers} anchor="mission-tracker" />
          </div>
        )}

        {(design.error || mission.error || actionError) && (
          <p className={styles.error} role="alert">
            {actionError ?? mission.error ?? design.error}
          </p>
        )}

        {(!state || design.loading) && (
          <div className={styles.loading} role="status">
            {design.loading || mission.loading
              ? 'Linking flight systems…'
              : design.state
                ? 'Host starting mission…'
                : 'Waiting for design…'}
          </div>
        )}

        {state && design.state && state.outcome === 'running' && (
          <>
            <div className={styles.mainLayout}>
              <div className={styles.mapSection}>
                <div className={styles.sectionHeading}>
                  <h1>Cabin</h1>
                  <span>{activeEvent ? 'EVENT ACTIVE' : 'SYSTEMS NOMINAL'}</span>
                </div>
                <CabinMap
                  me={me}
                  players={crew}
                  mission={state}
                  now={missionNow}
                  positions={mission.positions}
                  roleAssignments={roleAssignments ?? assignMissionRoles(crew)}
                  onPosition={(position) => {
                    setMyPosition(position);
                    void mission.sendPosition(position).catch((error: unknown) => {
                      setActionError(
                        error instanceof Error ? error.message : 'Position could not sync.',
                      );
                    });
                  }}
                  onSelectStation={setSelectedStation}
                  onInteract={interact}
                  onRelease={releaseInteraction}
                  markers={markers}
                />
              </div>

              <aside className={styles.systemRail} aria-label="System status">
                <h2>System status</h2>
                {Object.entries(state.systems).map(([system, status]) => (
                  <button
                    key={system}
                    className={styles.systemGauge}
                    data-status={status.status}
                    type="button"
                    onClick={() => setSelectedStation(system as SystemId)}
                  >
                    <span className={styles.gaugeGlyph} aria-hidden="true">
                      {system === 'solar' ? '☼' : system === 'comms' ? '⌁' : '◇'}
                    </span>
                    <span>{SYSTEM_NAMES[system as SystemId]}</span>
                    <strong>{Math.ceil(status.health)}%</strong>
                  </button>
                ))}
                <MarkerSlot markers={markers} anchor="mission-resource" />
              </aside>
            </div>

            <div className={styles.console}>
              <section className={styles.stationConsole} aria-live="polite">
                <div className={styles.sectionHeading}>
                  <h2>{STATION_NAMES[selectedStation]} console</h2>
                  <span>{atSelectedStation ? 'IN RANGE' : 'APPROACH STATION'}</span>
                </div>
                <MarkerSlot markers={markers} anchor="mission-response" />
                {selectedEvent && atSelectedStation ? (
                  <div className={styles.responsePanel}>
                    <strong>{fixtureName(selectedEvent, content)}</strong>
                    <span>{formatClock((selectedEvent.deadlineAt - missionNow) / 1000)} remaining</span>
                    {eventGuide && <small className={styles.eventGuide}>{eventGuide.body}</small>}
                    <div className={styles.responseChoices}>
                      {responseOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          disabled={!atSelectedStation || !state.players[me.id]}
                          onClick={() =>
                            sendAction({
                              kind: 'diagnose',
                              eventId: selectedEvent.id,
                              responseId: option.id,
                            })
                          }
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : selectedDiagnosedEvent &&
                  selectedSystem !== null &&
                  (selectedDiagnosedEvent.system === selectedSystem ||
                    selectedDiagnosedEvent.requiresAssistSystem === selectedSystem) ? (
                  <p className={styles.prompt}>
                    {selectedDiagnosedEvent.requiresSpare && !selectedDiagnosedEvent.spareDelivered
                      ? 'Deliver a spare.'
                      : selectedDiagnosedEvent.requiresAssistSystem === selectedStation
                        ? 'Hold E · Assist'
                        : 'Hold E · Repair'}
                  </p>
                ) : (
                  <p className={styles.prompt}>
                    {atSelectedStation
                      ? 'No active task.'
                      : 'Reach a station.'}
                  </p>
                )}
              </section>

              <section className={styles.eventLog} aria-label="Event timeline">
                <h2>Event log</h2>
                {state.events.length === 0 ? (
                  <p className={styles.prompt}>No events scheduled.</p>
                ) : (
                  state.events.map((event) => (
                    <div className={styles.eventRow} key={event.id} data-status={event.status}>
                      <span className={styles.eventMark} aria-hidden="true">
                        {event.status === 'resolved' ? '✓' : event.status === 'failed' ? '×' : '●'}
                      </span>
                      <span>{fixtureName(event, content)}</span>
                      <small>{eventStatusLabel(event)}</small>
                    </div>
                  ))
                )}
              </section>
            </div>
          </>
        )}

        {state && state.outcome !== 'running' && (
          <section className={styles.debrief} aria-labelledby="debrief-title">
            <div className={styles.debriefIcon} data-outcome={state.outcome} aria-hidden="true">
              {state.outcome === 'won' ? '✓' : '×'}
            </div>
            <h1 id="debrief-title">
              {state.outcome === 'won' ? `${content.name} mission complete` : 'Mission lost'}
            </h1>
            <p className={styles.debriefCopy}>
              {state.outcome === 'won'
                ? 'All scheduled events were resolved and critical resources lasted to mission end.'
                : `${state.lostReason ?? 'The mission ended early.'} The crew can review the attempt and retry.`}
            </p>
            <div className={styles.stars} aria-label="Mission stars">
              {stars.map((star) => (
                <span key={star.id} data-earned={star.earned}>
                  {star.earned ? '★' : '☆'} {star.label}
                </span>
              ))}
            </div>
            {state.outcome === 'lost' && (
              <p className={styles.attempts}>
                Attempt {state.attempt} of 3 · {Math.max(0, 3 - state.attempt)} retries left
              </p>
            )}
            <div className={styles.debriefEvents}>
              {state.events.map((event) => (
                <article className={styles.debriefEvent} key={event.id} data-status={event.status}>
                  <div className={styles.eventRow}>
                    <span className={styles.eventMark} aria-hidden="true">
                      {event.status === 'resolved' ? '✓' : event.status === 'failed' ? '×' : '●'}
                    </span>
                    <strong>{fixtureName(event, content)}</strong>
                    <small>{eventStatusLabel(event)}</small>
                  </div>
                  {researchForEvent(event, content) ? (
                    <div className={styles.researchNote}>
                      <strong>What really happened</strong>
                      {researchForEvent(event, content)?.whatReallyHappened.map((sentence) => (
                        <p key={sentence}>{sentence}</p>
                      ))}
                      <a
                        href={researchForEvent(event, content)?.source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ↗ Source
                      </a>
                    </div>
                  ) : (
                    <p className={styles.researchNote}>No historical analog is available for this event.</p>
                  )}
                </article>
              ))}
            </div>
            <section className={styles.analogs} aria-labelledby="analogs-title">
              <h2 id="analogs-title">Real analog missions</h2>
              {content.analogMissions.map((analog) => (
                <div key={analog.id}>
                  <strong>{analog.title}</strong>
                  <p>{analog.summary}</p>
                  <a href={analog.source.url} target="_blank" rel="noreferrer">
                    ↗ Source
                  </a>
                </div>
              ))}
            </section>
            <div className={styles.replayLauncher}>
              <button
                id="mission-replay"
                type="button"
                onClick={() => setShowReplay(true)}
              >
                Replay flight
              </button>
              <MarkerSlot markers={markers} anchor="mission-replay" />
            </div>
            <p className={styles.creditLine}>
              Tracker reimplemented from scratch, inspired by NASA Mission Viz. NASA does not endorse this project.
            </p>
            <MarkerSlot markers={markers} anchor="mission-debrief" />
            <div className={styles.debriefActions}>
              {state.outcome === 'won' ? (
                <button type="button" onClick={() => void onContinue()}>
                  Continue
                </button>
              ) : canRetryMission(state) ? (
                <button type="button" disabled={!me.isHost} onClick={retry}>
                  {me.isHost ? 'Retry mission' : 'Waiting for host'}
                </button>
              ) : (
                <button type="button" onClick={() => void onContinue()}>
                  Continue campaign
                </button>
              )}
            </div>
          </section>
        )}

        <aside className={styles.guide} aria-label="Flight guide">
          <button
            type="button"
            className={styles.guideToggle}
            onClick={() => setShowGuide((visible) => !visible)}
          >
            {showGuide ? 'Skip guide' : 'Replay guide'}
          </button>
          {showGuide && (
            <div className={styles.guideSteps}>
              {TUTORIAL_STEPS.filter(
                (step) =>
                  step.phase === 'v2-mission' &&
                  [
                    'mission-walk',
                    'mission-diagnose',
                    'mission-repair',
                    'mission-tracker',
                    'mission-debrief',
                    'mission-replay',
                  ].includes(step.id),
              ).filter(
                (step) =>
                  (step.id !== 'mission-tracker' || state?.outcome === 'running') &&
                  (!['mission-debrief', 'mission-replay'].includes(step.id) ||
                    state?.outcome !== 'running'),
              ).map(
                (step) => (
                  <div key={step.id}>
                    <strong>{step.title}</strong>
                    <span>{step.body}</span>
                  </div>
                ),
              )}
            </div>
          )}
        </aside>
      </section>
      {showReplay && state && (
        <Suspense fallback={<div role="status">Loading flight replay…</div>}>
          <MissionVizTracker
            missionId={missionId}
            mode="replay"
            progress={state.progress}
            missionDays={missionDays}
            events={state.events}
            startedAt={state.startedAt}
            markers={markers}
            showTutorial={showGuide}
            onClose={() => setShowReplay(false)}
          />
        </Suspense>
      )}
    </CapsuleShell>
  );
}

function MissionWarningBridge({
  state,
  now,
}: {
  state: ReturnType<typeof useMission>['state'];
  now: number;
}) {
  const { raiseWarning, dismissWarning, clearWarnings } = useWarnings();
  const warningIds = useRef(new Set<string>());

  useEffect(
    () => () => {
      clearWarnings();
    },
    [clearWarnings],
  );

  useEffect(() => {
    if (!state) return;
    const activeEvents = state.events.filter(
      (event) =>
        event.startsAt <= now &&
        event.status !== 'resolved' &&
        event.status !== 'failed',
    );
    const activeIds = new Set(activeEvents.map((event) => event.id));
    for (const event of activeEvents) {
      if (warningIds.current.has(event.id)) continue;
      warningIds.current.add(event.id);
      raiseWarning({
        id: `mission-${event.id}`,
        level: event.level,
        system: event.system,
        effect: event.windowEffect,
        countdownSeconds: Math.max(1, (event.deadlineAt - now) / 1000),
      });
    }
    for (const id of warningIds.current) {
      if (!activeIds.has(id)) {
        dismissWarning(`mission-${id}`);
        warningIds.current.delete(id);
      }
    }
  }, [dismissWarning, now, raiseWarning, state]);

  return null;
}
