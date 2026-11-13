import { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import { MISSION_IDS } from '../constants';
import { subscribeDecisions, subscribePlans } from '../roomService';
import type {
  DecisionState,
  MissionId,
  MissionPlan,
  MissionResults,
} from '../types';

export interface UseResultsResult extends MissionResults {
  loading: boolean;
  error: string | null;
}

function scoreForMission(
  missionId: MissionId,
  plans: Partial<Record<MissionId, MissionPlan>>,
  decisions: Partial<Record<MissionId, DecisionState>>,
): number | null {
  const decision = decisions[missionId];
  if (decision) return decision.scoreAfter;
  const plan = plans[missionId];
  return plan ? plan.score : null;
}

export function useResults(roomCode: string | null): UseResultsResult {
  const [plans, setPlans] = useState<Partial<Record<MissionId, MissionPlan>>>({});
  const [decisions, setDecisions] = useState<
    Partial<Record<MissionId, DecisionState>>
  >({});
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [decisionsLoaded, setDecisionsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode || !db) {
      setPlansLoaded(true);
      setDecisionsLoaded(true);
      return;
    }

    const unsubscribePlans = subscribePlans(
      roomCode,
      (nextPlans) => {
        setPlans(nextPlans);
        setPlansLoaded(true);
      },
      (message) => {
        setError(message);
        setPlansLoaded(true);
      },
    );
    const unsubscribeDecisions = subscribeDecisions(
      roomCode,
      (nextDecisions) => {
        setDecisions(nextDecisions);
        setDecisionsLoaded(true);
      },
      (message) => {
        setError(message);
        setDecisionsLoaded(true);
      },
    );

    return () => {
      unsubscribePlans();
      unsubscribeDecisions();
    };
  }, [roomCode]);

  const missionScores = useMemo<Record<MissionId, number | null>>(
    () => ({
      iss: scoreForMission('iss', plans, decisions),
      moon: scoreForMission('moon', plans, decisions),
      mars: scoreForMission('mars', plans, decisions),
    }),
    [decisions, plans],
  );

  const totalScore = MISSION_IDS.reduce(
    (total, missionId) => total + (missionScores[missionId] ?? 0),
    0,
  );

  return {
    plans,
    decisions,
    missionScores,
    totalScore,
    loading: !plansLoaded || !decisionsLoaded,
    error,
  };
}
