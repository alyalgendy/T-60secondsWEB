import { Suspense, useCallback, useEffect, useState } from 'react';
import LobbyScene from './scenes/lobby';
import {
  ErrorScene,
  LoadingScene,
  PlaceholderScene,
} from './shared/ui';
import {
  useDecision,
  useFlow,
  usePlanning,
  useResults,
  useRoom,
} from './shared/hooks';
import { getErrorMessage, clamp, MISSION_NAMES } from './shared/constants';
import {
  CUTSCENE_TITLES,
  CUTSCENE_VIDEOS,
  STEP_LABELS,
  getNextStep,
  isCutsceneStep,
  isDecisionStep,
  isFlowStep,
  isPlanningStep,
  missionFromStep,
} from './shared/flow';
import {
  createRoom,
  isValidRoomCode,
  joinRoom,
  leaveRoom,
  normalizeRoomCode,
  startRoom,
} from './shared/roomService';
import {
  getMissionConfig,
  getProblems,
  getSceneComponent,
  type LazyScene,
} from './sceneRegistry';
import DevHarness from './shared/devHarness';
import type {
  DecisionProblem,
  FlowStep,
  MissionConfig,
  MissionId,
  Player,
  ResultsSceneProps,
} from './shared/types';
import type {
  UseDecisionResult,
  UsePlanningResult,
} from './shared/hooks';

const PLAYER_KEY_PREFIX = 't60.player.';

function playerKey(roomCode: string): string {
  return `${PLAYER_KEY_PREFIX}${roomCode}`;
}

function readRoomFromUrl(): string | null {
  const value = new URLSearchParams(window.location.search).get('room');
  return value ? normalizeRoomCode(value) : null;
}

function readPlayerId(roomCode: string | null): string | null {
  if (!roomCode) return null;
  try {
    return localStorage.getItem(playerKey(roomCode));
  } catch {
    return null;
  }
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const mockParam = params.get('mock');
  const sceneParam = params.get('scene');

  if (mockParam) {
    const count = clamp(Number.parseInt(mockParam, 10) || 1, 1, 4);
    const initialStep: FlowStep = isFlowStep(sceneParam) ? sceneParam : 'lobby';
    return <DevHarness initialStep={initialStep} playerCount={count} />;
  }

  return <RoomApp />;
}

function RoomApp() {
  const [roomCode, setRoomCode] = useState<string | null>(() => readRoomFromUrl());
  const [playerId, setPlayerId] = useState<string | null>(() =>
    readPlayerId(readRoomFromUrl()),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const room = useRoom(roomCode, playerId);
  const flow = useFlow(roomCode);

  useEffect(() => {
    if (
      roomCode &&
      playerId &&
      room.meta &&
      !room.loading &&
      !room.me &&
      !room.error
    ) {
      setPlayerId(null);
      setActionError(
        'Your seat was not found in this room. Join again with the same code.',
      );
    }
  }, [roomCode, playerId, room.meta, room.loading, room.me, room.error]);

  const attach = useCallback((code: string, id: string) => {
    try {
      localStorage.setItem(playerKey(code), id);
    } catch {
      // Storage can be unavailable in private browsing; the session still works.
    }
    setRoomCode(code);
    setPlayerId(id);
    setActionError(null);
    window.history.replaceState(null, '', `?room=${code}`);
  }, []);

  const handleCreate = useCallback(
    async (name: string) => {
      setBusy(true);
      setActionError(null);
      try {
        const result = await createRoom(name);
        attach(result.roomCode, result.playerId);
      } finally {
        setBusy(false);
      }
    },
    [attach],
  );

  const handleJoin = useCallback(
    async (code: string, name: string) => {
      setBusy(true);
      setActionError(null);
      try {
        const clean = normalizeRoomCode(code);
        if (!isValidRoomCode(clean)) {
          throw new Error(
            'That room code is not valid. Codes are 4 characters, like ABCD.',
          );
        }
        const existing = readPlayerId(clean) ?? undefined;
        const result = await joinRoom(clean, name, existing);
        attach(result.roomCode, result.playerId);
      } finally {
        setBusy(false);
      }
    },
    [attach],
  );

  const handleStart = useCallback(async () => {
    if (!roomCode || !playerId) throw new Error('Join a room first.');
    await startRoom(roomCode, playerId);
  }, [playerId, roomCode]);

  const handleLeave = useCallback(async () => {
    if (roomCode && playerId) {
      try {
        await leaveRoom(roomCode, playerId);
      } catch (leaveError: unknown) {
        console.warn('Could not leave the room cleanly.', getErrorMessage(leaveError));
      }
    }
    if (roomCode) {
      try {
        localStorage.removeItem(playerKey(roomCode));
      } catch {
        // Ignore storage failures.
      }
    }
    setRoomCode(null);
    setPlayerId(null);
    setActionError(null);
    window.history.replaceState(null, '', window.location.pathname);
  }, [playerId, roomCode]);

  const retry = useCallback(() => {
    window.location.reload();
  }, []);

  if (roomCode && !playerId) {
    return (
      <LobbyScene
        roomCode={roomCode}
        me={null}
        players={room.players}
        status={busy ? 'loading' : 'idle'}
        error={actionError}
        onCreate={handleCreate}
        onJoin={handleJoin}
        onStart={handleStart}
        onLeave={handleLeave}
      />
    );
  }

  if (!roomCode) {
    return (
      <LobbyScene
        roomCode={null}
        me={null}
        players={[]}
        status={busy ? 'loading' : 'idle'}
        error={actionError}
        onCreate={handleCreate}
        onJoin={handleJoin}
        onStart={handleStart}
        onLeave={handleLeave}
      />
    );
  }

  if (room.loading || flow.loading) {
    return (
      <LoadingScene
        roomCode={roomCode}
        players={room.players}
        me={room.me}
      />
    );
  }

  if (room.error || !room.meta) {
    return (
      <ErrorScene
        message={room.error ?? 'Room not found. It may have been closed.'}
        onRetry={retry}
        roomCode={roomCode}
      />
    );
  }

  if (!room.me) {
    return (
      <LobbyScene
        roomCode={roomCode}
        me={null}
        players={room.players}
        status={busy ? 'loading' : 'idle'}
        error={
          actionError ??
          'Your seat was not found in this room. Join again with the same code.'
        }
        onCreate={handleCreate}
        onJoin={handleJoin}
        onStart={handleStart}
        onLeave={handleLeave}
      />
    );
  }

  if (flow.step === 'lobby') {
    return (
      <LobbyScene
        roomCode={roomCode}
        me={room.me}
        players={room.players}
        status={busy ? 'loading' : 'idle'}
        error={actionError}
        onCreate={handleCreate}
        onJoin={handleJoin}
        onStart={handleStart}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <FlowRouter
      roomCode={roomCode}
      me={room.me}
      players={room.players}
      step={flow.step}
      setStep={flow.setStep}
    />
  );
}

interface FlowRouterProps {
  roomCode: string;
  me: Player;
  players: Player[];
  step: FlowStep;
  setStep: (step: FlowStep) => Promise<void>;
}

function FlowRouter({ roomCode, me, players, step, setStep }: FlowRouterProps) {
  const base = { roomCode, me, players };
  const mission = missionFromStep(step);

  if (isCutsceneStep(step)) {
    const Scene = getSceneComponent('cutscene');
    const onContinue = async () => {
      if (!me.isHost) return;
      await setStep(getNextStep(step));
    };

    if (!Scene) {
      return (
        <PlaceholderScene
          step={step}
          roomCode={roomCode}
          me={me}
          players={players}
          reason="Waiting for the Cutscene player (M4)."
          onSkip={() => void setStep(getNextStep(step))}
        />
      );
    }

    return (
      <Suspense fallback={<LoadingScene roomCode={roomCode} me={me} players={players} />}>
        <Scene
          key={step}
          {...base}
          videoSrc={CUTSCENE_VIDEOS[step] ?? ''}
          title={CUTSCENE_TITLES[step] ?? STEP_LABELS[step]}
          onContinue={onContinue}
        />
      </Suspense>
    );
  }

  if (isPlanningStep(step) && mission) {
    const config = getMissionConfig(mission);
    const Scene = getSceneComponent(mission);

    if (!config || !Scene) {
      return (
        <PlaceholderScene
          step={step}
          roomCode={roomCode}
          me={me}
          players={players}
          reason={
            !config
              ? `Waiting for src/scenes/${mission}/config.ts.`
              : `Waiting for src/scenes/${mission}/index.tsx.`
          }
          onSkip={() => void setStep(getNextStep(step))}
        />
      );
    }

    return (
      <PlanningContainer
        roomCode={roomCode}
        me={me}
        players={players}
        missionId={mission}
        config={config}
        Scene={Scene}
      />
    );
  }

  if (isDecisionStep(step) && mission) {
    const problems = getProblems(mission);
    const Scene = getSceneComponent('decision');

    if (!Scene || problems.length === 0) {
      return (
        <PlaceholderScene
          step={step}
          roomCode={roomCode}
          me={me}
          players={players}
          reason={
            !Scene
              ? 'Waiting for the mission simulation scene.'
              : `Waiting for src/content/problems.${mission}.ts.`
          }
          onSkip={() => void setStep(getNextStep(step))}
        />
      );
    }

    return (
      <DecisionContainer
        roomCode={roomCode}
        me={me}
        players={players}
        missionId={mission}
        problems={problems}
        Scene={Scene}
      />
    );
  }

  if (step === 'results') {
    const Scene = getSceneComponent('results');
    if (!Scene) {
      return (
        <PlaceholderScene
          step={step}
          roomCode={roomCode}
          me={me}
          players={players}
          reason="Waiting for the Results scene (M4)."
          onSkip={() => void setStep('results')}
        />
      );
    }
    return (
      <ResultsContainer
        roomCode={roomCode}
        me={me}
        players={players}
        Scene={Scene}
      />
    );
  }

  return (
    <PlaceholderScene
      step={step}
      roomCode={roomCode}
      me={me}
      players={players}
      onSkip={() => void setStep(getNextStep(step))}
    />
  );
}

interface PlanningContainerProps {
  roomCode: string;
  me: Player;
  players: Player[];
  missionId: MissionId;
  config: MissionConfig;
  Scene: LazyScene;
}

function PlanningContainer({
  roomCode,
  me,
  players,
  missionId,
  config,
  Scene,
}: PlanningContainerProps) {
  const planning: UsePlanningResult = usePlanning({
    roomCode,
    me,
    missionId,
    config,
  });

  if (planning.error) {
    return (
      <ErrorScene
        message={planning.error}
        roomCode={roomCode}
        me={me}
        players={players}
      />
    );
  }

  if (!planning.draft) {
    return (
      <LoadingScene
        label={`Opening the ${MISSION_NAMES[missionId]} plan…`}
        roomCode={roomCode}
        me={me}
        players={players}
      />
    );
  }

  return (
    <Suspense fallback={<LoadingScene roomCode={roomCode} me={me} players={players} />}>
      <Scene
        roomCode={roomCode}
        me={me}
        players={players}
        missionId={missionId}
        draft={planning.draft}
        updateDraft={planning.updateDraft}
        toggleReady={planning.toggleReady}
        launch={planning.launch}
      />
    </Suspense>
  );
}

interface DecisionContainerProps {
  roomCode: string;
  me: Player;
  players: Player[];
  missionId: MissionId;
  problems: DecisionProblem[];
  Scene: LazyScene;
}

function DecisionContainer({
  roomCode,
  me,
  players,
  missionId,
  problems,
  Scene,
}: DecisionContainerProps) {
  const decision: UseDecisionResult = useDecision({
    roomCode,
    me,
    players,
    missionId,
    problems,
  });

  if (decision.error) {
    return (
      <ErrorScene
        message={decision.error}
        roomCode={roomCode}
        me={me}
        players={players}
      />
    );
  }

  if (decision.loading || !decision.plan || !decision.state) {
    return (
      <LoadingScene
        label="Loading mission simulation…"
        roomCode={roomCode}
        me={me}
        players={players}
      />
    );
  }

  return (
    <Suspense fallback={<LoadingScene roomCode={roomCode} me={me} players={players} />}>
      <Scene
        roomCode={roomCode}
        me={me}
        players={players}
        missionId={missionId}
        plan={decision.plan}
        state={decision.state}
        choose={decision.choose}
        nextProblem={decision.nextProblem}
        finish={decision.finish}
      />
    </Suspense>
  );
}

interface ResultsContainerProps {
  roomCode: string;
  me: Player;
  players: Player[];
  Scene: LazyScene;
}

function ResultsContainer({
  roomCode,
  me,
  players,
  Scene,
}: ResultsContainerProps) {
  const results = useResults(roomCode);
  const resultsProps: ResultsSceneProps = {
    roomCode,
    me,
    players,
    plans: results.plans,
    decisions: results.decisions,
    missionScores: results.missionScores,
    totalScore: results.totalScore,
  };

  if (results.loading) {
    return (
      <LoadingScene
        label="Tallying mission results…"
        roomCode={roomCode}
        me={me}
        players={players}
      />
    );
  }

  return (
    <Suspense fallback={<LoadingScene roomCode={roomCode} me={me} players={players} />}>
      <Scene {...resultsProps} />
    </Suspense>
  );
}
