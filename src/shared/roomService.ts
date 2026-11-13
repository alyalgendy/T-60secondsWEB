import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  update,
  type DataSnapshot,
} from 'firebase/database';
import {
  MAX_PLAYERS,
  PLAYER_COLORS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_CODE_PATTERN,
  emptyResources,
  getErrorMessage,
  playerColorForJoinOrder,
} from './constants';
import { requireDb } from './firebase';
import { getNextStep } from './flow';
import type {
  DecisionState,
  FlowStep,
  MissionId,
  MissionPlan,
  PlanDraft,
  Player,
  RoomMeta,
} from './types';

/* ------------------------------------------------------------------ */
/* Codes, names, ids                                                   */
/* ------------------------------------------------------------------ */

export function generateRoomCode(): string {
  const bytes = new Uint32Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const byte = bytes[index] ?? 0;
    code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(code));
}

export function sanitizeName(input: string): string {
  const name = input.trim().replace(/\s+/g, ' ').slice(0, 16);
  return name || 'Player';
}

export function createPlayerId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  return `p-${Date.now().toString(36)}-${(bytes[0] ?? 0).toString(36)}`;
}

/* ------------------------------------------------------------------ */
/* Normalisers                                                         */
/* ------------------------------------------------------------------ */

export function normalizePlayers(
  value: Record<string, Player> | null,
): Player[] {
  if (!value) return [];
  return Object.values(value)
    .map((player, index) => ({
      id: player.id,
      name: player.name || 'Player',
      color: player.color || playerColorForJoinOrder(player.joinOrder ?? index),
      joinOrder:
        typeof player.joinOrder === 'number' ? player.joinOrder : index,
      isHost: Boolean(player.isHost),
      connected: Boolean(player.connected),
    }))
    .sort((a, b) => a.joinOrder - b.joinOrder || a.name.localeCompare(b.name));
}

function normalizeMeta(value: RoomMeta | null): RoomMeta | null {
  if (!value) return null;
  return {
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : 0,
    hostId: value.hostId ?? '',
    status:
      value.status === 'playing' || value.status === 'finished'
        ? value.status
        : 'lobby',
  };
}

function normalizeDraft(value: PlanDraft | null): PlanDraft | null {
  if (!value) return null;
  return {
    craftId: value.craftId ?? null,
    resources: { ...emptyResources(), ...(value.resources ?? {}) },
    readyPlayerIds: Array.isArray(value.readyPlayerIds)
      ? value.readyPlayerIds
      : [],
    lastEditedBy: value.lastEditedBy ?? null,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Presence                                                            */
/* ------------------------------------------------------------------ */

async function registerPresence(
  code: string,
  playerId: string,
): Promise<void> {
  const database = requireDb();
  const connectedRef = ref(
    database,
    `rooms/${code}/players/${playerId}/connected`,
  );
  await update(ref(database, `rooms/${code}/players/${playerId}`), {
    connected: true,
  });
  await onDisconnect(connectedRef).set(false);
}

export async function leaveRoom(
  code: string,
  playerId: string,
): Promise<void> {
  const database = requireDb();
  const playerRef = ref(database, `rooms/${code}/players/${playerId}`);
  try {
    await onDisconnect(
      ref(database, `rooms/${code}/players/${playerId}/connected`),
    ).cancel();
  } catch {
    // Best effort: the seat can still be removed below.
  }
  await remove(playerRef);
}

/* ------------------------------------------------------------------ */
/* Create / join / rejoin                                              */
/* ------------------------------------------------------------------ */

export async function createRoom(
  name: string,
): Promise<{ roomCode: string; playerId: string }> {
  const database = requireDb();
  const cleanName = sanitizeName(name);
  const playerId = createPlayerId();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateRoomCode();
    const metaRef = ref(database, `rooms/${code}/meta`);
    const meta: RoomMeta = {
      createdAt: Date.now(),
      hostId: playerId,
      status: 'lobby',
    };

    const result = await runTransaction(metaRef, (currentData) => {
      const current = currentData as RoomMeta | null;
      if (current) return undefined;
      return meta;
    });

    if (!result.committed) continue;

    const player: Player = {
      id: playerId,
      name: cleanName,
      color: playerColorForJoinOrder(0),
      joinOrder: 0,
      isHost: true,
      connected: true,
    };

    await update(ref(database), {
      [`rooms/${code}/players/${playerId}`]: player,
      [`rooms/${code}/flow`]: { step: 'lobby', updatedAt: Date.now() },
    });
    await registerPresence(code, playerId);

    return { roomCode: code, playerId };
  }

  throw new Error('Could not create a room. Please try again.');
}

export async function rejoinRoom(
  code: string,
  playerId: string,
  name?: string,
): Promise<boolean> {
  const database = requireDb();
  const playerRef = ref(database, `rooms/${code}/players/${playerId}`);
  const snapshot = await get(playerRef);
  if (!snapshot.exists()) return false;

  const current = snapshot.val() as Player;
  const updates: Partial<Player> = { connected: true };
  if (name) updates.name = sanitizeName(name);
  if (!current.color) {
    updates.color = playerColorForJoinOrder(current.joinOrder ?? 0);
  }
  await update(playerRef, updates);
  await registerPresence(code, playerId);
  return true;
}

export async function joinRoom(
  codeInput: string,
  name: string,
  existingPlayerId?: string,
): Promise<{ roomCode: string; playerId: string }> {
  const database = requireDb();
  const code = normalizeRoomCode(codeInput);

  if (!isValidRoomCode(code)) {
    throw new Error(
      'That room code is not valid. Codes are 4 characters, like ABCD.',
    );
  }

  const metaSnap = await get(ref(database, `rooms/${code}/meta`));
  if (!metaSnap.exists()) {
    throw new Error('Room not found. Check the code and try again.');
  }
  const meta = normalizeMeta(metaSnap.val() as RoomMeta);

  if (existingPlayerId) {
    const reconnected = await rejoinRoom(code, existingPlayerId, name);
    if (reconnected) return { roomCode: code, playerId: existingPlayerId };
  }

  if (meta?.status !== 'lobby') {
    throw new Error('This game has already started. Ask the host for a new room.');
  }

  const playersRef = ref(database, `rooms/${code}/players`);
  const playersSnap = await get(playersRef);
  const existingPlayers = normalizePlayers(
    playersSnap.val() as Record<string, Player> | null,
  );
  if (existingPlayers.length >= MAX_PLAYERS) {
    throw new Error('This room is full (4 players maximum).');
  }

  const playerId = createPlayerId();
  let joinedPlayer: Player | null = null;

  const result = await runTransaction(
    playersRef,
    (currentData) => {
      const current = currentData as Record<string, Player> | null;
      const existing = current ?? {};
      const list = Object.values(existing);
      if (list.length >= MAX_PLAYERS) return undefined;

      const usedOrders = new Set(list.map((player) => player.joinOrder));
      let joinOrder = 0;
      while (usedOrders.has(joinOrder) && joinOrder < MAX_PLAYERS) {
        joinOrder += 1;
      }
      if (joinOrder >= MAX_PLAYERS) return undefined;

      const player: Player = {
        id: playerId,
        name: sanitizeName(name),
        color: PLAYER_COLORS[joinOrder] ?? PLAYER_COLORS[0],
        joinOrder,
        isHost: false,
        connected: true,
      };
      joinedPlayer = player;
      return { ...existing, [playerId]: player };
    },
  );

  if (!result.committed || !joinedPlayer) {
    throw new Error('This room is full (4 players maximum).');
  }

  await registerPresence(code, playerId);
  return { roomCode: code, playerId };
}

/* ------------------------------------------------------------------ */
/* Host migration                                                      */
/* ------------------------------------------------------------------ */

export async function claimHost(
  code: string,
  playerId: string,
  previousHostId: string | null,
): Promise<void> {
  const database = requireDb();
  const metaRef = ref(database, `rooms/${code}/meta`);

  const result = await runTransaction(metaRef, (currentData) => {
    const current = currentData as RoomMeta | null;
    if (!current) return undefined;
    if (previousHostId) {
      // Another client already re-assigned the host: do not fight it.
      if (current.hostId !== previousHostId) return undefined;
    } else if (current.hostId && current.hostId !== playerId) {
      return undefined;
    }
    return { ...current, hostId: playerId };
  });

  if (!result.committed) return;

  const playersSnap = await get(ref(database, `rooms/${code}/players`));
  const players = playersSnap.val() as Record<string, Player> | null;
  if (!players) return;

  const updates: Record<string, boolean> = {};
  for (const player of Object.values(players)) {
    updates[`rooms/${code}/players/${player.id}/isHost`] =
      player.id === playerId;
  }
  await update(ref(database), updates);
}

/* ------------------------------------------------------------------ */
/* Flow                                                                */
/* ------------------------------------------------------------------ */

export async function startRoom(
  code: string,
  playerId: string,
): Promise<void> {
  const database = requireDb();
  const metaSnap = await get(ref(database, `rooms/${code}/meta`));
  const meta = normalizeMeta(metaSnap.val() as RoomMeta);
  if (!meta) throw new Error('Room not found.');
  if (meta.hostId !== playerId) {
    throw new Error('Only the host can start the mission.');
  }

  await update(ref(database), {
    [`rooms/${code}/meta/status`]: 'playing',
    [`rooms/${code}/flow`]: { step: 'cutscene-intro', updatedAt: Date.now() },
  });
}

export async function setFlowStep(
  code: string,
  step: FlowStep,
): Promise<void> {
  const database = requireDb();
  await update(ref(database, `rooms/${code}/flow`), {
    step,
    updatedAt: Date.now(),
  });
}

export async function finishGame(code: string): Promise<void> {
  const database = requireDb();
  await update(ref(database), {
    [`rooms/${code}/meta/status`]: 'finished',
    [`rooms/${code}/flow`]: { step: 'results', updatedAt: Date.now() },
  });
}

export function nextStepForMission(missionId: MissionId): FlowStep {
  if (missionId === 'iss') return getNextStep('decision-iss');
  if (missionId === 'moon') return getNextStep('decision-moon');
  return 'results';
}

/* ------------------------------------------------------------------ */
/* Subscriptions                                                       */
/* ------------------------------------------------------------------ */

function toErrorHandler(onError?: (message: string) => void) {
  return (error: Error) => {
    onError?.(getErrorMessage(error));
  };
}

export function subscribeMeta(
  code: string,
  callback: (meta: RoomMeta | null) => void,
  onError?: (message: string) => void,
): () => void {
  return onValue(
    ref(requireDb(), `rooms/${code}/meta`),
    (snapshot: DataSnapshot) => callback(normalizeMeta(snapshot.val() as RoomMeta)),
    toErrorHandler(onError),
  );
}

export function subscribePlayers(
  code: string,
  callback: (players: Player[]) => void,
  onError?: (message: string) => void,
): () => void {
  return onValue(
    ref(requireDb(), `rooms/${code}/players`),
    (snapshot: DataSnapshot) =>
      callback(normalizePlayers(snapshot.val() as Record<string, Player> | null)),
    toErrorHandler(onError),
  );
}

export function subscribeFlow(
  code: string,
  callback: (step: FlowStep | null) => void,
  onError?: (message: string) => void,
): () => void {
  return onValue(
    ref(requireDb(), `rooms/${code}/flow/step`),
    (snapshot: DataSnapshot) => callback((snapshot.val() as FlowStep | null) ?? null),
    toErrorHandler(onError),
  );
}

export function subscribeDraft(
  code: string,
  missionId: MissionId,
  callback: (draft: PlanDraft | null) => void,
  onError?: (message: string) => void,
): () => void {
  return onValue(
    ref(requireDb(), `rooms/${code}/drafts/${missionId}`),
    (snapshot: DataSnapshot) =>
      callback(normalizeDraft(snapshot.val() as PlanDraft | null)),
    toErrorHandler(onError),
  );
}

export function subscribePlan(
  code: string,
  missionId: MissionId,
  callback: (plan: MissionPlan | null) => void,
  onError?: (message: string) => void,
): () => void {
  return onValue(
    ref(requireDb(), `rooms/${code}/plans/${missionId}`),
    (snapshot: DataSnapshot) => callback(snapshot.val() as MissionPlan | null),
    toErrorHandler(onError),
  );
}

export function subscribeDecision(
  code: string,
  missionId: MissionId,
  callback: (state: DecisionState | null) => void,
  onError?: (message: string) => void,
): () => void {
  return onValue(
    ref(requireDb(), `rooms/${code}/decision/${missionId}`),
    (snapshot: DataSnapshot) =>
      callback(snapshot.val() as DecisionState | null),
    toErrorHandler(onError),
  );
}

export function subscribePlans(
  code: string,
  callback: (plans: Partial<Record<MissionId, MissionPlan>>) => void,
  onError?: (message: string) => void,
): () => void {
  return onValue(
    ref(requireDb(), `rooms/${code}/plans`),
    (snapshot: DataSnapshot) =>
      callback(
        (snapshot.val() as Partial<Record<MissionId, MissionPlan>> | null) ?? {},
      ),
    toErrorHandler(onError),
  );
}

export function subscribeDecisions(
  code: string,
  callback: (states: Partial<Record<MissionId, DecisionState>>) => void,
  onError?: (message: string) => void,
): () => void {
  return onValue(
    ref(requireDb(), `rooms/${code}/decision`),
    (snapshot: DataSnapshot) =>
      callback(
        (snapshot.val() as Partial<Record<MissionId, DecisionState>> | null) ??
          {},
      ),
    toErrorHandler(onError),
  );
}
