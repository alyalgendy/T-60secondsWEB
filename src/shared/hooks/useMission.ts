import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../constants';
import {
  enqueueMissionIntent,
  isV2MockMode,
  removeMissionIntent,
  startMission,
  subscribeMission,
  subscribeMissionIntents,
  subscribeMissionPositions,
  updateMission,
  writeMissionPosition,
} from '../v2Service';
import type {
  MissionId,
  MissionIntent,
  MissionIntentAction,
  MissionPosition,
  MissionState,
} from '../types';

export interface UseMissionArgs {
  roomCode: string;
  missionId: MissionId;
  playerId?: string;
  isHost: boolean;
  mock?: boolean;
}

export interface UseMissionResult {
  state: MissionState | null;
  loading: boolean;
  error: string | null;
  positions: Record<string, MissionPosition>;
  intents: MissionIntent[];
  start: (initial: MissionState) => Promise<MissionState>;
  save: (state: MissionState) => Promise<void>;
  update: (updater: (current: MissionState) => MissionState) => Promise<MissionState>;
  sendIntent: (action: MissionIntentAction) => Promise<void>;
  removeIntent: (intentId: string) => Promise<void>;
  sendPosition: (position: MissionPosition) => Promise<void>;
}

export function useMission({
  roomCode,
  missionId,
  playerId,
  isHost,
  mock = isV2MockMode(),
}: UseMissionArgs): UseMissionResult {
  const [state, setState] = useState<MissionState | null>(null);
  const [positions, setPositions] = useState<Record<string, MissionPosition>>({});
  const [intents, setIntents] = useState<MissionIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setState(null);
    setPositions({});
    setIntents([]);
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeMission(
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

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeMissionPositions(
      roomCode,
      mock,
      (next) => {
        if (active) setPositions(next);
      },
      (message) => {
        if (active) setError(message);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [mock, roomCode]);

  useEffect(() => {
    if (!isHost) {
      setIntents([]);
      return;
    }
    let active = true;
    const unsubscribe = subscribeMissionIntents(
      roomCode,
      missionId,
      mock,
      (next) => {
        if (active) setIntents(next);
      },
      (message) => {
        if (active) setError(message);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [isHost, mock, missionId, roomCode]);

  const start = useCallback(
    async (initial: MissionState) => {
      if (!isHost) throw new Error('Only the host can start the mission.');
      try {
        const next = await startMission(roomCode, missionId, mock, initial);
        setState(next);
        setError(null);
        return next;
      } catch (writeError: unknown) {
        setError(getErrorMessage(writeError));
        throw writeError;
      }
    },
    [isHost, mock, missionId, roomCode],
  );

  const save = useCallback(
    async (next: MissionState) => {
      if (!isHost) throw new Error('Only the host can update mission state.');
      try {
        const saved = await updateMission(roomCode, missionId, mock, () => next);
        setState(saved);
        setError(null);
      } catch (writeError: unknown) {
        setError(getErrorMessage(writeError));
        throw writeError;
      }
    },
    [isHost, mock, missionId, roomCode],
  );

  const update = useCallback(
    async (updater: (current: MissionState) => MissionState) => {
      if (!isHost) throw new Error('Only the host can update mission state.');
      try {
        const next = await updateMission(roomCode, missionId, mock, updater);
        setState(next);
        setError(null);
        return next;
      } catch (writeError: unknown) {
        setError(getErrorMessage(writeError));
        throw writeError;
      }
    },
    [isHost, mock, missionId, roomCode],
  );

  const sendIntent = useCallback(
    async (action: MissionIntentAction) => {
      if (!playerId) throw new Error('A player id is required to send a mission action.');
      if (!state) throw new Error('The mission has not started yet.');
      try {
        await enqueueMissionIntent(roomCode, missionId, mock, {
          playerId,
          attempt: state.attempt,
          createdAt: Date.now(),
          action,
        });
        setError(null);
      } catch (writeError: unknown) {
        setError(getErrorMessage(writeError));
        throw writeError;
      }
    },
    [missionId, mock, playerId, roomCode, state],
  );

  const removeIntent = useCallback(
    async (intentId: string) => {
      if (!isHost) throw new Error('Only the host can clear mission actions.');
      try {
        await removeMissionIntent(roomCode, missionId, mock, intentId);
      } catch (writeError: unknown) {
        setError(getErrorMessage(writeError));
        throw writeError;
      }
    },
    [isHost, mock, missionId, roomCode],
  );

  const sendPosition = useCallback(
    async (position: MissionPosition) => {
      if (!playerId) throw new Error('A player id is required to send a position.');
      try {
        await writeMissionPosition(roomCode, playerId, mock, position);
      } catch (writeError: unknown) {
        setError(getErrorMessage(writeError));
        throw writeError;
      }
    },
    [mock, playerId, roomCode],
  );

  return {
    state,
    loading,
    error,
    positions,
    intents,
    start,
    save,
    update,
    sendIntent,
    removeIntent,
    sendPosition,
  };
}
