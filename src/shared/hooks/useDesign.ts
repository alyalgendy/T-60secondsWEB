import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../constants';
import {
  isV2MockMode,
  subscribeDesign,
  updateDesign,
  writeDesign,
} from '../v2Service';
import type { DesignState, MissionId } from '../types';

export interface UseDesignArgs {
  roomCode: string;
  missionId: MissionId;
  mock?: boolean;
}

export interface UseDesignResult {
  state: DesignState | null;
  loading: boolean;
  error: string | null;
  save: (state: DesignState) => Promise<void>;
  update: (
    updateState: (current: DesignState | null) => DesignState,
  ) => Promise<DesignState>;
}

export function useDesign({
  roomCode,
  missionId,
  mock = isV2MockMode(),
}: UseDesignArgs): UseDesignResult {
  const [state, setState] = useState<DesignState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setState(null);
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeDesign(
      roomCode,
      missionId,
      mock,
      (next) => {
        if (!active) return;
        setState(next);
        setLoading(false);
      },
      (message) => {
        if (!active) return;
        setError(message);
        setLoading(false);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [mock, missionId, roomCode]);

  const save = useCallback(
    async (next: DesignState) => {
      try {
        await writeDesign(roomCode, missionId, mock, next);
        setState(next);
        setError(null);
      } catch (writeError: unknown) {
        setError(getErrorMessage(writeError));
        throw writeError;
      }
    },
    [mock, missionId, roomCode],
  );

  const update = useCallback(
    async (updateState: (current: DesignState | null) => DesignState) => {
      try {
        const next = await updateDesign(
          roomCode,
          missionId,
          mock,
          updateState,
        );
        setState(next);
        setError(null);
        return next;
      } catch (writeError: unknown) {
        setError(getErrorMessage(writeError));
        throw writeError;
      }
    },
    [mock, missionId, roomCode],
  );

  return { state, loading, error, save, update };
}
