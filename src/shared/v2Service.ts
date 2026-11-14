import {
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  set,
  type DataSnapshot,
  type Unsubscribe,
} from 'firebase/database';
import { getErrorMessage } from './constants';
import { requireDb } from './firebase';
import type {
  DesignState,
  MissionId,
  MissionIntent,
  MissionPosition,
  MissionState,
  ResourceKey,
} from './types';

export function isV2MockMode(): boolean {
  return (
    import.meta.env.VITE_GAME_V2_MOCK === '1' ||
    (typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('v2mock') === '1')
  );
}

type V2State = DesignState | MissionState;
type StateListener<T extends V2State> = (state: T | null) => void;

const mockValues = new Map<string, V2State>();
const mockListeners = new Map<string, Set<StateListener<V2State>>>();
const mockIntents = new Map<string, Map<string, MissionIntent>>();
const mockIntentListeners = new Map<string, Set<(intents: MissionIntent[]) => void>>();
const mockPositions = new Map<string, Record<string, MissionPosition>>();
const mockPositionListeners = new Map<
  string,
  Set<(positions: Record<string, MissionPosition>) => void>
>();
let mockIntentSequence = 0;

function getPath(
  roomCode: string,
  missionId: MissionId,
  kind: 'design' | 'mission',
): string {
  return `rooms/${roomCode}/${kind}/${missionId}`;
}

function normalizeDesign(value: DesignState | null): DesignState | null {
  if (!value) return null;
  const cargoDefaults: Record<ResourceKey, number> = {
    fuel: 0,
    power: 0,
    oxygen: 0,
    water: 0,
    food: 0,
    shielding: 0,
    spares: 0,
  };
  return {
    ...value,
    objectiveIds: Array.isArray(value.objectiveIds) ? value.objectiveIds : [],
    modules: value.modules ?? {},
    cargo: { ...cargoDefaults, ...(value.cargo ?? {}) },
    votes: value.votes ?? {},
    ready: Array.isArray(value.ready) ? value.ready : [],
  };
}

function normalizeMission(value: MissionState | null): MissionState | null {
  if (!value) return null;
  return {
    ...value,
    progress: Number.isFinite(value.progress) ? value.progress : 0,
    systems: value.systems ?? {},
    resources: value.resources ?? {
      fuel: 0,
      power: 0,
      oxygen: 0,
      water: 0,
      food: 0,
      shielding: 0,
      spares: 0,
    },
    players: value.players ?? {},
    events: Array.isArray(value.events) ? value.events : [],
    processedIntentIds: Array.isArray(value.processedIntentIds)
      ? value.processedIntentIds
      : [],
  };
}

function subscribeMock<T extends V2State>(
  path: string,
  callback: StateListener<T>,
): Unsubscribe {
  let listeners = mockListeners.get(path);
  if (!listeners) {
    listeners = new Set<StateListener<V2State>>();
    mockListeners.set(path, listeners);
  }

  const listener: StateListener<V2State> = (state) =>
    callback((state as T | undefined) ?? null);
  listeners.add(listener);
  callback((mockValues.get(path) as T | undefined) ?? null);
  return () => {
    listeners?.delete(listener);
    if (listeners?.size === 0) mockListeners.delete(path);
  };
}

function writeMock<T extends V2State>(path: string, value: T): void {
  mockValues.set(path, value);
  for (const listener of mockListeners.get(path) ?? []) listener(value);
}

function subscribe<T extends V2State>(
  path: string,
  mock: boolean,
  callback: StateListener<T>,
  onError?: (message: string) => void,
  normalize?: (value: T | null) => T | null,
): Unsubscribe {
  if (mock) {
    return subscribeMock<T>(path, (value) =>
      callback(normalize?.(value) ?? value),
    );
  }
  return onValue(
    ref(requireDb(), path),
    (snapshot: DataSnapshot) => {
      const state = snapshot.val() as T | null;
      callback(normalize?.(state) ?? state);
    },
    (error: Error) => onError?.(getErrorMessage(error)),
  );
}

function write<T extends V2State>(path: string, mock: boolean, value: T): Promise<void> {
  if (mock) {
    writeMock(path, value);
    return Promise.resolve();
  }
  return set(ref(requireDb(), path), value);
}

export function subscribeDesign(
  roomCode: string,
  missionId: MissionId,
  mock: boolean,
  callback: StateListener<DesignState>,
  onError?: (message: string) => void,
): Unsubscribe {
  return subscribe<DesignState>(
    getPath(roomCode, missionId, 'design'),
    mock,
    callback,
    onError,
    normalizeDesign,
  );
}

export function writeDesign(
  roomCode: string,
  missionId: MissionId,
  mock: boolean,
  value: DesignState,
): Promise<void> {
  return write(getPath(roomCode, missionId, 'design'), mock, value);
}

export async function updateDesign(
  roomCode: string,
  missionId: MissionId,
  mock: boolean,
  updateState: (current: DesignState | null) => DesignState,
): Promise<DesignState> {
  const path = getPath(roomCode, missionId, 'design');
  if (mock) {
    const current = normalizeDesign(
      (mockValues.get(path) as DesignState | undefined) ?? null,
    );
    const next = updateState(current);
    writeMock(path, next);
    return next;
  }

  const result = await runTransaction(ref(requireDb(), path), (raw) =>
    updateState(normalizeDesign(raw as DesignState | null)),
  );
  if (!result.committed) {
    throw new Error('Could not update the shared mission design.');
  }
  const updated = normalizeDesign(result.snapshot.val() as DesignState | null);
  if (!updated) throw new Error('The saved mission design could not be read.');
  return updated;
}

export function subscribeMission(
  roomCode: string,
  missionId: MissionId,
  mock: boolean,
  callback: StateListener<MissionState>,
  onError?: (message: string) => void,
): Unsubscribe {
  return subscribe<MissionState>(
    getPath(roomCode, missionId, 'mission'),
    mock,
    callback,
    onError,
    normalizeMission,
  );
}

export async function startMission(
  roomCode: string,
  missionId: MissionId,
  mock: boolean,
  initial: MissionState,
): Promise<MissionState> {
  const path = getPath(roomCode, missionId, 'mission');
  if (mock) {
    const current = normalizeMission(
      (mockValues.get(path) as MissionState | undefined) ?? null,
    );
    if (current) return current;
    writeMock(path, initial);
    return initial;
  }

  const result = await runTransaction(ref(requireDb(), path), (raw) => raw ?? initial);
  if (!result.committed) throw new Error('Could not start the shared mission.');
  const state = normalizeMission(result.snapshot.val() as MissionState | null);
  if (!state) throw new Error('The started mission could not be read.');
  return state;
}

export async function updateMission(
  roomCode: string,
  missionId: MissionId,
  mock: boolean,
  updateState: (current: MissionState) => MissionState,
): Promise<MissionState> {
  const path = getPath(roomCode, missionId, 'mission');
  if (mock) {
    const current = normalizeMission(
      (mockValues.get(path) as MissionState | undefined) ?? null,
    );
    if (!current) throw new Error('The mission has not started yet.');
    const next = updateState(current);
    writeMock(path, next);
    return next;
  }

  const result = await runTransaction(ref(requireDb(), path), (raw) => {
    const current = normalizeMission(raw as MissionState | null);
    return current ? updateState(current) : undefined;
  });
  if (!result.committed) throw new Error('Could not update the shared mission.');
  const updated = normalizeMission(result.snapshot.val() as MissionState | null);
  if (!updated) throw new Error('The updated mission could not be read.');
  return updated;
}

function isMissionIntent(value: unknown): value is MissionIntent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MissionIntent>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.playerId === 'string' &&
    typeof candidate.attempt === 'number' &&
    typeof candidate.createdAt === 'number' &&
    Boolean(candidate.action && typeof candidate.action === 'object')
  );
}

function intentPath(roomCode: string, missionId: MissionId): string {
  return `rooms/${roomCode}/missionIntents/${missionId}`;
}

export function subscribeMissionIntents(
  roomCode: string,
  missionId: MissionId,
  mock: boolean,
  callback: (intents: MissionIntent[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const path = intentPath(roomCode, missionId);
  if (mock) {
    let listeners = mockIntentListeners.get(path);
    if (!listeners) {
      listeners = new Set();
      mockIntentListeners.set(path, listeners);
    }
    listeners.add(callback);
    callback([...((mockIntents.get(path) ?? new Map()).values())]);
    return () => {
      listeners?.delete(callback);
      if (listeners?.size === 0) mockIntentListeners.delete(path);
    };
  }
  return onValue(
    ref(requireDb(), path),
    (snapshot: DataSnapshot) => {
      const raw: unknown = snapshot.val();
      const intents =
        raw && typeof raw === 'object'
          ? Object.values(raw).filter(isMissionIntent)
          : [];
      callback(intents);
    },
    (error: Error) => onError?.(getErrorMessage(error)),
  );
}

export async function enqueueMissionIntent(
  roomCode: string,
  missionId: MissionId,
  mock: boolean,
  intent: Omit<MissionIntent, 'id'>,
): Promise<string> {
  const path = intentPath(roomCode, missionId);
  if (mock) {
    const id = `mock-intent-${++mockIntentSequence}`;
    const queue = mockIntents.get(path) ?? new Map<string, MissionIntent>();
    queue.set(id, { ...intent, id });
    mockIntents.set(path, queue);
    for (const listener of mockIntentListeners.get(path) ?? []) {
      listener([...queue.values()]);
    }
    return id;
  }

  const intentRef = push(ref(requireDb(), path));
  if (!intentRef.key) throw new Error('Could not create a mission intent.');
  await set(intentRef, { ...intent, id: intentRef.key });
  return intentRef.key;
}

export async function removeMissionIntent(
  roomCode: string,
  missionId: MissionId,
  mock: boolean,
  intentId: string,
): Promise<void> {
  const path = intentPath(roomCode, missionId);
  if (mock) {
    const queue = mockIntents.get(path);
    queue?.delete(intentId);
    if (queue?.size === 0) mockIntents.delete(path);
    for (const listener of mockIntentListeners.get(path) ?? []) {
      listener([...(queue?.values() ?? [])]);
    }
    return;
  }
  await remove(ref(requireDb(), `${path}/${intentId}`));
}

function positionPath(roomCode: string): string {
  return `rooms/${roomCode}/players`;
}

export function subscribeMissionPositions(
  roomCode: string,
  mock: boolean,
  callback: (positions: Record<string, MissionPosition>) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const path = positionPath(roomCode);
  if (mock) {
    let listeners = mockPositionListeners.get(path);
    if (!listeners) {
      listeners = new Set();
      mockPositionListeners.set(path, listeners);
    }
    listeners.add(callback);
    callback({ ...(mockPositions.get(path) ?? {}) });
    return () => {
      listeners?.delete(callback);
      if (listeners?.size === 0) mockPositionListeners.delete(path);
    };
  }
  return onValue(
    ref(requireDb(), path),
    (snapshot: DataSnapshot) => {
      const raw: unknown = snapshot.val();
      const positions: Record<string, MissionPosition> = {};
      if (raw && typeof raw === 'object') {
        for (const [playerId, entry] of Object.entries(raw)) {
          if (!entry || typeof entry !== 'object') continue;
          const position = (entry as { position?: unknown }).position;
          if (!position || typeof position !== 'object') continue;
          const candidate = position as Partial<MissionPosition>;
          if (
            typeof candidate.x === 'number' &&
            Number.isFinite(candidate.x) &&
            typeof candidate.y === 'number' &&
            Number.isFinite(candidate.y)
          ) {
            positions[playerId] = { x: candidate.x, y: candidate.y };
          }
        }
      }
      callback(positions);
    },
    (error: Error) => onError?.(getErrorMessage(error)),
  );
}

export async function writeMissionPosition(
  roomCode: string,
  playerId: string,
  mock: boolean,
  position: MissionPosition,
): Promise<void> {
  const normalized = {
    x: Math.min(100, Math.max(0, position.x)),
    y: Math.min(100, Math.max(0, position.y)),
  };
  const path = positionPath(roomCode);
  if (mock) {
    const positions = { ...(mockPositions.get(path) ?? {}), [playerId]: normalized };
    mockPositions.set(path, positions);
    for (const listener of mockPositionListeners.get(path) ?? []) {
      listener({ ...positions });
    }
    return;
  }
  await set(ref(requireDb(), `${path}/${playerId}/position`), normalized);
}
