import { useCallback, useEffect, useState } from 'react';
import { db } from '../firebase';
import { getErrorMessage } from '../constants';
import { setFlowStep, subscribeFlow } from '../roomService';
import type { FlowStep } from '../types';

export interface UseFlowResult {
  step: FlowStep;
  loading: boolean;
  error: string | null;
  setStep: (step: FlowStep) => Promise<void>;
}

export function useFlow(roomCode: string | null): UseFlowResult {
  const [step, setStepState] = useState<FlowStep>('lobby');
  const [loading, setLoading] = useState(Boolean(roomCode));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) {
      setLoading(false);
      return;
    }
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeFlow(
      roomCode,
      (nextStep) => {
        if (nextStep) setStepState(nextStep);
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [roomCode]);

  const setStep = useCallback(
    async (nextStep: FlowStep) => {
      try {
        await setFlowStep(roomCode ?? '', nextStep);
        setStepState(nextStep);
      } catch (stepError: unknown) {
        setError(getErrorMessage(stepError));
        throw stepError;
      }
    },
    [roomCode],
  );

  return { step, loading, error, setStep };
}
