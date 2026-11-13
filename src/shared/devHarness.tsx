import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import LobbyScene from '../scenes/lobby';
import { LoadingScene, PlaceholderScene } from './ui';
import {
  clamp,
  MISSION_IDS,
  PLAYER_COLORS,
  RESOURCE_KEYS,
} from './constants';
import {
  CUTSCENE_TITLES,
  CUTSCENE_VIDEOS,
  FLOW_STEPS,
  STEP_LABELS,
  getNextStep,
  isCutsceneStep,
  isDecisionStep,
  isFlowStep,
  isPlanningStep,
  missionFromStep,
} from './flow';
import { createInitialDraft } from './scoring';
import { getTurnPlayerId } from './hooks';
import { getMissionConfig, getProblems, getSceneComponent } from '../sceneRegistry';
import type {
  DecisionState,
  FlowStep,
  MissionId,
  MissionPlan,
  PlanDraft,
  Player,
  ResourceKey,
} from './types';
import styles from './devHarness.module.css';

export interface DevHarnessProps {
  initialStep: FlowStep;
  playerCount: number;
}

const MOCK_NAMES = ['You', 'Nova', 'Kai', 'Rhea'] as const;

function makeMockPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `mock-${index}`,
    name: MOCK_NAMES[index] ?? `Player ${index + 1}`,
    color: PLAYER_COLORS[index] ?? PLAYER_COLORS[0],
    joinOrder: index,
    isHost: index === 0,
    connected: true,
  }));
}

function emptyScores(): Record<MissionId, number | null> {
  return { iss: null, moon: null, mars: null };
}

/**
 * Local-only harness for building scenes without Firebase.
 * Open /?scene=plan-moon&mock=3 to render one step with three fake players.
 */
export default function DevHarness({
  initialStep,
  playerCount,
}: DevHarnessProps) {
  const players = useMemo(() => makeMockPlayers(playerCount), [playerCount]);
  const host = players[0] as Player;
  const [step, setStep] = useState<FlowStep>(initialStep);
  const [drafts, setDrafts] = useState<Partial<Record<MissionId, PlanDraft>>>({});
  const [plans, setPlans] = useState<Partial<Record<MissionId, MissionPlan>>>({});
  const [decisions, setDecisions] = useState<
    Partial<Record<MissionId, DecisionState>>
  >({});

  const mission = missionFromStep(step);
  const config = mission ? getMissionConfig(mission) : null;
  const problems = mission ? getProblems(mission) : [];

  useEffect(() => {
    if (!mission || !config) return;
    setDrafts((current) =>
      current[mission]
        ? current
        : { ...current, [mission]: createInitialDraft(config) },
    );
  }, [mission, config]);

  useEffect(() => {
    if (!mission || !isDecisionStep(step)) return;
    const plan = plans[mission];
    if (!plan || problems.length === 0) return;

    setDecisions((current) => {
      if (current[mission]) return current;
      return {
        ...current,
        [mission]: {
          missionId: mission,
          problemIds: problems.map((problem) => problem.id),
          index: 0,
          turnPlayerId: getTurnPlayerId(players, 0),
          picks: [],
          resourcesAfter: { ...plan.resources },
          scoreAfter: plan.score,
          status: 'choosing',
        },
      };
    });
  }, [mission, step, plans, players, problems]);

  const decisionState = mission ? decisions[mission] : undefined;

  /**
   * In mock mode the tester controls every seat. During a decision, "me" becomes
   * the player whose turn it is (and is treated as host) so both Choose and
   * Continue are testable with 2-4 fake players.
   */
  const me: Player =
    isDecisionStep(step) && decisionState
      ? {
          ...(players.find((player) => player.id === decisionState.turnPlayerId) ??
            host),
          isHost: true,
        }
      : host;

  const updateDraft = useCallback(
    async (patch: Partial<Pick<PlanDraft, 'craftId' | 'resources'>>) => {
      if (!mission) return;
      setDrafts((current) => {
        const draft =
          current[mission] ?? (config ? createInitialDraft(config) : null);
        if (!draft) return current;
        return {
          ...current,
          [mission]: {
            ...draft,
            craftId: patch.craftId !== undefined ? patch.craftId : draft.craftId,
            resources: patch.resources ?? draft.resources,
            lastEditedBy: host.id,
            updatedAt: Date.now(),
          },
        };
      });
    },
    [config, host.id, mission],
  );

  /**
   * The tester controls every seat in mock mode, so Lock plan toggles the whole
   * crew at once. That is the only way to reach the all-ready Launch state with
   * mock=2..4, because there is no second browser to lock the other seats.
   */
  const toggleReady = useCallback(async () => {
    if (!mission) return;
    setDrafts((current) => {
      const draft =
        current[mission] ?? (config ? createInitialDraft(config) : null);
      if (!draft) return current;
      const allReady = players.every((player) =>
        draft.readyPlayerIds.includes(player.id),
      );
      return {
        ...current,
        [mission]: {
          ...draft,
          readyPlayerIds: allReady ? [] : players.map((player) => player.id),
          updatedAt: Date.now(),
        },
      };
    });
  }, [config, mission, players]);

  const launch = useCallback(
    async (plan: MissionPlan) => {
      if (!mission) return;
      setPlans((current) => ({ ...current, [mission]: plan }));
      setStep(`decision-${mission}`);
    },
    [mission],
  );

  const choose = useCallback(
    async (optionId: string) => {
      if (!mission) return;
      setDecisions((current) => {
        const state = current[mission];
        if (!state || state.status !== 'choosing') return current;
        const problem = problems.find(
          (item) => item.id === state.problemIds[state.index],
        );
        const option = problem?.options.find((item) => item.id === optionId);
        if (!problem || !option) return current;

        const resourcesAfter = { ...state.resourcesAfter };
        for (const key of RESOURCE_KEYS) {
          const delta = option.effects[key];
          if (typeof delta !== 'number') continue;
          const resourceKey: ResourceKey = key;
          resourcesAfter[resourceKey] = Math.max(
            0,
            (resourcesAfter[resourceKey] ?? 0) + delta,
          );
        }

        return {
          ...current,
          [mission]: {
            ...state,
            resourcesAfter,
            scoreAfter: clamp(state.scoreAfter + option.scoreDelta, 0, 100),
            picks: [
              ...state.picks,
              {
                problemId: problem.id,
                playerId: state.turnPlayerId,
                optionId: option.id,
              },
            ],
            status: 'revealed',
          },
        };
      });
    },
    [mission, problems],
  );

  const nextProblem = useCallback(async () => {
    if (!mission) return;
    setDecisions((current) => {
      const state = current[mission];
      if (!state || state.status !== 'revealed') return current;
      const nextIndex = state.index + 1;
      if (nextIndex >= state.problemIds.length) {
        return { ...current, [mission]: { ...state, status: 'debrief' } };
      }
      return {
        ...current,
        [mission]: {
          ...state,
          index: nextIndex,
          turnPlayerId: getTurnPlayerId(players, nextIndex),
          status: 'choosing',
        },
      };
    });
  }, [mission, players]);

  const finish = useCallback(async () => {
    if (!mission) return;
    setStep(getNextStep(`decision-${mission}`));
  }, [mission]);

  const continueStep = useCallback(async () => {
    setStep(getNextStep(step));
  }, [step]);

  const base = { roomCode: 'MOCK', me, players };
  const decisionPlan = mission ? plans[mission] : undefined;

  let content: React.ReactNode;

  if (step === 'lobby') {
    content = (
      <LobbyScene
        roomCode="MOCK"
        me={host}
        players={players}
        status="idle"
        error={null}
        onCreate={async () => undefined}
        onJoin={async () => undefined}
        onStart={async () => setStep('cutscene-intro')}
        onLeave={async () => setStep('lobby')}
      />
    );
  } else if (isCutsceneStep(step)) {
    const Scene = getSceneComponent('cutscene');
    content = Scene ? (
      <Suspense fallback={<LoadingScene {...base} />}>
        <Scene
          {...base}
          videoSrc={CUTSCENE_VIDEOS[step] ?? ''}
          title={CUTSCENE_TITLES[step] ?? STEP_LABELS[step]}
          onContinue={continueStep}
        />
      </Suspense>
    ) : (
      <PlaceholderScene
        step={step}
        {...base}
        reason="Waiting for the Cutscene player (M4)."
        onSkip={() => void continueStep()}
      />
    );
  } else if (isPlanningStep(step) && mission && config) {
    const Scene = getSceneComponent(mission);
    const draft = drafts[mission] ?? createInitialDraft(config);
    content = Scene ? (
      <Suspense fallback={<LoadingScene {...base} />}>
        <Scene
          {...base}
          missionId={mission}
          draft={draft}
          updateDraft={updateDraft}
          toggleReady={toggleReady}
          launch={launch}
        />
      </Suspense>
    ) : (
      <PlaceholderScene
        step={step}
        {...base}
        reason={`Waiting for src/scenes/${mission}/index.tsx.`}
        onSkip={() => void continueStep()}
      />
    );
  } else if (isDecisionStep(step) && mission) {
    const Scene = getSceneComponent('decision');
    content =
      Scene && decisionState && decisionPlan ? (
        <Suspense fallback={<LoadingScene {...base} />}>
          <Scene
            {...base}
            missionId={mission}
            plan={decisionPlan}
            state={decisionState}
            choose={choose}
            nextProblem={nextProblem}
            finish={finish}
          />
        </Suspense>
      ) : (
        <PlaceholderScene
          step={step}
          {...base}
          reason={
            !Scene
              ? 'Waiting for the Decision phase scene (M4).'
              : `Waiting for a mock plan / src/content/problems.${mission}.ts.`
          }
          onSkip={() => void continueStep()}
        />
      );
  } else if (step === 'results') {
    const Scene = getSceneComponent('results');
    if (Scene) {
      const missionScores = emptyScores();
      for (const missionId of MISSION_IDS) {
        missionScores[missionId] =
          decisions[missionId]?.scoreAfter ?? plans[missionId]?.score ?? null;
      }
      const totalScore = MISSION_IDS.reduce(
        (total, missionId) => total + (missionScores[missionId] ?? 0),
        0,
      );
      content = (
        <Suspense fallback={<LoadingScene {...base} />}>
          <Scene
            {...base}
            plans={plans}
            decisions={decisions}
            missionScores={missionScores}
            totalScore={totalScore}
          />
        </Suspense>
      );
    } else {
      content = (
        <PlaceholderScene
          step={step}
          {...base}
          reason="Waiting for the Results scene (M4)."
          onSkip={() => void continueStep()}
        />
      );
    }
  } else {
    content = (
      <PlaceholderScene
        step={step}
        {...base}
        onSkip={() => void continueStep()}
      />
    );
  }

  return (
    <>
      {content}
      <div className={styles.bar}>
        <span className={styles.badge}>Mock · {playerCount}P</span>
        <label className={styles.selectLabel}>
          Scene
          <select
            className={styles.select}
            value={step}
            onChange={(event) => {
              const next = event.currentTarget.value;
              if (isFlowStep(next)) setStep(next);
            }}
          >
            {FLOW_STEPS.map((flowStep) => (
              <option key={flowStep} value={flowStep}>
                {STEP_LABELS[flowStep]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}
