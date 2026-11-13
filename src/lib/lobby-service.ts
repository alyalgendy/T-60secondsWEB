import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update,
  type Database,
  type DataSnapshot,
} from "firebase/database";
import { isValidRoomCode } from "./room-code";
import {
  LobbyError,
  MAX_LOG_ENTRIES,
  MAX_PLAYERS,
  PLAYER_COLORS,
  isRoomPhase,
  type LogRecord,
  type PlayerRecord,
  type RoomRecord,
  type RoomView,
} from "./types";

export interface EnterRoomInput {
  db: Database;
  code: string;
  playerId: string;
  name: string;
  create: boolean;
}

const seatPath = (code: string, playerId: string) => `rooms/${code}/players/${playerId}`;

function nextColor(players: Record<string, PlayerRecord>): string {
  const used = new Set(Object.values(players).map((player) => player.color));
  return PLAYER_COLORS.find((color) => !used.has(color)) ?? PLAYER_COLORS[0];
}

async function claimSeat(input: EnterRoomInput): Promise<PlayerRecord> {
  const { db, code, playerId, name } = input;
  const result = await runTransaction(
    ref(db, `rooms/${code}/players`),
    (current: Record<string, PlayerRecord> | null) => {
      const players = current ?? {};
      const existing = players[playerId];

      if (!existing && Object.keys(players).length >= MAX_PLAYERS) return undefined; // abort

      const seat: PlayerRecord = {
        name,
        color: existing?.color ?? nextColor(players),
        // A player coming back from a drop must re-confirm they're ready.
        ready: existing ? (existing.connected ? existing.ready : false) : false,
        connected: true,
        joinedAt: existing?.joinedAt ?? Date.now(),
      };

      return { ...players, [playerId]: seat };
    },
  );

  const seat = result.snapshot.child(playerId).val() as PlayerRecord | null;
  if (!result.committed || !seat) {
    throw new LobbyError("room-full", "This room already has four crew members.");
  }
  return seat;
}

async function createRoomRecord(db: Database, code: string, hostId: string): Promise<void> {
  await runTransaction(ref(db, `rooms/${code}`), (current: RoomRecord | null) => {
    if (current !== null) return undefined; // room already exists, abort
    const room: RoomRecord = { createdAt: Date.now(), hostId, phase: "LOBBY" };
    return room;
  });
}

/** Create-or-join, then take a seat. Throws LobbyError with a usable code. */
export async function enterRoom(input: EnterRoomInput): Promise<void> {
  const { db, code, playerId, create, name } = input;
  if (!isValidRoomCode(code)) {
    throw new LobbyError("invalid-code", "That room code isn't valid.");
  }

  const roomSnapshot = await get(ref(db, `rooms/${code}`));
  const exists = roomSnapshot.exists();

  if (!exists) {
    if (!create) throw new LobbyError("room-not-found", "No room is using that code.");
    await createRoomRecord(db, code, playerId);
  } else if (create) {
    const alreadySeated = roomSnapshot.child(`players/${playerId}`).exists();
    if (!alreadySeated && roomSnapshot.child("players").size > 0) {
      throw new LobbyError("room-exists", "That code is already in use. Join it instead.");
    }
  }

  await claimSeat(input);
  await appendLog(db, code, `${name} joined the crew`).catch(() => {});
}

export function toRoomView(code: string, raw: unknown): RoomView | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Partial<RoomRecord>;
  if (
    typeof record.createdAt !== "number" ||
    typeof record.hostId !== "string" ||
    !isRoomPhase(record.phase)
  ) {
    return null;
  }

  const players = Object.entries(record.players ?? {})
    .map(([id, player]) => ({ id, ...player }))
    .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));

  const log = Object.entries(record.log ?? {})
    .map(([id, entry]) => ({ id, ...entry }))
    .sort((a, b) => a.at - b.at);

  return {
    code,
    createdAt: record.createdAt,
    hostId: record.hostId,
    phase: record.phase,
    players,
    log,
  };
}

export function watchRoom(
  db: Database,
  code: string,
  onChange: (room: RoomView | null) => void,
  onError?: (error: LobbyError) => void,
): () => void {
  return onValue(
    ref(db, `rooms/${code}`),
    (snapshot: DataSnapshot) => onChange(toRoomView(code, snapshot.val())),
    (error: Error) => onError?.(new LobbyError("unknown", error.message)),
  );
}

/**
 * Presence: mark the seat offline the moment the socket dies, and re-register
 * the disconnect hook after every reconnect.
 */
export function bindPresence(db: Database, code: string, playerId: string): () => void {
  const connectedRef = ref(db, ".info/connected");
  const myConnectedRef = ref(db, `${seatPath(code, playerId)}/connected`);

  const unsubscribe = onValue(connectedRef, (snapshot: DataSnapshot) => {
    if (snapshot.val() === false) return;
    onDisconnect(myConnectedRef)
      .set(false)
      .then(() => set(myConnectedRef, true))
      .catch(() => {});
  });

  return () => {
    unsubscribe();
    onDisconnect(myConnectedRef).cancel().catch(() => {});
  };
}

export async function setReady(
  db: Database,
  code: string,
  playerId: string,
  ready: boolean,
): Promise<void> {
  await update(ref(db, seatPath(code, playerId)), { ready });
}

export async function startPreflight(db: Database, code: string): Promise<void> {
  const result = await runTransaction(ref(db, `rooms/${code}`), (current: RoomRecord | null) => {
    if (!current || current.phase !== "LOBBY") return undefined;
    const crew = Object.values(current.players ?? {}).filter((player) => player.connected);
    if (crew.length === 0) return undefined;
    if (crew.some((player) => !player.ready)) return undefined;
    const next: RoomRecord = { ...current, phase: "BRIEFING" };
    return next;
  });

  if (!result.committed) {
    throw new LobbyError("not-ready", "Every connected crew member must lock in first.");
  }
  await appendLog(db, code, "Preflight locked. Mission download queued.").catch(() => {});
}

export async function returnToLobby(db: Database, code: string): Promise<void> {
  await runTransaction(ref(db, `rooms/${code}`), (current: RoomRecord | null) => {
    if (!current) return undefined;
    const players = current.players ?? {};
    const reset = Object.fromEntries(
      Object.entries(players).map(([id, player]) => [id, { ...player, ready: false }]),
    );
    const next: RoomRecord = { ...current, phase: "LOBBY", players: reset };
    return next;
  });
  await appendLog(db, code, "Commander returned the crew to assembly.").catch(() => {});
}

export async function leaveRoom(db: Database, code: string, playerId: string): Promise<void> {
  await onDisconnect(ref(db, `${seatPath(code, playerId)}/connected`)).cancel().catch(() => {});
  await remove(ref(db, seatPath(code, playerId)));
}

export async function kickPlayer(db: Database, code: string, playerId: string): Promise<void> {
  await leaveRoom(db, code, playerId);
}

/**
 * Host migration. Safe to call from every client on every update: the
 * transaction only commits if the host is still the disconnected player,
 * and every client computes the same successor (earliest joinedAt).
 */
export async function ensureHost(
  db: Database,
  code: string,
  players: Record<string, PlayerRecord>,
): Promise<void> {
  const crew = Object.entries(players)
    .filter(([, player]) => player.connected)
    .sort((a, b) => a[1].joinedAt - b[1].joinedAt || a[0].localeCompare(b[0]));
  if (crew.length === 0) return;

  await runTransaction(ref(db, `rooms/${code}/hostId`), (current: string | null) => {
    if (current && players[current]?.connected) return undefined; // host still online
    return crew[0][0];
  }).catch(() => {});
}

export async function appendLog(db: Database, code: string, text: string): Promise<void> {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 120);
  if (!clean) return;

  await runTransaction(ref(db, `rooms/${code}/log`), (current: Record<string, LogRecord> | null) => {
    const existing = Object.entries(current ?? {}).sort((a, b) => a[1].at - b[1].at);
    const kept = existing.slice(-(MAX_LOG_ENTRIES - 1));
    const key = `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    return { ...Object.fromEntries(kept), [key]: { at: Date.now(), text: clean } };
  });
}
