import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { MarkerSlot } from '../../components/MarkerBadge';
import { CapsuleShell } from '../capsule';
import { getMissionV2Content } from '../../content/missions-v2';
import { getDesignMarkers } from '../../lib/markers';
import { DESIGN_TUTORIAL_STEPS, TUTORIAL_STEPS } from '../../lib/tutorial';
import { useDesign } from '../../shared/hooks/useDesign';
import type {
  DesignPingMessage,
  DesignState,
  MissionId,
  Player,
  ResourceKey,
  RoleId,
  SystemId,
} from '../../shared/types';
import {
  calculateDesignStats,
  canLaunchEarly,
  createInitialDesignState,
  DESIGN_SECONDS,
  DESIGN_SYSTEMS,
  getCargoCells,
  getReadinessGates,
  getSegmentChecklist,
  getSubsystemOption,
} from './designLogic';
import { assignMissionRoles, MISSION_ROLES, rolesForPlayer } from './roles';
import { hasEveryVote, resolveObjectivePair, resolveSingleChoice } from './voting';
import RadarChart from './RadarChart';
import RiskRadar from './RiskRadar';
import styles from './DesignScene.module.css';

const MissionVizTracker = lazy(() => import('../missionViz/MissionVizTracker'));

const SYSTEM_LABELS: Record<SystemId, string> = {
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

const STAGES = [
  { id: 'concept', label: 'Concept', glyph: '◇' },
  { id: 'feasibility', label: 'Feasibility', glyph: '◉' },
  { id: 'trade', label: 'Trade', glyph: '⌘' },
  { id: 'point-design', label: 'Point design', glyph: '⬡' },
  { id: 'review', label: 'Review', glyph: '✓' },
] as const;

const PING_MESSAGES: { id: DesignPingMessage; glyph: string; label: string; to: RoleId }[] = [
  { id: 'power', glyph: 'ϟ', label: 'Need power', to: 'power-thermal' },
  { id: 'mass', glyph: '⬡', label: 'Too heavy', to: 'lead' },
  { id: 'budget', glyph: '$', label: 'Over budget', to: 'lead' },
  { id: 'good', glyph: '✓', label: 'Looks good', to: 'lead' },
];

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  fuel: 'Fuel',
  power: 'Power',
  oxygen: 'Oxygen',
  water: 'Water',
  food: 'Food',
  shielding: 'Shielding',
  spares: 'Spares',
};

interface DesignSceneProps {
  roomCode: string;
  missionId: MissionId;
  me: Player;
  players: Player[];
  onContinue: () => void | Promise<void>;
  mock?: boolean;
  allowSeatSwitch?: boolean;
}

function connectedPlayers(players: Player[]): Player[] {
  return players
    .filter((player) => player.connected)
    .sort((left, right) => left.joinOrder - right.joinOrder);
}

function timerLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function withoutRoleSwapRequest(state: DesignState): DesignState {
  const next = { ...state };
  delete next.roleSwapRequest;
  return next;
}

function initialEmergencyDesign(
  state: DesignState,
  content: ReturnType<typeof getMissionV2Content>,
): DesignState {
  const objectives = [...state.objectiveIds];
  for (const objective of content.objectives) {
    if (objectives.length >= 2) break;
    if (!objectives.includes(objective.id)) objectives.push(objective.id);
  }
  const defaultModules: Partial<Record<SystemId, string>> = {};
  for (const system of DESIGN_SYSTEMS) {
    const option = content.subsystemOptions.find(
      (candidate) => candidate.system === system && candidate.redundant,
    ) ?? content.subsystemOptions.find((candidate) => candidate.system === system);
    if (option) defaultModules[system] = option.id;
  }
  const modules: Partial<Record<SystemId, string>> = {
    ...defaultModules,
    ...state.modules,
  };
  const installedModules: Partial<Record<SystemId, string>> = {
    ...modules,
    ...state.installedModules,
  };
  const window = content.launchWindows.find(
    (item) => item.id === state.launchWindowId,
  ) ?? content.launchWindows[1] ?? content.launchWindows[0];
  const missionDays =
    Math.max(
      ...objectives.map(
        (id) => content.objectives.find((item) => item.id === id)?.durationDays ?? 0,
      ),
    ) + (window?.tripDays ?? 0);
  const lifeSupportCrates = Math.ceil(
    missionDays / content.cargoRules.daysPerLifeSupportCrate,
  );
  const cargo = {
    fuel: Math.max(state.cargo.fuel, window?.fuelCrates ?? 0),
    power: state.cargo.power,
    oxygen: Math.max(state.cargo.oxygen, lifeSupportCrates),
    water: Math.max(state.cargo.water, lifeSupportCrates),
    food: Math.max(state.cargo.food, lifeSupportCrates),
    shielding: state.cargo.shielding,
    spares: Math.max(state.cargo.spares, 1),
  };
  const vehicle =
    content.launchVehicles.find((item) => item.id === state.launchVehicleId) ??
    content.launchVehicles.find((item) =>
      !item.incompatibleObjectives?.some((item) =>
        objectives.includes(item.objectiveId),
      ),
    ) ?? content.launchVehicles[0];
  const incompatibleVehicle = vehicle?.incompatibleObjectives?.some((item) =>
    objectives.includes(item.objectiveId),
  );
  const craft =
    content.spacecraft.find((item) => item.id === state.craftId) ??
    content.spacecraft.find((item) =>
      !item.incompatibleObjectives?.some((item) =>
        objectives.includes(item.objectiveId),
      ),
    ) ?? content.spacecraft[1] ?? content.spacecraft[0];
  const incompatibleCraft = craft?.incompatibleObjectives?.some((item) =>
    objectives.includes(item.objectiveId),
  );

  return {
    ...state,
    stage: 'review',
    objectiveIds: objectives,
    launchVehicleId: incompatibleVehicle
      ? content.launchVehicles[1]?.id ?? null
      : vehicle?.id ?? null,
    craftId: incompatibleCraft
      ? content.spacecraft[1]?.id ?? null
      : craft?.id ?? null,
    modules,
    installedModules,
    launchWindowId: window?.id ?? null,
    cargo,
    ready: [],
    rushed: true,
  };
}

export default function DesignScene({
  roomCode,
  missionId,
  me,
  players,
  onContinue,
  mock,
  allowSeatSwitch = false,
}: DesignSceneProps) {
  const content = getMissionV2Content(missionId);
  const crew = useMemo(() => connectedPlayers(players), [players]);
  const rolePlayers = crew.length > 0 ? crew : [me];
  const { state, loading, error, update } = useDesign({
    roomCode,
    missionId,
    ...(mock !== undefined ? { mock } : {}),
  });
  const [selectedPlayerId, setSelectedPlayerId] = useState(me.id);
  const [selectedRole, setSelectedRole] = useState<RoleId>('lead');
  const [objectiveSelection, setObjectiveSelection] = useState<string[]>([]);
  const [swapTarget, setSwapTarget] = useState<string>('');
  const [draggedSystem, setDraggedSystem] = useState<SystemId | null>(null);
  const [now, setNow] = useState(Date.now);
  const [showGuide, setShowGuide] = useState(true);
  const [showWindowPlanner, setShowWindowPlanner] = useState(false);
  const initialized = useRef(false);
  const autoLaunchFired = useRef(false);

  const activePlayer =
    crew.find((player) => player.id === selectedPlayerId) ?? me;
  const roleAssignments = useMemo(() => {
    if (
      state?.roleAssignments &&
      Object.values(state.roleAssignments).every((id) =>
        crew.some((player) => player.id === id),
      ) &&
      crew.every((player) =>
        Object.values(state.roleAssignments ?? {}).includes(player.id),
      )
    ) {
      return state.roleAssignments;
    }
    return assignMissionRoles(rolePlayers);
  }, [rolePlayers, state?.roleAssignments]);
  const myRoles = rolesForPlayer(activePlayer.id, roleAssignments);
  const activeRole = myRoles.includes(selectedRole) ? selectedRole : myRoles[0] ?? 'lead';
  const tutorial = TUTORIAL_STEPS.find((step) => step.id === `design-${state?.stage === 'point-design' ? 'point' : state?.stage}`);
  const secondsLeft = state
    ? Math.max(0, Math.ceil((state.endsAt - now) / 1000))
    : DESIGN_SECONDS;
  const expired = secondsLeft === 0;
  const allReady =
    crew.length > 0 &&
    crew.every((player) => Boolean(state?.ready.includes(player.id)));
  const markers = state
    ? getDesignMarkers({
        state,
        playerId: activePlayer.id,
        players: crew,
        now,
        missionId,
      })
    : [];
  const stats = state ? calculateDesignStats(state, content) : null;
  const gates = state ? getReadinessGates(state, missionId) : [];
  const segments = state ? getSegmentChecklist(state, missionId) : [];
  const hasRedGate = gates.some((gate) => gate.status === 'red');

  const changeState = useCallback(
    (transform: (current: DesignState) => DesignState) => {
      void update((current) => {
        const base = current ?? createInitialDesignState();
        return transform(base);
      }).catch(() => undefined);
    },
    [update],
  );

  useEffect(() => {
    if (
      !state ||
      MISSION_ROLES.every(
        (role) => state.roleAssignments?.[role.id] === roleAssignments[role.id],
      )
    ) {
      return;
    }
    changeState((current) => ({ ...current, roleAssignments }));
  }, [changeState, roleAssignments, state]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!crew.some((player) => player.id === me.id)) return;
    setSelectedPlayerId((current) =>
      crew.some((player) => player.id === current) ? current : me.id,
    );
  }, [crew, me.id]);

  useEffect(() => {
    setSelectedRole(myRoles[0] ?? 'lead');
  }, [activePlayer.id, myRoles.join('|')]);

  useEffect(() => {
    if (loading || state || initialized.current) return;
    initialized.current = true;
    void update((current) => {
      const base = current ?? createInitialDesignState();
      return {
        ...base,
        roleAssignments: base.roleAssignments ?? assignMissionRoles(rolePlayers),
      };
    }).catch(() => {
      initialized.current = false;
    });
  }, [loading, rolePlayers, state, update]);

  useEffect(() => {
    if (
      !state ||
      !me.isHost ||
      !canLaunchEarly(state, allReady, missionId) ||
      autoLaunchFired.current
    ) {
      return;
    }
    autoLaunchFired.current = true;
    void Promise.resolve(onContinue());
  }, [allReady, me.isHost, missionId, onContinue, state]);

  useEffect(() => {
    if (!state || !expired || state.rushed) return;
    changeState((current) => initialEmergencyDesign(current, content));
  }, [changeState, content, expired, state]);

  useEffect(() => {
    if (
      !state?.rushed ||
      !expired ||
      !me.isHost ||
      autoLaunchFired.current
    ) {
      return;
    }
    autoLaunchFired.current = true;
    void onContinue();
  }, [expired, me.isHost, onContinue, state?.rushed]);

  const castVote = (topic: string, value: string) => {
    changeState((current) => ({
      ...current,
      votes: {
        ...current.votes,
        [topic]: { ...current.votes[topic], [activePlayer.id]: value },
      },
    }));
  };

  const advanceConcept = () => {
    const votes = state?.votes.objectives ?? {};
    if (!state || !hasEveryVote(votes, crew.map((player) => player.id))) return;
    const objectiveIds = resolveObjectivePair(
      votes,
      crew.map((player) => player.id),
      content.objectives.map((objective) => objective.id),
      roleAssignments.lead,
    );
    if (objectiveIds.length !== 2) return;
    changeState((current) => ({
      ...current,
      objectiveIds,
      stage: 'feasibility',
      roleAssignments,
    }));
  };

  const currentFeasibilityTopic = state?.launchVehicleId ? 'craft' : 'vehicle';
  const feasibilityCandidates =
    currentFeasibilityTopic === 'vehicle'
      ? content.launchVehicles
      : content.spacecraft;
  const feasibilityVotes = state?.votes[currentFeasibilityTopic] ?? {};
  const allFeasibilityVotes =
    crew.length > 0 &&
    hasEveryVote(feasibilityVotes, crew.map((player) => player.id));

  const advanceFeasibility = () => {
    if (!state || !allFeasibilityVotes) return;
    const choice = resolveSingleChoice(
      feasibilityVotes,
      crew.map((player) => player.id),
      feasibilityCandidates.map((item) => item.id),
      roleAssignments.lead,
    );
    if (!choice) return;
    if (currentFeasibilityTopic === 'vehicle') {
      changeState((current) => ({
        ...current,
        launchVehicleId: choice,
        votes: { ...current.votes, craft: {} },
      }));
      return;
    }
    changeState((current) => ({
      ...current,
      craftId: choice,
      stage: 'trade',
    }));
  };

  const tradeSystems = MISSION_ROLES.find((role) => role.id === activeRole)?.systems ?? [];
  const allSystemsChosen = DESIGN_SYSTEMS.every((system) =>
    Boolean(state?.modules[system]),
  );
  const allModulesInstalled = DESIGN_SYSTEMS.every((system) =>
    Boolean(state?.installedModules?.[system]),
  );

  const installModule = (system: SystemId) => {
    const ownerRole = MISSION_ROLES.find((role) => role.systems.includes(system));
    if (!state || !ownerRole || roleAssignments[ownerRole.id] !== activePlayer.id) return;
    const optionId = state.modules[system];
    if (!optionId) return;
    changeState((current) => ({
      ...current,
      installedModules: {
        ...current.installedModules,
        [system]: optionId,
      },
    }));
  };

  const changeCargo = (resource: ResourceKey, difference: number) => {
    changeState((current) => {
      const currentCount = current.cargo[resource];
      const maxByCells =
        (content.cargoRules.gridCells + 1) * content.cargoRules.stackLimit;
      const cargo = {
        ...current.cargo,
        [resource]: Math.max(0, Math.min(maxByCells, currentCount + difference)),
      };
      if (getCargoCells(cargo, content) > content.cargoRules.gridCells) return current;
      return { ...current, cargo };
    });
  };

  const sendPing = (message: DesignPingMessage) => {
    const ping = PING_MESSAGES.find((item) => item.id === message);
    if (!ping) return;
    const ownerId = roleAssignments[ping.to];
    changeState((current) => ({
      ...current,
      pings: {
        ...current.pings,
        [ownerId]: { from: activePlayer.id, message, at: Date.now() },
      },
    }));
  };

  const sendSwapRequest = (toPlayerId: string, toRole: RoleId) => {
    if (!state || !myRoles.includes(activeRole) || toPlayerId === activePlayer.id) return;
    changeState((current) => ({
      ...current,
      roleSwapRequest: {
        fromPlayerId: activePlayer.id,
        toPlayerId,
        fromRole: activeRole,
        toRole,
      },
    }));
  };

  const acceptSwap = () => {
    changeState((current) => {
      const request = current.roleSwapRequest;
      if (!request || request.toPlayerId !== activePlayer.id) return current;
      const assignments = current.roleAssignments ?? roleAssignments;
      if (
        assignments[request.fromRole] !== request.fromPlayerId ||
        assignments[request.toRole] !== request.toPlayerId
      ) {
        return withoutRoleSwapRequest(current);
      }
      return {
        ...withoutRoleSwapRequest(current),
        roleAssignments: {
          ...assignments,
          [request.fromRole]: request.toPlayerId,
          [request.toRole]: request.fromPlayerId,
        },
      };
    });
  };

  const voteWindow = (windowId: string) => castVote('window', windowId);
  const windowVotes = state?.votes.window ?? {};
  const allWindowVotes =
    crew.length > 0 &&
    hasEveryVote(windowVotes, crew.map((player) => player.id));
  const resolveWindow = () => {
    if (!state || !allWindowVotes) return;
    const launchWindowId = resolveSingleChoice(
      windowVotes,
      crew.map((player) => player.id),
      content.launchWindows.map((item) => item.id),
      roleAssignments.lead,
    );
    if (!launchWindowId) return;
    changeState((current) => ({
      ...current,
      launchWindowId,
    }));
  };

  const toggleReady = () => {
    changeState((current) => ({
      ...current,
      ready: current.ready.includes(activePlayer.id)
        ? current.ready.filter((id) => id !== activePlayer.id)
        : [...current.ready, activePlayer.id],
    }));
  };

  const launch = () => {
    if (!me.isHost || !allReady || !state) return;
    autoLaunchFired.current = true;
    void Promise.resolve(onContinue());
  };

  const ownerOfSystem = (system: SystemId): string | undefined => {
    const ownerRole = MISSION_ROLES.find((role) => role.systems.includes(system));
    return ownerRole ? roleAssignments[ownerRole.id] : undefined;
  };

  const renderVoteCounts = (topic: string, choiceId: string) => {
    const votes = state?.votes[topic] ?? {};
    const count = Object.values(votes).filter((choice) => choice === choiceId).length;
    return <span className={styles.voteCount}>{count} votes</span>;
  };

  const selectedWindow = state?.launchWindowId
    ? content.launchWindows.find((item) => item.id === state.launchWindowId)
    : undefined;
  const selectedPlannerWindow =
    content.launchWindows.find(
      (item) => item.id === windowVotes[activePlayer.id],
    ) ?? selectedWindow;

  if (loading || !state) {
    return (
      <CapsuleShell
        missionId={missionId}
        showOnboarding
        size="large"
        onboardingSteps={DESIGN_TUTORIAL_STEPS}
        onboardingStorageKey="t60.design.tutorial.v1"
      >
        <div className={styles.loading}>SYNCING DESIGN</div>
      </CapsuleShell>
    );
  }

  const activeStage = STAGES.findIndex((stage) => stage.id === state.stage);
  const selectedObjectives = state.objectiveIds
    .map((id) => content.objectives.find((item) => item.id === id))
    .filter((objective): objective is (typeof content.objectives)[number] =>
      Boolean(objective),
    );

  return (
    <CapsuleShell
      missionId={missionId}
      progress={0.14}
      showOnboarding
      size="large"
      onboardingSteps={DESIGN_TUTORIAL_STEPS}
      onboardingStorageKey="t60.design.tutorial.v1"
    >
      <div className={styles.designConsole} aria-label={`${content.name} mission design`}>
        <header className={styles.topLine}>
          <div className={styles.stages} aria-label="Design stages">
            {STAGES.map((stage, index) => (
              <span
                className={styles.stageToken}
                data-current={stage.id === state.stage}
                data-complete={index < activeStage}
                key={stage.id}
              >
                <span aria-hidden="true">{stage.glyph}</span>
                <span>{stage.label}</span>
              </span>
            ))}
          </div>
          <div className={styles.timer} data-expired={expired} aria-label="Design time remaining">
            <span aria-hidden="true">◷</span>
            <time>{timerLabel(secondsLeft)}</time>
          </div>
        </header>

        <section className={styles.crewBar} id="design-crew">
          <div className={styles.crewTokens}>
            {crew.map((player) => (
              <span
                className={styles.crewToken}
                data-active={player.id === activePlayer.id}
                key={player.id}
                style={{ '--crew-color': player.color } as CSSProperties}
              >
                <span className={styles.crewDot} aria-hidden="true" />
                {player.name}
                <small>
                  {MISSION_ROLES.filter(
                    (role) => roleAssignments[role.id] === player.id,
                  )
                    .map((role) => role.label.split(' ')[0])
                    .join(' / ')}
                </small>
              </span>
            ))}
          </div>
          {allowSeatSwitch && (
            <div className={styles.seatSwitch} role="group" aria-label="Demo player seat">
              <span>Play as</span>
              {crew.map((player) => (
                <button
                  className={styles.seatButton}
                  type="button"
                  aria-pressed={activePlayer.id === player.id}
                  onClick={() => {
                    setSelectedPlayerId(player.id);
                    setObjectiveSelection([]);
                  }}
                  key={player.id}
                >
                  {player.name}
                </button>
              ))}
            </div>
          )}
        </section>

        <div className={styles.subsystemRail} aria-label="Subsystem status">
          {DESIGN_SYSTEMS.map((system) => {
            const option = getSubsystemOption(state.modules[system], content);
            return (
              <div className={styles.systemGauge} key={system}>
                <span aria-hidden="true">{SYSTEM_GLYPHS[system]}</span>
                <span>{SYSTEM_LABELS[system]}</span>
                <strong>{option ? option.label : 'OPEN'}</strong>
                <small>{option?.reliability ? `${Math.round(option.reliability * 100)}%` : '—'}</small>
              </div>
            );
          })}
        </div>

        <div className={styles.pingRow} aria-label="Crew pings">
          <span className={styles.pingLabel}>Crew pings</span>
          {PING_MESSAGES.map((ping) => (
            <button
              className={styles.pingButton}
              type="button"
              onClick={() => sendPing(ping.id)}
              key={ping.id}
              title={ping.label}
              aria-label={ping.label}
            >
              <span aria-hidden="true">{ping.glyph}</span>
              <span>{ping.label}</span>
            </button>
          ))}
          <MarkerSlot markers={markers} anchor="design-crew" />
        </div>

        {tutorial && (
          <aside className={styles.tutorial} aria-label="Stage tutorial">
            {showGuide && (
              <>
                <span className={styles.tutorialGlyph} aria-hidden="true">
                  {tutorial.visual ?? '◇'}
                </span>
                <span className={styles.tutorialCopy}>
                  <strong>{tutorial.title}</strong>
                  <span>{tutorial.body}</span>
                </span>
              </>
            )}
            <button
              className={styles.quietButton}
              type="button"
              onClick={() => setShowGuide((visible) => !visible)}
            >
              {showGuide ? 'Skip guide' : 'Replay guide'}
            </button>
          </aside>
        )}

        <section className={styles.stageContent} id="design-console">
          {state.stage === 'concept' && (
            <section id="design-objectives" aria-labelledby="stage-title">
              <div className={styles.stageHeading}>
                <div>
                  <span className={styles.kicker}>01 / CONCEPT</span>
                  <h1 id="stage-title">Choose two objectives</h1>
                </div>
                <span className={styles.stageGlyph} aria-hidden="true">◇</span>
              </div>
              <div className={styles.objectiveGrid}>
                {content.objectives.map((objective) => {
                  const selected = objectiveSelection.includes(objective.id);
                  const count = Object.values(state.votes.objectives ?? {}).filter(
                    (ballot) => ballot.split('|').includes(objective.id),
                  ).length;
                  return (
                    <button
                      className={styles.objectiveCard}
                      type="button"
                      data-selected={selected}
                      aria-pressed={selected}
                      key={objective.id}
                      onClick={() =>
                        setObjectiveSelection((current) => {
                          if (current.includes(objective.id)) {
                            return current.filter((id) => id !== objective.id);
                          }
                          return current.length < 2
                            ? [...current, objective.id]
                            : [...current.slice(1), objective.id];
                        })
                      }
                    >
                      <span className={styles.cardGlyph} aria-hidden="true">◈</span>
                      <strong>{objective.label}</strong>
                      <span>{objective.payload}</span>
                      <small>{objective.durationDays} days · {objective.payloadMass} mass</small>
                      <span className={styles.ballotChips}>{count} crew votes</span>
                    </button>
                  );
                })}
              </div>
              <div className={styles.actionRow}>
                <span className={styles.selectionCount}>{objectiveSelection.length} / 2 selected</span>
                <button
                  className={styles.primaryButton}
                  type="button"
                  disabled={objectiveSelection.length !== 2}
                  onClick={() => {
                    if (objectiveSelection.length === 2) {
                      castVote('objectives', [...objectiveSelection].join('|'));
                    }
                  }}
                >
                  Cast vote
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={
                    crew.length === 0 ||
                    !hasEveryVote(
                      state.votes.objectives ?? {},
                      crew.map((player) => player.id),
                    )
                  }
                  onClick={advanceConcept}
                >
                  Set objectives
                </button>
              </div>
              <MarkerSlot markers={markers} anchor="design-objectives" />
            </section>
          )}

          {state.stage === 'feasibility' && (
            <section id="design-hangar" aria-labelledby="stage-title">
              <div className={styles.stageHeading}>
                <div>
                  <span className={styles.kicker}>02 / FEASIBILITY</span>
                  <h1 id="stage-title">
                    Vote: {currentFeasibilityTopic === 'vehicle' ? 'launch vehicle' : 'spacecraft'}
                  </h1>
                </div>
                <span className={styles.stageGlyph} aria-hidden="true">◉</span>
              </div>
              <div className={styles.selectedObjectives}>
                {selectedObjectives.map((objective) => (
                  <span className={styles.objectiveChip} key={objective.id}>
                    ◈ {objective.label}
                  </span>
                ))}
              </div>
              <div className={styles.choiceGrid}>
                {feasibilityCandidates.map((candidate) => {
                  const incompatibility = candidate.incompatibleObjectives?.find((item) =>
                    state.objectiveIds.includes(item.objectiveId),
                  );
                  const candidateRisk = 'risk' in candidate ? candidate.risk : 0.5;
                  const candidateReliability =
                    'reliability' in candidate ? candidate.reliability : 0.5;
                  const fit = Math.min(1, candidate.massCapacity / 48);
                  const selected =
                    feasibilityVotes[activePlayer.id] === candidate.id;
                  return (
                    <button
                      className={styles.hangarCard}
                      type="button"
                      key={candidate.id}
                      disabled={Boolean(incompatibility)}
                      data-selected={selected}
                      data-incompatible={Boolean(incompatibility)}
                      aria-pressed={selected}
                      title={incompatibility?.reason}
                      onClick={() =>
                        !incompatibility &&
                        castVote(currentFeasibilityTopic, candidate.id)
                      }
                    >
                      <span className={styles.cardGlyph} aria-hidden="true">
                        {currentFeasibilityTopic === 'vehicle' ? '▲' : '⬡'}
                      </span>
                      <strong>{candidate.label}</strong>
                      <span>
                        {candidate.massCapacity} mass · {candidate.cost} cost
                      </span>
                      {currentFeasibilityTopic === 'craft' &&
                        'powerCapacity' in candidate &&
                        typeof candidate.powerCapacity === 'number' && (
                          <span>{candidate.powerCapacity} power</span>
                        )}
                      <RiskRadar
                        risk={candidateRisk}
                        reliability={candidateReliability}
                        fit={fit}
                      />
                      <span className={styles.radarLegend}>RISK · RELIABILITY · FIT</span>
                      {incompatibility ? (
                        <span className={styles.incompatible}>⊘ {incompatibility.reason}</span>
                      ) : (
                        renderVoteCounts(currentFeasibilityTopic, candidate.id)
                      )}
                    </button>
                  );
                })}
              </div>
              <div className={styles.actionRow}>
                <span className={styles.selectionCount}>
                  {Object.keys(feasibilityVotes).length} / {crew.length} votes
                </span>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={!allFeasibilityVotes}
                  onClick={advanceFeasibility}
                >
                  {currentFeasibilityTopic === 'vehicle' ? 'Lock vehicle' : 'Lock craft'}
                </button>
              </div>
              <MarkerSlot markers={markers} anchor="design-hangar" />
            </section>
          )}

          {state.stage === 'trade' && (
            <section id="design-trade" aria-labelledby="stage-title">
              <div className={styles.stageHeading}>
                <div>
                  <span className={styles.kicker}>03 / TRADE STUDIES</span>
                  <h1 id="stage-title">Choose system architectures</h1>
                </div>
                <span className={styles.stageGlyph} aria-hidden="true">⌘</span>
              </div>
              <div className={styles.roleStations}>
                {myRoles.length > 1 ? (
                  <div className={styles.roleSwitcher} role="group" aria-label="Your roles">
                    {myRoles.map((roleId) => {
                      const role = MISSION_ROLES.find((item) => item.id === roleId);
                      return (
                        <button
                          className={styles.roleTab}
                          aria-pressed={roleId === activeRole}
                          type="button"
                          key={roleId}
                          onClick={() => setSelectedRole(roleId)}
                        >
                          {role?.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className={styles.roleName}>
                    {MISSION_ROLES.find((role) => role.id === activeRole)?.label}
                  </span>
                )}
                <span className={styles.stationName}>
                  {MISSION_ROLES.find((role) => role.id === activeRole)?.station}
                </span>
              </div>
              <div className={styles.tradeGrid}>
                {tradeSystems.map((system) => {
                  const options = content.subsystemOptions.filter(
                    (option) => option.system === system,
                  );
                  const owner = roleAssignments[activeRole];
                  const canEdit = owner === activePlayer.id;
                  return (
                    <article className={styles.tradeStation} key={system}>
                      <header>
                        <span aria-hidden="true">{SYSTEM_GLYPHS[system]}</span>
                        <strong>{SYSTEM_LABELS[system]}</strong>
                        <small>{canEdit ? 'YOUR CONSOLE' : 'VIEW ONLY'}</small>
                      </header>
                      <div className={styles.optionList}>
                        {options.map((option) => (
                          <button
                            className={styles.optionCard}
                            type="button"
                            disabled={!canEdit}
                            data-selected={state.modules[system] === option.id}
                            key={option.id}
                            onClick={() =>
                              changeState((current) => ({
                                ...current,
                                modules: { ...current.modules, [system]: option.id },
                              }))
                            }
                          >
                            <span className={styles.optionTitle}>
                              <span aria-hidden="true">{option.icon === 'engine' ? '▲' : '◇'}</span>
                              <strong>{option.label}</strong>
                            </span>
                            <RadarChart option={option} />
                            <span className={styles.optionStats}>
                              {option.mass} mass · {option.power} power · {option.cost} cost
                            </span>
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className={styles.actionRow}>
                <span className={styles.selectionCount}>
                  {Object.keys(state.modules).length} / 6 architectures
                </span>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={!allSystemsChosen}
                  onClick={() => changeState((current) => ({ ...current, stage: 'point-design' }))}
                >
                  Build point design
                </button>
              </div>
              <MarkerSlot markers={markers} anchor="design-trade" />
            </section>
          )}

          {state.stage === 'point-design' && (
            <section id="design-blueprint" aria-labelledby="stage-title">
              <div className={styles.stageHeading}>
                <div>
                  <span className={styles.kicker}>04 / POINT DESIGN</span>
                  <h1 id="stage-title">Build the spacecraft</h1>
                </div>
                <span className={styles.stageGlyph} aria-hidden="true">⬡</span>
              </div>
              <div className={styles.blueprintGrid}>
                {DESIGN_SYSTEMS.map((system) => {
                  const optionId = state.modules[system];
                  const option = getSubsystemOption(optionId, content);
                  const ownerId = ownerOfSystem(system);
                  const canEdit = ownerId === activePlayer.id;
                  const installed = state.installedModules?.[system] === optionId;
                  return (
                    <div
                      className={styles.blueprintSlot}
                      data-installed={installed}
                      key={system}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const dropped = event.dataTransfer.getData('text/system') as SystemId;
                        if (dropped === system) installModule(system);
                        setDraggedSystem(null);
                      }}
                    >
                      <span className={styles.slotGlyph} aria-hidden="true">
                        {SYSTEM_GLYPHS[system]}
                      </span>
                      <strong>{SYSTEM_LABELS[system]}</strong>
                      <span>{option?.label ?? 'No module selected'}</span>
                      <small>
                        {crew.find((player) => player.id === ownerId)?.name ?? 'Crew'} · {installed ? 'INSTALLED' : 'SLOT OPEN'}
                      </small>
                      {option && (
                        <button
                          className={styles.installButton}
                          type="button"
                          draggable={canEdit}
                          disabled={!canEdit}
                          aria-label={`Install ${option.label} in ${SYSTEM_LABELS[system]}`}
                          onDragStart={(event) => {
                            setDraggedSystem(system);
                            event.dataTransfer.setData('text/system', system);
                          }}
                          onDragEnd={() => setDraggedSystem(null)}
                          onClick={() => installModule(system)}
                        >
                          {installed ? 'Installed' : 'Install module'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {draggedSystem && (
                <p className={styles.dragHint}>
                  Drop {SYSTEM_LABELS[draggedSystem]} into its blueprint slot
                </p>
              )}

              <div className={styles.pointSupportGrid}>
              <div className={styles.cargoSection}>
                <div className={styles.sectionTitle}>
                  <strong>Cargo bay</strong>
                  <span>{getCargoCells(state.cargo, content)} / {content.cargoRules.gridCells} cells</span>
                </div>
                <div className={styles.cargoGrid} aria-label="Cargo bay grid">
                  {Array.from({ length: content.cargoRules.gridCells }, (_, index) => (
                    <span
                      className={styles.cargoCell}
                      data-filled={index < getCargoCells(state.cargo, content)}
                      key={index}
                      aria-label={index < getCargoCells(state.cargo, content) ? 'Occupied cargo cell' : 'Empty cargo cell'}
                    >
                      {index < getCargoCells(state.cargo, content) ? '▦' : '·'}
                    </span>
                  ))}
                </div>
                <div className={styles.cargoControls}>
                  {content.cargoCrates.map((resource) => (
                    <div className={styles.cargoItem} key={resource}>
                      <span>{RESOURCE_LABELS[resource]}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${RESOURCE_LABELS[resource]} crate`}
                        disabled={state.cargo[resource] === 0}
                        onClick={() => changeCargo(resource, -1)}
                      >
                        −
                      </button>
                      <strong>{state.cargo[resource]}</strong>
                      <button
                        type="button"
                        aria-label={`Add ${RESOURCE_LABELS[resource]} crate`}
                        onClick={() => changeCargo(resource, 1)}
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.windowSection}>
                <div className={styles.sectionTitle}>
                  <strong>Launch window</strong>
                  <span>Vote with the crew</span>
                </div>
                <div className={styles.orbitTrack} aria-label="Illustrative launch window timeline">
                  <svg viewBox="0 0 360 70" role="img" aria-label="Spacecraft trajectory window options">
                    <ellipse cx="180" cy="35" rx="145" ry="24" />
                    <circle cx="180" cy="35" r="13" />
                    <path d="M37 35h286" />
                    {[70, 180, 290].map((x, index) => (
                      <circle className={styles.orbitNode} cx={x} cy={index === 1 ? 12 : 58} r="5" key={x} />
                    ))}
                  </svg>
                  <small>ILLUSTRATIVE · NOT TO SCALE</small>
                </div>
                <MarkerSlot markers={markers} anchor="design-window-picker" />
                <div className={styles.actionRow}>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => setShowWindowPlanner(true)}
                  >
                    Open trajectory planner
                  </button>
                  {windowVotes[activePlayer.id] && (
                    <span className={styles.selectionCount}>
                      {renderVoteCounts('window', windowVotes[activePlayer.id]!)}
                    </span>
                  )}
                </div>
                <div className={styles.actionRow}>
                  {selectedWindow && <span className={styles.selectionCount}>Locked: {selectedWindow.label}</span>}
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    disabled={!allWindowVotes}
                    onClick={resolveWindow}
                  >
                    Lock window
                  </button>
                </div>
              </div>
              </div>

              <div className={styles.actionRow}>
                <span className={styles.selectionCount}>
                  {Object.keys(state.installedModules ?? {}).length} / 6 modules installed
                </span>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={!allModulesInstalled || !state.launchWindowId}
                  onClick={() => changeState((current) => ({ ...current, stage: 'review' }))}
                >
                  Flight review
                </button>
              </div>
              <MarkerSlot markers={markers} anchor="design-blueprint" />
            </section>
          )}

          {state.stage === 'review' && stats && (
            <section id="design-review" aria-labelledby="stage-title">
              <div className={styles.stageHeading}>
                <div>
                  <span className={styles.kicker}>05 / FLIGHT READINESS REVIEW</span>
                  <h1 id="stage-title">{state.rushed ? 'Rushed design' : 'Ready to fly?'}</h1>
                </div>
                <span className={styles.stageGlyph} aria-hidden="true">✓</span>
              </div>
              <div className={styles.segmentRow} aria-label="Mission segments">
                {segments.map((segment) => (
                  <div
                    className={styles.segment}
                    data-complete={segment.complete}
                    key={segment.id}
                  >
                    <span aria-hidden="true">{segment.complete ? '✓' : '○'}</span>
                    <strong>{segment.label}</strong>
                  </div>
                ))}
              </div>
              <div className={styles.gateGrid}>
                {gates.map((gate) => (
                  <div className={styles.gate} data-status={gate.status} key={gate.id}>
                    <span className={styles.gateShape} aria-hidden="true">
                      {gate.status === 'green' ? '✓' : gate.status === 'amber' ? '△' : '×'}
                    </span>
                    <strong>{gate.label}</strong>
                    <span>{gate.value}</span>
                  </div>
                ))}
              </div>
              <div className={styles.designReadouts}>
                <div className={styles.riskReadout}>
                  <span>Design risk</span>
                  <div className={styles.riskMeter} aria-label={`Design risk ${Math.round(stats.risk * 100)} percent`}>
                    <span style={{ width: `${Math.round(stats.risk * 100)}%` }} />
                  </div>
                  <strong>{Math.round(stats.risk * 100)}%</strong>
                </div>
                <div className={styles.marginReadout}>
                  <span>Mass margin</span>
                  <strong>{(stats.massLimit - stats.mass).toFixed(1)}</strong>
                </div>
                <div className={styles.marginReadout}>
                  <span>Power margin</span>
                  <strong>{stats.powerSupply - stats.powerDemand}</strong>
                </div>
              </div>
              <div className={styles.signoffRow}>
                <button
                  className={styles.readyButton}
                  type="button"
                  aria-pressed={state.ready.includes(activePlayer.id)}
                  onClick={toggleReady}
                >
                  {state.ready.includes(activePlayer.id) ? 'Stand down' : 'Ready'}
                </button>
                <span className={styles.selectionCount}>
                  {state.ready.length} / {crew.length} signed
                </span>
                <button
                  className={styles.launchButton}
                  type="button"
                  disabled={!me.isHost || !allReady}
                  onClick={launch}
                >
                  {hasRedGate && (
                    <span
                      className={styles.launchWarning}
                      role="img"
                      aria-label="Launching with red gates adds risk"
                      title="Launching with red gates adds risk"
                    >
                      ⚠
                    </span>
                  )}
                  {state.rushed && expired
                    ? 'Launch anyway'
                    : expired
                      ? 'Launch'
                      : 'Start mission'}
                </button>
              </div>
              <MarkerSlot markers={markers} anchor="design-ready" />
              <MarkerSlot markers={markers} anchor="design-review" />
            </section>
          )}
        </section>

        <footer className={styles.bottomRail}>
          <span>All readouts use game-balance units</span>
          {selectedObjectives.length > 0 && (
            <span>{selectedObjectives.map((objective) => objective.label).join(' · ')}</span>
          )}
          {stats && (
            <span>
              {stats.mass.toFixed(1)} mass · {stats.powerSupply - stats.powerDemand} power · {stats.cost} cost
            </span>
          )}
        </footer>

        {state.roleSwapRequest && (
          <aside className={styles.swapAlert} role="status">
            <span>
              {crew.find((player) => player.id === state.roleSwapRequest?.fromPlayerId)?.name ?? 'Crew'} requests a role swap
            </span>
            {state.roleSwapRequest.toPlayerId === activePlayer.id && (
              <button className={styles.secondaryButton} type="button" onClick={acceptSwap}>
                Agree
              </button>
            )}
            {state.roleSwapRequest.fromPlayerId === activePlayer.id && (
              <button
                className={styles.quietButton}
                type="button"
                onClick={() =>
                  changeState((current) => withoutRoleSwapRequest(current))
                }
              >
                Cancel
              </button>
            )}
          </aside>
        )}

        <details className={styles.swapControls}>
          <summary>Role swap</summary>
          <label>
            Crew member
            <select value={swapTarget} onChange={(event) => setSwapTarget(event.currentTarget.value)}>
              <option value="">Choose crew</option>
              {crew.filter((player) => player.id !== activePlayer.id).map((player) => (
                <option value={player.id} key={player.id}>{player.name}</option>
              ))}
            </select>
          </label>
          <div className={styles.swapRoleList}>
            {MISSION_ROLES.filter(
              (role) => roleAssignments[role.id] === swapTarget && Boolean(swapTarget),
            ).map((role) => (
              <button
                className={styles.quietButton}
                type="button"
                key={role.id}
                onClick={() => sendSwapRequest(swapTarget, role.id)}
              >
                Swap {role.label}
              </button>
            ))}
          </div>
        </details>

        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
      {showWindowPlanner && (
        <Suspense fallback={<div role="status">Loading trajectory planner…</div>}>
          <MissionVizTracker
            missionId={missionId}
            mode="picker"
            progress={0}
            missionDays={selectedPlannerWindow?.tripDays ?? 0}
            selectedWindowId={windowVotes[activePlayer.id] ?? state.launchWindowId}
            markers={markers}
            showTutorial={showGuide}
            onSelectWindow={voteWindow}
            onClose={() => setShowWindowPlanner(false)}
          />
        </Suspense>
      )}
    </CapsuleShell>
  );
}
