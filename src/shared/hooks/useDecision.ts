import { useCallback, useEffect, useState } from 'react';
import { ref, runTransaction, update } from 'firebase/database';
import { requireDb } from '../firebase';
import { clamp, getErrorMessage } from '../constants';
import { finishGame, nextStepForMission, subscribeDecision, subscribePlan } from '../roomService';
import type {
  DecisionProblem,
  DecisionState,
  MissionId,
  MissionPlan,
  Player,
  ResourceKey,
} from '../types';

export interface UseDecisionArgs {
  roomCode: string;
  me: Player;
  players: Player[];
  missionId: MissionId;
  problems: DecisionProblem[];
}

export interface UseDecisionResult {
  plan: MissionPlan | null;
  state: DecisionState | null;
  loading: boolean;
  error: string | null;
  choose: (optionId: string) => Promise<void>;
  nextProblem: () => Promise<void>;
  finish: () => Promise<void>;
}

export function getTurnPlayerId(players: Player[], problemIndex: number): string {
  const connected = players
    .filter((player) => player.connected)
    .sort((a, b) => a.joinOrder - b.joinOrder);
  const pool = connected.length > 0 ? connected : [...players].sort((a, b) => a.joinOrder - b.joinOrder);
  if (pool.length === 0) return '';
  return pool[problemIndex % pool.length]?.id ?? '';
}

/**
 * One decision phase for all three missions. The host creates the shared state;
 * only the current turn player may choose; the host advances and finishes.
 */
export function useDecision({
  roomCode,
  me,
  players,
  missionId,
  problems,
}: UseDecisionArgs): UseDecisionResult {
  const [plan, setPlan] = useState<MissionPlan | null>(null);
  const [state, setState] = useState<DecisionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const decisionPath = `rooms/${roomCode}/decision/${missionId}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const unsubscribePlan = subscribePlan(
      roomCode,
      missionId,
      (nextPlan) => {
        if (!cancelled) setPlan(nextPlan);
      },
      (message) => {
        if (!cancelled) setError(message);
      },
    );

    const unsubscribeDecision = subscribeDecision(
      roomCode,
      missionId,
      (nextState) => {
        if (!cancelled) {
          setState(nextState);
          setLoading(false);
        }
      },
      (message) => {
        if (!cancelled) {
          setError(message);
          setLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribePlan();
      unsubscribeDecision();
    };
  }, [roomCode, missionId]);

  useEffect(() => {
    if (!plan || state !== null || problems.length === 0 || players.length === 0) {
      return;
    }

    const database = requireDb();
    const decisionRef = ref(database, decisionPath);
    const problemIds = problems.map((problem) => problem.id);

    runTransaction(decisionRef, (currentData) => {
      const current = currentData as DecisionState | null;
      if (current) return current;
      return {
        missionId,
        problemIds,
        index: 0,
        turnPlayerId: getTurnPlayerId(players, 0),
        picks: [],
        resourcesAfter: { ...plan.resources },
        scoreAfter: plan.score,
        status: 'choosing',
      };
    }).catch((transactionError: unknown) => {
      setError(getErrorMessage(transactionError));
    });
  }, [decisionPath, missionId, plan, players, problems, state]);

  const choose = useCallback(
    async (optionId: string) => {
      const database = requireDb();
      const decisionRef = ref(database, decisionPath);

      try {
        await runTransaction(decisionRef, (currentData) => {
          const current = currentData as DecisionState | null;
          if (
            !current ||
            current.status !== 'choosing' ||
            current.turnPlayerId !== me.id
          ) {
            return undefined;
          }

          const problemIds = Array.isArray(current.problemIds)
            ? current.problemIds
            : [];
          const problem = problems.find(
            (item) => item.id === problemIds[current.index],
          );
          const option = problem?.options.find((item) => item.id === optionId);
          if (!problem || !option) return undefined;

          const picks = Array.isArray(current.picks) ? current.picks : [];
          const resourcesAfter = { ...(current.resourcesAfter ?? {}) };
          for (const [key, delta] of Object.entries(option.effects)) {
            const resourceKey = key as ResourceKey;
            if (typeof delta !== 'number') continue;
            resourcesAfter[resourceKey] = Math.max(
              0,
              (resourcesAfter[resourceKey] ?? 0) + delta,
            );
          }

          const scoreAfter =
            typeof current.scoreAfter === 'number' ? current.scoreAfter : 0;

          return {
            ...current,
            resourcesAfter,
            scoreAfter: clamp(scoreAfter + option.scoreDelta, 0, 100),
            picks: [
              ...picks,
              {
                problemId: problem.id,
                playerId: me.id,
                optionId: option.id,
              },
            ],
            status: 'revealed',
          };
        });
      } catch (chooseError: unknown) {
        setError(getErrorMessage(chooseError));
        throw chooseError;
      }
    },
    [decisionPath, me.id, problems],
  );

  const nextProblem = useCallback(async () => {
    if (!me.isHost) throw new Error('Only the host can continue.');
    const database = requireDb();
    const decisionRef = ref(database, decisionPath);

    try {
      await runTransaction(decisionRef, (currentData) => {
        const current = currentData as DecisionState | null;
        if (!current || current.status !== 'revealed') return undefined;

        const nextIndex = current.index + 1;
        const problemIds = Array.isArray(current.problemIds)
          ? current.problemIds
          : [];
        if (nextIndex >= problemIds.length) {
          return { ...current, status: 'debrief' };
        }

        return {
          ...current,
          index: nextIndex,
          turnPlayerId: getTurnPlayerId(players, nextIndex),
          status: 'choosing',
        };
      });
    } catch (nextError: unknown) {
      setError(getErrorMessage(nextError));
      throw nextError;
    }
  }, [decisionPath, me.isHost, players]);

  const finish = useCallback(async () => {
    if (!me.isHost) throw new Error('Only the host can continue.');
    try {
      if (missionId === 'mars') {
        await finishGame(roomCode);
      } else {
        await update(
          ref(requireDb(), `rooms/${roomCode}/flow`),
          {
            step: nextStepForMission(missionId),
            updatedAt: Date.now(),
          },
        );
      }
    } catch (finishError: unknown) {
      setError(getErrorMessage(finishError));
      throw finishError;
    }
  }, [me.isHost, missionId, roomCode]);

  return {
    plan,
    state,
    loading: loading || !plan || !state,
    error,
    choose,
    nextProblem,
    finish,
  };
}
